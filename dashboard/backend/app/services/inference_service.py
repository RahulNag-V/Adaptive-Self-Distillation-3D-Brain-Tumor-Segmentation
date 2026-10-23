"""
Inference service for NeuroSeg 3D Adaptive Self-Distillation.
Loads checkpoints/adaptive/best.pth at startup and executes 96x96x96 sliding-window inference.
"""
from pathlib import Path
import json
import logging
import sys
import time
from typing import Dict, Any, Optional, Tuple

# Ensure project root is in sys.path so existing src/ packages are imported
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import numpy as np
import torch
from monai.inferers import sliding_window_inference

from src.evaluation.evaluator import load_model_from_checkpoint
from app.services.upload_service import UploadService
from app.services.preprocessing_service import PreprocessingService
from app.services.postprocessing_service import PostprocessingService
from app.services.metrics_service import MetricsService
from app.utils.nifti_utils import get_session_dir, inspect_nifti_file

logger = logging.getLogger("neuroseg3d.inference")
DEFAULT_CHECKPOINT = PROJECT_ROOT / "checkpoints" / "adaptive" / "best.pth"


class InferenceService:
    _model: Optional[torch.nn.Module] = None
    _device: str = "cpu"
    _checkpoint_path: Path = DEFAULT_CHECKPOINT
    _is_loaded: bool = False
    _metadata: Dict[str, Any] = {}

    @classmethod
    def initialize(cls, checkpoint_path: Optional[Path] = None, force_device: Optional[str] = None) -> bool:
        """
        Loads the trained Adaptive Self-Distillation model once at backend startup.
        """
        if checkpoint_path is not None:
            cls._checkpoint_path = Path(checkpoint_path)

        if force_device:
            cls._device = force_device
        else:
            cls._device = "cuda" if torch.cuda.is_available() else "cpu"

        print("\n" + "=" * 60)
        print("Model:       Adaptive Self-Distillation")
        print(f"Checkpoint:  {cls._checkpoint_path}")
        print(f"Device:      {cls._device}")

        if not cls._checkpoint_path.exists():
            print("Model loaded: NO (Checkpoint file missing)")
            print("=" * 60 + "\n")
            cls._is_loaded = False
            return False

        try:
            model, meta = load_model_from_checkpoint(cls._checkpoint_path, device=cls._device)
            model.eval()
            cls._model = model
            cls._metadata = meta
            cls._is_loaded = True
            print("Model loaded: YES")
            print("=" * 60 + "\n")
            return True
        except Exception as e:
            print(f"Model loaded: NO (Error: {str(e)})")
            print("=" * 60 + "\n")
            cls._is_loaded = False
            return False

    @classmethod
    def is_ready(cls) -> bool:
        return cls._is_loaded and cls._model is not None

    @classmethod
    def get_status(cls) -> Dict[str, Any]:
        return {
            "status": "ok" if cls._is_loaded else "model_unavailable",
            "model": "Adaptive Self-Distillation",
            "checkpoint_loaded": cls._is_loaded,
            "device": cls._device,
        }

    @classmethod
    def run_segmentation(cls, session_id: str) -> Dict[str, Any]:
        """
        Executes real end-to-end inference on the session's 4 modalities:
        1. Verifies session files
        2. Preprocesses using MONAI val transforms
        3. Runs sliding-window inference (96x96x96, overlap 0.25, sw_batch_size 1)
        4. Calculates tumor volumetrics (WT, TC, ET)
        5. Computes Dice/HD95 if ground truth is present
        6. Restores full-volume prediction to original NIfTI space
        7. Saves prediction.nii.gz and result.json
        """
        if not cls.is_ready():
            raise RuntimeError("Model is not loaded. Cannot execute inference.")

        session_files = UploadService.get_session_files(session_id)
        required = ["FLAIR", "T1", "T1ce", "T2"]
        missing = [m for m in required if m not in session_files]
        if missing:
            raise ValueError(f"Cannot run segmentation: missing modalities: {', '.join(missing)}")

        session_dir = get_session_dir(session_id)
        seg_file = session_files.get("seg")

        # 1. Preprocess using existing project transforms
        processed_data, transform_pipeline = PreprocessingService.preprocess_case(
            modality_paths=session_files,
            seg_path=seg_file
        )

        image_tensor = processed_data["image"].unsqueeze(0).to(cls._device)
        processed_shape = list(image_tensor.shape[2:])  # spatial dimensions

        # 2. Run sliding-window inference
        start_time = time.time()
        with torch.no_grad():
            with torch.amp.autocast(
                device_type=cls._device,
                dtype=torch.float16,
                enabled=(cls._device == "cuda")
            ):
                outputs = sliding_window_inference(
                    inputs=image_tensor,
                    roi_size=(96, 96, 96),
                    sw_batch_size=1,
                    predictor=cls._model,
                    overlap=0.25,
                )
            # Label map: argmax over class channels [B, 1, H, W, D]
            pred_labels = torch.argmax(outputs, dim=1, keepdim=True)
            probs = torch.softmax(outputs, dim=1)
            max_probs, _ = torch.max(probs, dim=1)
            mean_conf = round(float(max_probs.mean().cpu()), 3)
            entropy = -torch.sum(probs * torch.log(probs + 1e-7), dim=1)
            fg_mask = pred_labels.squeeze(1) > 0
            if fg_mask.any():
                mean_fg_entropy = round(float(entropy[fg_mask].mean().cpu()), 4)
            else:
                mean_fg_entropy = round(float(entropy.mean().cpu()), 4)
            uncertainty_info = {
                "mean_prediction_confidence": mean_conf,
                "mean_foreground_entropy": mean_fg_entropy,
                "confidence_metric": "Softmax Maximum Probability (0.0 to 1.0)",
                "entropy_metric": "Shannon Entropy in nats (lower = higher certainty)"
            }
        inference_time = round(time.time() - start_time, 3)

        # 3. Ground Truth Evaluation if seg was provided
        gt_metrics = None
        if "label" in processed_data and seg_file is not None:
            gt_tensor = processed_data["label"].unsqueeze(0).to(cls._device)
            gt_metrics = MetricsService.evaluate_ground_truth(
                prediction_tensor=pred_labels,
                target_tensor=gt_tensor
            )

        # 4. Attach prediction tensor for inversion
        # Note: Invertd expects channel-first tensor matching pipeline structure
        processed_data["pred"] = pred_labels.squeeze(0).cpu()  # [1, H, W, D]

        # 5. Restore full-volume NIfTI prediction in original space
        prediction_file = session_dir / "prediction.nii.gz"
        ref_nii_path = session_files["FLAIR"]
        ref_nii_info = inspect_nifti_file(ref_nii_path)

        final_pred_arr, unique_labels, original_shape = PostprocessingService.restore_and_save_nifti(
            processed_data=processed_data,
            transform_pipeline=transform_pipeline,
            output_path=prediction_file,
            reference_nii_path=ref_nii_path
        )

        # Verify output only contains allowed labels: {0, 1, 2, 3}
        for lbl in unique_labels:
            if lbl not in [0, 1, 2, 3]:
                raise ValueError(f"Invalid label {lbl} detected in prediction. Allowed: [0, 1, 2, 3]")

        # 6. Compute Tumor Volumetrics
        voxel_spacing = ref_nii_info["zooms"]
        volumetrics = MetricsService.compute_volumetrics(
            prediction_tensor=torch.from_numpy(final_pred_arr),
            voxel_spacing=(voxel_spacing[0], voxel_spacing[1], voxel_spacing[2])
        )

        # Combine region metrics with Dice/HD95 if ground truth was present
        regions_summary = volumetrics["regions"]
        if gt_metrics is not None:
            for region in ["WT", "TC", "ET"]:
                regions_summary[region]["dice"] = gt_metrics.get(f"{region}_dice")
                regions_summary[region]["hd95"] = gt_metrics.get(f"{region}_hd95")

        # 7. Construct final result JSON
        result = {
            "status": "success",
            "session_id": session_id,
            "prediction_file": f"/api/sessions/{session_id}/file/prediction.nii.gz",
            "mri_file": f"/api/sessions/{session_id}/file/flair.nii.gz",
            "original_shape": original_shape,
            "processed_shape": processed_shape,
            "voxel_spacing": [round(s, 3) for s in voxel_spacing],
            "unique_labels": unique_labels,
            "tumor_voxels": volumetrics["tumor_voxels"],
            "tumor_volume_mm3": volumetrics["tumor_volume_mm3"],
            "tumor_volume_cm3": volumetrics["tumor_volume_cm3"],
            "inference_time_seconds": inference_time,
            "device": cls._device,
            "model": "Adaptive Self-Distillation (UNETR)",
            "model_version": "1.0.0",
            "uncertainty_indicators": uncertainty_info,
            "regions": regions_summary,
            "ground_truth_available": gt_metrics is not None,
            "metrics": gt_metrics,
            "note": "Metrics computed with uploaded ground truth" if gt_metrics else "Ground truth not provided; Dice/HD95 shown as N/A"
        }

        # Save result.json in session folder
        result_file = session_dir / "result.json"
        with open(result_file, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)

        return result
