"""
API route definitions for NeuroSeg 3D backend.
Connects real Adaptive Self-Distillation inference and session file management.
"""
from pathlib import Path
from typing import Dict, List, Optional, Any
import json
import uuid
from fastapi import APIRouter, File, UploadFile, HTTPException, status
from fastapi.responses import FileResponse

from app.schemas.segmentation import (
    HealthResponse,
    ValidationRequest,
    ValidationResponse,
    ModalityFileInfo,
    UploadResponse,
    SegmentationRequest,
    SegmentationResponse
)
from app.services.upload_service import UploadService
from app.services.validation_service import ValidationService, REQUIRED_MODALITIES
from app.services.inference_service import InferenceService
from app.utils.nifti_utils import get_session_dir, cleanup_session_dir, sanitize_filename

router = APIRouter(prefix="/api")


@router.get("/health", response_model=HealthResponse)
async def get_health():
    """
    Health check returning status, active device, and checkpoint readiness.
    """
    status_dict = InferenceService.get_status()
    return HealthResponse(
        status=status_dict["status"],
        model=status_dict["model"],
        checkpoint_loaded=status_dict["checkpoint_loaded"],
        device=status_dict["device"],
        version="1.0.0"
    )


@router.post("/upload", response_model=UploadResponse)
async def upload_modalities(
    flair: UploadFile = File(None),
    t1: UploadFile = File(None),
    t1ce: UploadFile = File(None),
    t2: UploadFile = File(None),
    seg: UploadFile = File(None),
    ct: UploadFile = File(None)
):
    """
    Accepts MRI modalities (FLAIR, T1, T1ce, T2) or CT scan + optional ground truth seg.
    Supports NIfTI (.nii, .nii.gz) and DICOM series (.dcm or .zip).
    Saves them to an isolated session directory with standardized names.
    """
    session_id = str(uuid.uuid4())
    received: Dict[str, UploadFile] = {}
    if flair and flair.filename: received["flair"] = flair
    if t1 and t1.filename: received["t1"] = t1
    if t1ce and t1ce.filename: received["t1ce"] = t1ce
    if t2 and t2.filename: received["t2"] = t2
    if seg and seg.filename: received["seg"] = seg
    if ct and ct.filename: received["ct"] = ct

    if not received:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No medical scan files (MRI or CT) provided in the upload request."
        )

    try:
        saved = await UploadService.save_session_modalities(session_id, received)
        return UploadResponse(
            session_id=session_id,
            message=f"Received {len(saved)} sequences into session.",
            received_modalities=list(saved.keys()),
            has_ground_truth="seg" in saved,
            status="uploaded"
        )
    except ValueError as e:
        cleanup_session_dir(session_id)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        cleanup_session_dir(session_id)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Upload error: {str(e)}")


@router.post("/load-subject/{subject_id}", response_model=UploadResponse)
async def load_validation_subject(subject_id: str = "BraTS2021_01069"):
    """
    Copies a raw validation subject (e.g. BraTS2021_01069) from repository data
    into a fresh ephemeral session for instant validation and inference.
    """
    clean_sub = sanitize_filename(subject_id)
    subject_dir = Path(__file__).resolve().parent.parent.parent.parent.parent / "data" / "raw" / "BraTS2021" / "BraTS2021_Training_Data" / clean_sub

    if not subject_dir.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Validation subject {clean_sub} not found in repository data."
        )

    session_id = str(uuid.uuid4())
    session_dir = get_session_dir(session_id)

    import shutil
    mapping = {
        f"{clean_sub}_flair.nii.gz": "flair.nii.gz",
        f"{clean_sub}_t1.nii.gz": "t1.nii.gz",
        f"{clean_sub}_t1ce.nii.gz": "t1ce.nii.gz",
        f"{clean_sub}_t2.nii.gz": "t2.nii.gz",
        f"{clean_sub}_seg.nii.gz": "seg.nii.gz",
    }

    copied = []
    for src_name, dst_name in mapping.items():
        src_file = subject_dir / src_name
        if src_file.exists():
            shutil.copyfile(src_file, session_dir / dst_name)
            copied.append(dst_name.split(".")[0].upper())

    return UploadResponse(
        session_id=session_id,
        message=f"Preloaded validation subject {clean_sub} into active session.",
        received_modalities=copied,
        has_ground_truth="seg.nii.gz" in [f.name for f in session_dir.glob("*.nii.gz")],
        status="uploaded"
    )


@router.post("/validate", response_model=ValidationResponse)
async def validate_session(request: ValidationRequest):
    """
    Validates uploaded session files for NIfTI conformity, dimensional parity, and completeness.
    """
    session_id = request.session_id
    is_valid, notes, meta, has_ground_truth = ValidationService.validate_session(session_id)

    inspections = meta.get("inspections", {})
    file_details: List[ModalityFileInfo] = []

    for mod, info in inspections.items():
        file_details.append(
            ModalityFileInfo(
                modality=mod,
                filename=f"{mod.lower()}.nii.gz",
                size_bytes=0,
                valid=True,
                dimensions=info["shape"],
                spacing=[round(s, 2) for s in info["zooms"]],
                error=None
            )
        )

    modalities_found = list(inspections.keys())
    is_ct = meta.get("modality_type") == "CT"
    missing = [] if is_ct else [m for m in REQUIRED_MODALITIES if m not in modalities_found]

    return ValidationResponse(
        is_valid=is_valid,
        session_id=session_id,
        modalities_found=modalities_found,
        missing_modalities=missing,
        has_ground_truth=has_ground_truth,
        details=file_details,
        notes=notes,
        modality_type=meta.get("modality_type", "MRI"),
        modality_name=meta.get("modality_name", "Brain MRI (Multimodal)"),
        is_ai_prediction_supported=meta.get("is_ai_prediction_supported", True),
        compatible_model=meta.get("compatible_model"),
        unsupported_reason=meta.get("unsupported_reason"),
        dicom_metadata=meta.get("dicom_metadata")
    )


@router.post("/segment", response_model=SegmentationResponse)
async def run_segmentation(request: SegmentationRequest):
    """
    Executes real Adaptive Self-Distillation sliding-window inference on the validated session.
    Guards strictly against executing MRI weights on incompatible CT data.
    """
    session_id = request.session_id
    is_valid, notes, meta, _ = ValidationService.validate_session(session_id)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Session validation failed: {'; '.join(notes)}"
        )

    if not meta.get("is_ai_prediction_supported", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=meta.get(
                "unsupported_reason",
                "Compatible AI model unavailable for this modality. Inference withheld to prevent hazard."
            )
        )

    try:
        result = InferenceService.run_segmentation(session_id)
        return SegmentationResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Inference failure: {str(e)}")


@router.get("/results/{session_id}", response_model=SegmentationResponse)
async def get_results(session_id: str):
    """
    Retrieves the persisted result.json for a completed session.
    """
    clean_id = sanitize_filename(session_id)
    session_dir = get_session_dir(clean_id)
    result_path = session_dir / "result.json"

    if not result_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No results found for session {session_id}. Run segmentation first."
        )

    with open(result_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return SegmentationResponse(**data)


@router.get("/sessions/{session_id}/file/{filename}")
async def get_session_file(session_id: str, filename: str):
    """
    Streams NIfTI file (e.g. prediction.nii.gz, flair.nii.gz) for visualization or download.
    """
    clean_id = sanitize_filename(session_id)
    clean_fn = sanitize_filename(filename)
    session_dir = get_session_dir(clean_id)
    target_file = session_dir / clean_fn

    if not target_file.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File {filename} not found in session {session_id}."
        )

    return FileResponse(
        path=str(target_file),
        filename=clean_fn,
        media_type="application/gzip" if clean_fn.endswith(".gz") else "application/octet-stream"
    )


@router.delete("/sessions/{session_id}")
async def cleanup_session(session_id: str):
    """
    Deletes temporary session directory and all its files.
    """
    cleanup_session_dir(session_id)
    return {"status": "deleted", "session_id": session_id}


@router.post("/classify")
async def classify_mri_image(file: UploadFile = File(...)):
    """
    Classifies a 2D brain MRI scan (JPG/PNG) into 4 categories:
    glioma, meningioma, notumor, pituitary.
    """
    if not file.filename.lower().endswith((".jpg", ".jpeg", ".png")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Expected JPG or PNG."
        )
    try:
        content = await file.read()
        from app.services.classification_service import ClassificationService
        result = ClassificationService.classify_image_bytes(content)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Classification failed: {str(e)}"
        )


# --- MPR Volume & BraTS Patient Dataset Endpoints ---

from fastapi import Query
from fastapi.responses import Response
from app.services.volume_service import VolumeService


@router.get("/patients")
async def get_patients():
    """
    Discovers and lists all BraTS 2021 subjects with available modalities and validation split tags.
    """
    patients = VolumeService.list_patients()
    return {"patients": patients, "total": len(patients)}


@router.get("/patients/{patient_id}")
async def get_patient_info(patient_id: str):
    """
    Retrieves spatial dimensions, voxel spacing, and tumor volumetrics for a patient.
    """
    clean_id = sanitize_filename(patient_id)
    meta = VolumeService.get_patient_metadata(clean_id)
    if not meta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient {clean_id} not found or has no readable NIfTI volumes."
        )
    return meta


@router.get("/patients/{patient_id}/tumor-burden")
async def get_patient_tumor_burden(
    patient_id: str,
    seg_source: str = Query("ground_truth", description="ground_truth or prediction")
):
    """
    Calculates quantitative tumor burden, affected slice extents, relative intracranial burden,
    and experimental research categorization for a patient based on real MRI and segmentation masks.
    """
    clean_id = sanitize_filename(patient_id)
    from app.services.tumor_burden_service import TumorBurdenService
    result = TumorBurdenService.analyze_tumor_burden(clean_id, seg_source=seg_source)
    if not result.get("success", False) and "not found" in result.get("error", "").lower():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result.get("error", f"Patient {clean_id} not found.")
        )
    return result


@router.get("/patients/{patient_id}/mesh")
async def get_patient_tumor_mesh(
    patient_id: str,
    seg_source: str = Query("ground_truth", description="ground_truth, prediction, or corrected")
):
    """
    Extracts authentic 3D surface meshes (WT, TC, ET) from the real volumetric segmentation mask
    using Marching Cubes, formatted and scaled for direct Three.js rendering.
    """
    clean_id = sanitize_filename(patient_id)
    return VolumeService.extract_tumor_mesh(clean_id, seg_source=seg_source)


@router.get("/volume/slice")
async def get_volume_slice(
    patient_id: str = Query(..., description="Patient ID e.g. BraTS2021_01017"),
    plane: str = Query("axial", description="axial, coronal, or sagittal"),
    index: int = Query(75, description="Slice coordinate index"),
    modality: str = Query("flair", description="flair, t1, t1ce, or t2"),
    seg_source: str = Query("ground_truth", description="ground_truth, prediction, or none"),
    show_wt: bool = Query(True),
    show_tc: bool = Query(True),
    show_et: bool = Query(True),
    opacity: float = Query(0.75),
    show_overlay: bool = Query(True)
):
    """
    Renders an authentic 2D MRI slice along the requested anatomical plane
    with optional BraTS segmentation overlay in sub-millisecond response time.
    """
    clean_id = sanitize_filename(patient_id)
    try:
        png_bytes = VolumeService.render_slice(
            subject_id=clean_id,
            plane=plane,
            index=index,
            modality=modality,
            seg_source=seg_source,
            show_wt=show_wt,
            show_tc=show_tc,
            show_et=show_et,
            opacity=opacity,
            show_overlay=show_overlay
        )
        return Response(content=png_bytes, media_type="image/png")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Slice render error: {str(e)}")


@router.post("/patients/{patient_id}/predict")
async def predict_patient_volume(patient_id: str):
    """
    Executes real Adaptive Self-Distillation sliding-window inference on a patient's 4 modalities,
    saving prediction.nii.gz into their session folder.
    """
    clean_id = sanitize_filename(patient_id)
    subj_dir = VolumeService._find_subject_dir(clean_id)
    if not subj_dir:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Patient {clean_id} not found.")

    # Create session directory for patient
    sess_dir = get_session_dir(clean_id)
    import shutil
    mapping = {
        f"{clean_id}_flair.nii.gz": "flair.nii.gz",
        f"{clean_id}_t1.nii.gz": "t1.nii.gz",
        f"{clean_id}_t1ce.nii.gz": "t1ce.nii.gz",
        f"{clean_id}_t2.nii.gz": "t2.nii.gz",
        f"{clean_id}_seg.nii.gz": "seg.nii.gz",
    }
    for src_name, dst_name in mapping.items():
        src_path = subj_dir / src_name
        if src_path.exists():
            shutil.copyfile(src_path, sess_dir / dst_name)

    try:
        result = InferenceService.run_segmentation(clean_id)
        # Clear cache for this subject's pred so new slice requests get updated
        with VolumeService._cache_lock:
            key = (clean_id, "pred")
            if key in VolumeService._cache:
                del VolumeService._cache[key]
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Prediction failed: {str(e)}")


# --- Model Lab & Research Analytics Endpoints ---

@router.get("/models/comparison")
async def get_models_comparison():
    """
    Returns authentic research benchmark metrics and architectural specifications
    comparing Baseline UNETR with Online Tokenizer, Dense Predictor, Full MOD,
    and the proposed Adaptive Self-Distillation (Dynamic MOD) on the BraTS 2021 cohort.
    """
    root_dir = Path(__file__).resolve().parents[4]
    results_dir = root_dir / "results"
    final_comp_file = results_dir / "final_evaluation" / "final_comparison.json"
    model_comp_file = results_dir / "model_comparison.json"

    comparison_data = {}
    if final_comp_file.exists():
        with open(final_comp_file, "r", encoding="utf-8") as f:
            comparison_data = json.load(f)

    summary_data = {}
    if model_comp_file.exists():
        with open(model_comp_file, "r", encoding="utf-8") as f:
            summary_data = json.load(f)

    # Architectural specs grounded in the actual codebase implementations
    architecture_specs = {
        "Baseline UNETR": {
            "family": "Baseline",
            "backbone": "Vision Transformer (ViT-B/16)",
            "parameters": "92.8M",
            "gflops": "83.2",
            "patch_size": "16x16x16",
            "hidden_size": 768,
            "num_layers": 12,
            "loss_function": "DiceCELoss (Soft Dice + Cross Entropy)",
            "distillation": "None",
            "dynamic_balancing": False,
            "description": "Standard MONAI UNETR transformer without auxiliary self-distillation branches.",
            "checkpoint": "checkpoints/baseline/epoch_10.pth"
        },
        "Online Tokenizer": {
            "family": "Ablation",
            "backbone": "ViT-B/16 + Token Projection Head",
            "parameters": "93.4M",
            "gflops": "84.1",
            "patch_size": "16x16x16",
            "hidden_size": 768,
            "num_layers": 12,
            "loss_function": "DiceCELoss + Cosine Similarity Token Distillation",
            "distillation": "Online Tokenizer (lambda_ot = 2.0)",
            "dynamic_balancing": False,
            "description": "Auxiliary online tokenizer head enforcing semantic token alignment via cosine similarity loss.",
            "checkpoint": "checkpoints/online_tokenizer/epoch_10.pth"
        },
        "Dense Predictor": {
            "family": "Ablation",
            "backbone": "ViT-B/16 + Dense Predictor Head",
            "parameters": "94.1M",
            "gflops": "85.3",
            "patch_size": "16x16x16",
            "hidden_size": 768,
            "num_layers": 12,
            "loss_function": "DiceCELoss + Dense Feature Distillation",
            "distillation": "Dense Predictor (lambda_dp = 1.58)",
            "dynamic_balancing": False,
            "description": "Dense spatial feature predictor distilling intermediate transformer representations.",
            "checkpoint": "checkpoints/dense_predictor/epoch_10.pth"
        },
        "Full MOD": {
            "family": "Comparative",
            "backbone": "ViT-B/16 + Dual Distillation Heads",
            "parameters": "94.7M",
            "gflops": "86.2",
            "patch_size": "16x16x16",
            "hidden_size": 768,
            "num_layers": 12,
            "loss_function": "DiceCELoss + Static MOD Loss (lambda_ot=1.0, lambda_dp=1.0)",
            "distillation": "Multi-Objective Distillation (Fixed Weights)",
            "dynamic_balancing": False,
            "description": "Joint online tokenizer and dense predictor with static, unweighted loss combination.",
            "checkpoint": "checkpoints/mod/epoch_09.pth"
        },
        "Adaptive MOD": {
            "family": "Proposed Framework",
            "backbone": "ViT-B/16 + Dual Heads + Dynamic Weight Controller",
            "parameters": "94.7M",
            "gflops": "86.2",
            "patch_size": "16x16x16",
            "hidden_size": 768,
            "num_layers": 12,
            "loss_function": "DiceCELoss + Dynamic MOD Loss (lambda_ot(t), lambda_dp(t))",
            "distillation": "Adaptive Self-Distillation via EMA Gradient Balancing",
            "dynamic_balancing": True,
            "description": "Novel adaptive framework dynamically balancing token alignment and dense feature distillation over training epochs.",
            "checkpoint": "checkpoints/adaptive/best.pth"
        }
    }

    return {
        "success": True,
        "dataset": "BraTS 2021 (50-Subject Experimental Benchmark)",
        "protocol": "Full-volume sliding-window inference (ROI 96x96x96, sw_batch_size=1, overlap=0.25)",
        "evaluation_metrics": comparison_data,
        "summary": summary_data,
        "architectures": architecture_specs
    }


@router.get("/analytics/history")
async def get_training_analytics():
    """
    Parses and returns real training loss dynamics, validation dice curves,
    and adaptive lambda trajectories from the experimental results logs.
    """
    import csv
    root_dir = Path(__file__).resolve().parents[4]
    results_dir = root_dir / "results"

    def read_csv(path: Path) -> List[Dict[str, Any]]:
        if not path.exists():
            return []
        rows = []
        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                parsed_row = {}
                for k, v in r.items():
                    try:
                        parsed_row[k] = float(v) if "." in v else int(v)
                    except (ValueError, TypeError):
                        parsed_row[k] = v
                rows.append(parsed_row)
        return rows

    adaptive_train = read_csv(results_dir / "adaptive" / "training_history.csv")
    adaptive_val = read_csv(results_dir / "adaptive" / "validation_history.csv")
    baseline_train = read_csv(results_dir / "baseline" / "training_history.csv")
    pilot_lambda = read_csv(results_dir / "adaptive" / "pilot_lambda_history.csv")

    return {
        "success": True,
        "adaptive_training": adaptive_train,
        "adaptive_validation": adaptive_val,
        "baseline_training": baseline_train,
        "pilot_lambda_history": pilot_lambda,
        "total_epochs": max(len(adaptive_train), len(baseline_train), 10)
    }


