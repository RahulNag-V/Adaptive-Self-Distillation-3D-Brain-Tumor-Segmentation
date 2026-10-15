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
        - Checks that all 4 required modalities exist
        - Checks that dimensions match
        - Checks that ground truth seg exists (optional)
        """
        session_files = UploadService.get_session_files(session_id)
        has_ground_truth = "seg" in session_files

        # Map to required uppercase keys for verification
        mod_map: Dict[str, Path] = {}
        for req in REQUIRED_MODALITIES:
            for k, v in session_files.items():
                if k.upper() == req.upper():
                    mod_map[req] = v
                    break

        is_valid, notes, meta = verify_modality_compatibility(mod_map)

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
