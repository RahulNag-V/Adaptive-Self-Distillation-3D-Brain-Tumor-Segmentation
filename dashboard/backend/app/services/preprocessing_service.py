"""
Preprocessing service reusing existing project MONAI transforms.
Guarantees canonical channel order [FLAIR, T1, T1ce, T2] and captures all spatial
metadata required for full-volume restoration.
"""
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
import sys

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import torch
from monai.transforms import (
    Compose,
    LoadImaged,
    EnsureChannelFirstd,
    Orientationd,
    Spacingd,
    NormalizeIntensityd,
    CropForegroundd,
    Invertd
)
from src.data.val_transforms import get_val_transforms


def get_inference_only_transforms() -> Compose:
    """
    Identical pipeline to get_val_transforms() when ground truth label is absent.
    """
    return Compose([
        LoadImaged(keys=["image"]),
        EnsureChannelFirstd(keys=["image"]),
        Orientationd(keys=["image"], axcodes="RAS"),
        Spacingd(keys=["image"], pixdim=(1.0, 1.0, 1.0), mode=("bilinear")),
        NormalizeIntensityd(keys="image", nonzero=True, channel_wise=True),
        CropForegroundd(keys=["image"], source_key="image"),
    ])


class PreprocessingService:
    @staticmethod
    def preprocess_case(
        modality_paths: Dict[str, Path],
        seg_path: Optional[Path] = None
    ) -> Tuple[Dict[str, Any], Compose]:
        """
        Executes verified MONAI preprocessing on the 4 modalities.
        Enforces canonical order: [FLAIR, T1, T1ce, T2].
        """
        required = ["FLAIR", "T1", "T1ce", "T2"]
        for req in required:
            if req not in modality_paths or not modality_paths[req].exists():
                raise FileNotFoundError(f"Missing required modality: {req}")

        image_files = [
            str(modality_paths["FLAIR"]),
            str(modality_paths["T1"]),
            str(modality_paths["T1ce"]),
            str(modality_paths["T2"]),
        ]

        if seg_path and seg_path.exists():
            data_dict = {
                "image": image_files,
                "label": str(seg_path)
            }
            transform_pipeline = get_val_transforms()
        else:
            data_dict = {
                "image": image_files
            }
            transform_pipeline = get_inference_only_transforms()

        # Apply transforms
        processed = transform_pipeline(data_dict)

        # Handle label mapping if label was present: BraTS 4 -> 3
        if "label" in processed:
            lbl = processed["label"].clone()
            lbl[lbl == 4] = 3
            processed["label"] = lbl.long()

        return processed, transform_pipeline
