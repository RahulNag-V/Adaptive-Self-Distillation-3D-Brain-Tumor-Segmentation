"""
Validation service for uploaded MRI modalities.
Verifies completeness of the 4 required sequences (FLAIR, T1, T1ce, T2),
dimensional parity, affines, and lack of NaN/Inf anomalies.
"""
from pathlib import Path
from typing import Dict, List, Tuple, Any
from app.utils.nifti_utils import verify_modality_compatibility, inspect_nifti_file
from app.services.upload_service import UploadService

REQUIRED_MODALITIES = ["FLAIR", "T1", "T1ce", "T2"]


class ValidationService:
    @staticmethod
    def validate_session(session_id: str) -> Tuple[bool, List[str], Dict[str, Any], bool]:
        """
        Validates the files in a session directory:
        - Automatically detects CT scan vs multimodal MRI
        - If CT scan: validates NIfTI/DICOM geometry, extracts dimensions, reports AI model incompatibility
        - If MRI: checks that all 4 required sequences exist and match dimensions
        - Checks that ground truth seg exists (optional)
        """
        session_files = UploadService.get_session_files(session_id)
        has_ground_truth = "seg" in session_files
        dcm_meta = UploadService.get_session_metadata(session_id)

        # Check for CT scan
        if "CT" in session_files or "ct" in session_files or dcm_meta.get("modality") == "CT":
            ct_path = session_files.get("CT", session_files.get("ct"))
            notes: List[str] = []
            is_valid = True
            meta: Dict[str, Any] = {
                "modality_type": "CT",
                "modality_name": "Computed Tomography (CT Head)",
                "is_ai_prediction_supported": False,
                "compatible_model": None,
                "unsupported_reason": (
                    "Active UNETR model is trained strictly for multimodal Brain MRI (FLAIR/T1/T1ce/T2). "
                    "CT Hounsfield-unit data is incompatible with MRI intensity weights. "
                    "AI prediction is withheld to prevent clinical hazard. "
                    "Manual annotation and candidate dataset curation are fully supported."
                ),
                "inspections": {},
                "dicom_metadata": dcm_meta
            }

            try:
                ct_info = inspect_nifti_file(ct_path)
                meta["reference_shape"] = ct_info["shape"]
                meta["reference_zooms"] = ct_info["zooms"]
                meta["inspections"]["CT"] = ct_info
                notes.append("CT scan geometry verified.")
                notes.append(meta["unsupported_reason"])
            except Exception as e:
                is_valid = False
                notes.append(f"Error inspecting CT scan: {str(e)}")

            if has_ground_truth:
                try:
                    seg_info = inspect_nifti_file(session_files["seg"])
                    meta["seg_info"] = seg_info
                except Exception as e:
                    notes.append(f"Error inspecting ground truth seg: {str(e)}")

            return is_valid, notes, meta, has_ground_truth

        # Otherwise evaluate as Multimodal Brain MRI
        mod_map: Dict[str, Path] = {}
        for req in REQUIRED_MODALITIES:
            for k, v in session_files.items():
                if k.upper() == req.upper():
                    mod_map[req] = v
                    break

        is_valid, notes, meta = verify_modality_compatibility(mod_map)
        meta["modality_type"] = "MRI"
        meta["modality_name"] = "Brain MRI (Multimodal)"
        meta["is_ai_prediction_supported"] = is_valid
        meta["compatible_model"] = "unetr-adaptive-v1.0.0" if is_valid else None
        meta["dicom_metadata"] = dcm_meta

        if has_ground_truth:
            try:
                seg_info = inspect_nifti_file(session_files["seg"])
                meta["seg_info"] = seg_info
                ref_shape = meta.get("reference_shape")
                if ref_shape and seg_info["shape"] != ref_shape:
                    notes.append(f"Ground truth dimension mismatch: {seg_info['shape']} != MRI {ref_shape}")
                    is_valid = False
            except Exception as e:
                notes.append(f"Error inspecting ground truth seg: {str(e)}")
                is_valid = False

        return is_valid, notes, meta, has_ground_truth
