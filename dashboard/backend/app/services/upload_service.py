"""
Upload service handling streaming storage to predictable session directories.
Saves standard filenames: flair.nii.gz, t1.nii.gz, t1ce.nii.gz, t2.nii.gz, seg.nii.gz
"""
import uuid
from pathlib import Path
from typing import Dict, Optional
from fastapi import UploadFile
from app.utils.nifti_utils import (
    get_session_dir,
    sanitize_filename,
    validate_file_security,
    cleanup_session_dir
)

STANDARDIZED_NAMES = {
    "flair": "flair.nii.gz",
    "t1": "t1.nii.gz",
    "t1ce": "t1ce.nii.gz",
    "t2": "t2.nii.gz",
    "seg": "seg.nii.gz"
}

CANONICAL_KEYS = {
    "flair": "FLAIR",
    "t1": "T1",
    "t1ce": "T1ce",
    "t2": "T2",
    "seg": "seg"
}


class UploadService:
    @staticmethod
    async def save_session_modalities(
        session_id: str,
        files: Dict[str, UploadFile]
    ) -> Dict[str, Path]:
        """
        Saves uploaded modalities into an isolated session folder using predictable standard names.
        """
        session_dir = get_session_dir(session_id)
        saved_paths: Dict[str, Path] = {}

        for mod_key, file_obj in files.items():
            if file_obj is None or not file_obj.filename:
                continue

            clean_original = sanitize_filename(file_obj.filename)
            is_valid, reason = validate_file_security(clean_original)
            if not is_valid:
                cleanup_session_dir(session_id)
                raise ValueError(f"Security validation failed for {clean_original}: {reason}")

            normalized_mod = mod_key.lower()
            target_filename = STANDARDIZED_NAMES.get(normalized_mod, f"{normalized_mod}.nii.gz")
            target_path = session_dir / target_filename

            content = await file_obj.read()
            with open(target_path, "wb") as f:
                f.write(content)

            canonical_key = CANONICAL_KEYS.get(normalized_mod, mod_key)
            saved_paths[canonical_key] = target_path

        return saved_paths

    @staticmethod
    def get_session_files(session_id: str) -> Dict[str, Path]:
        """
        Retrieves existing modality paths for a given session.
        Uses canonical casing: FLAIR, T1, T1ce, T2, seg.
        """
        session_dir = get_session_dir(session_id)
        found: Dict[str, Path] = {}
        for mod, standard_name in STANDARDIZED_NAMES.items():
            candidate = session_dir / standard_name
            if candidate.exists():
                canonical_key = CANONICAL_KEYS.get(mod, mod)
                found[canonical_key] = candidate
        return found
