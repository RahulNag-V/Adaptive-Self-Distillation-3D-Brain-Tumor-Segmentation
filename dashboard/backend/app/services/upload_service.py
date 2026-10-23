"""
Upload service handling streaming storage to predictable session directories.
Saves standard filenames: flair.nii.gz, t1.nii.gz, t1ce.nii.gz, t2.nii.gz, seg.nii.gz
"""
import uuid
from pathlib import Path
from typing import Dict, Optional, Any
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
    "seg": "seg.nii.gz",
    "ct": "ct.nii.gz"
}

CANONICAL_KEYS = {
    "flair": "FLAIR",
    "t1": "T1",
    "t1ce": "T1ce",
    "t2": "T2",
    "seg": "seg",
    "ct": "CT"
}


class UploadService:
    @staticmethod
    async def save_session_modalities(
        session_id: str,
        files: Dict[str, UploadFile]
    ) -> Dict[str, Path]:
        """
        Saves uploaded modalities into an isolated session folder using predictable standard names.
        Automatically detects and converts DICOM (.dcm or zipped series) into standardized NIfTI.
        """
        import json
        from app.utils.dicom_utils import is_dicom_file, is_dicom_zip, process_dicom_upload

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
            lower_name = clean_original.lower()

            # Handle DICOM file or DICOM zip
            if lower_name.endswith(".dcm") or lower_name.endswith(".zip"):
                temp_upload = session_dir / f"_incoming_{clean_original}"
                with open(temp_upload, "wb") as f:
                    f.write(content)

                try:
                    dcm_meta = process_dicom_upload(temp_upload, target_path, session_id)
                    meta_path = session_dir / "dicom_metadata.json"
                    with open(meta_path, "w", encoding="utf-8") as f:
                        json.dump(dcm_meta, f, indent=2)
                finally:
                    temp_upload.unlink(missing_ok=True)
            else:
                # Direct NIfTI write
                with open(target_path, "wb") as f:
                    f.write(content)

            canonical_key = CANONICAL_KEYS.get(normalized_mod, mod_key)
            saved_paths[canonical_key] = target_path

        return saved_paths

    @staticmethod
    def get_session_files(session_id: str) -> Dict[str, Path]:
        """
        Retrieves existing modality paths for a given session.
        Uses canonical casing: FLAIR, T1, T1ce, T2, seg, CT.
        """
        session_dir = get_session_dir(session_id)
        found: Dict[str, Path] = {}
        for mod, standard_name in STANDARDIZED_NAMES.items():
            candidate = session_dir / standard_name
            if candidate.exists():
                canonical_key = CANONICAL_KEYS.get(mod, mod)
                found[canonical_key] = candidate
        return found

    @staticmethod
    def get_session_metadata(session_id: str) -> Dict[str, Any]:
        """Retrieves any de-identified metadata saved for this session."""
        session_dir = get_session_dir(session_id)
        meta_file = session_dir / "dicom_metadata.json"
        if meta_file.exists():
            try:
                import json
                with open(meta_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {}

