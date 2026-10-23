"""
NIfTI utility and security functions for NeuroSeg 3D.
Enforces strict file validation, path traversal defense, and session isolation.
"""
import os
import re
import shutil
from pathlib import Path
from typing import Tuple, List, Dict, Optional, Any
import nibabel as nib
import numpy as np

ALLOWED_EXTENSIONS = (".nii", ".nii.gz", ".dcm", ".zip")
DISALLOWED_EXTENSIONS = (
    ".exe", ".bat", ".cmd", ".sh", ".py", ".bin", ".dll", ".so",
    ".vbs", ".ps1", ".jar", ".msi", ".scr", ".com"
)
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500 MB per file limit

# Base runtime session folder inside dashboard/backend/runtime/sessions/
BASE_RUNTIME_DIR = Path(__file__).resolve().parent.parent.parent / "runtime" / "sessions"


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename against path traversal and dangerous characters.
    """
    clean_name = os.path.basename(filename)
    clean_name = re.sub(r'[\/\\:\*\?"<>\|\x00]', '_', clean_name)
    return clean_name


def validate_file_security(filename: str, file_size: int = 0) -> Tuple[bool, str]:
    """
    Validates file extension and ensures no executable or malicious files are accepted.
    """
    lower_name = filename.lower()

    for bad_ext in DISALLOWED_EXTENSIONS:
        if lower_name.endswith(bad_ext):
            return False, f"Dangerous or executable file extension detected: {bad_ext}"

    has_valid_ext = any(lower_name.endswith(ext) for ext in ALLOWED_EXTENSIONS)
    if not has_valid_ext:
        return False, f"File must be a medical image (.nii, .nii.gz, .dcm) or DICOM archive (.zip). Received: {filename}"

    if file_size > MAX_FILE_SIZE:
        return False, f"File size exceeds allowable limit (500 MB): {file_size / (1024*1024):.1f} MB"

    return True, "Valid"


def get_session_dir(session_id: str) -> Path:
    """
    Returns the session directory path, ensuring it exists.
    """
    session_clean = sanitize_filename(session_id)
    session_dir = BASE_RUNTIME_DIR / session_clean
    session_dir.mkdir(parents=True, exist_ok=True)
    return session_dir


def cleanup_session_dir(session_id: str) -> None:
    """
    Safely removes session folder and temporary MRI/prediction files.
    """
    session_clean = sanitize_filename(session_id)
    session_dir = BASE_RUNTIME_DIR / session_clean
    if session_dir.exists() and session_dir.is_dir():
        try:
            shutil.rmtree(session_dir)
        except Exception:
            pass


def inspect_nifti_file(file_path: Path) -> Dict[str, Any]:
    """
    Loads and inspects a single NIfTI file: verifies readable, shape, zooms, affine, and NaN/Inf absence.
    """
    if not file_path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    try:
        nii = nib.load(str(file_path))
    except Exception as e:
        raise ValueError(f"Unable to read NIfTI file {file_path.name}: {str(e)}")

    shape = list(nii.shape)
    header = nii.header
    zooms = [float(z) for z in header.get_zooms()[:3]]
    affine = nii.affine

    if affine is None or not isinstance(affine, np.ndarray) or affine.shape != (4, 4):
        raise ValueError(f"Invalid affine matrix in {file_path.name}")

    # Inspect a subsample or fast check for NaN/Inf
    data_arr = nii.get_fdata(dtype=np.float32)
    if np.isnan(data_arr).any():
        raise ValueError(f"Corrupt scan: NaN values detected in {file_path.name}")
    if np.isinf(data_arr).any():
        raise ValueError(f"Corrupt scan: Infinite values detected in {file_path.name}")

    return {
        "shape": shape,
        "zooms": zooms,
        "affine": affine,
        "dtype": str(header.get_data_dtype()),
        "header": header
    }


def verify_modality_compatibility(modality_files: Dict[str, Path]) -> Tuple[bool, List[str], Dict[str, Any]]:
    """
    Verifies that the 4 required modalities:
    - FLAIR, T1, T1ce, T2 exist
    - have identical spatial shapes
    - have valid affines
    - have compatible headers
    """
    required = ["FLAIR", "T1", "T1ce", "T2"]
    missing = [m for m in required if m not in modality_files or not modality_files[m].exists()]
    notes: List[str] = []

    if missing:
        return False, [f"Missing required sequence(s): {', '.join(missing)}"], {}

    inspections: Dict[str, Any] = {}
    reference_shape = None
    reference_zooms = None

    for mod in required:
        path = modality_files[mod]
        try:
            info = inspect_nifti_file(path)
            inspections[mod] = info
            if reference_shape is None:
                reference_shape = info["shape"]
                reference_zooms = info["zooms"]
            else:
                if info["shape"] != reference_shape:
                    notes.append(f"Dimension mismatch: {mod} shape {info['shape']} != FLAIR shape {reference_shape}")
        except Exception as e:
            notes.append(f"Error inspecting {mod}: {str(e)}")

    is_valid = len(notes) == 0 and len(inspections) == 4
    meta = {
        "reference_shape": reference_shape,
        "reference_zooms": reference_zooms,
        "inspections": inspections
    }
    return is_valid, notes, meta
