"""
DICOM series processing, de-identification, and volumetric reconstruction utilities.
Supports parsing single DICOM files or zipped DICOM series, extracting Hounsfield Units (CT)
or normalized intensities (MRI), stripping protected health information (PHI), and converting
safely to standardized NIfTI-1 format for 2D/3D viewing and editing.
"""
from pathlib import Path
import io
import os
import re
import zipfile
import shutil
import logging
from typing import Dict, Any, List, Optional, Tuple

import numpy as np
import nibabel as nib
import pydicom

logger = logging.getLogger("neuroseg3d.dicom_utils")

MAX_DICOM_SLICES = 1000
MAX_UNCOMPRESSED_BYTES = 1024 * 1024 * 1024  # 1 GB decompression guard

# Fields to strip for HIPAA/PHI compliance
PHI_TAGS_TO_REMOVE = [
    "PatientName", "PatientBirthDate", "PatientAge", "PatientAddress",
    "PatientTelephoneNumbers", "OtherPatientIDs", "InstitutionName",
    "InstitutionAddress", "InstitutionalDepartmentName", "ReferringPhysicianName",
    "PerformingPhysicianName", "OperatorsName", "PhysiciansOfRecord"
]


def is_dicom_file(file_path: Path) -> bool:
    """Checks whether a file has a valid DICOM header or magic bytes."""
    if not file_path.exists() or file_path.stat().st_size < 132:
        return False
    try:
        with open(file_path, "rb") as f:
            f.seek(128)
            magic = f.read(4)
            if magic == b"DICM":
                return True
        # Try reading header directly
        pydicom.dcmread(str(file_path), stop_before_pixels=True)
        return True
    except Exception:
        return False


def is_dicom_zip(file_path: Path) -> bool:
    """Checks whether a zip archive contains DICOM (.dcm) files."""
    if not file_path.exists() or not zipfile.is_zipfile(str(file_path)):
        return False
    try:
        with zipfile.ZipFile(str(file_path), "r") as z:
            for info in z.infolist()[:20]:
                if info.filename.lower().endswith(".dcm") or not "." in info.filename:
                    # Test extract first few bytes
                    with z.open(info) as f:
                        header = f.read(132)
                        if len(header) >= 132 and header[128:132] == b"DICM":
                            return True
        return False
    except Exception:
        return False


def sanitize_study_identifier(raw_id: Optional[str], fallback_prefix: str = "SCAN") -> str:
    """Returns a sanitized, anonymized study or patient ID stripping any PHI."""
    if not raw_id:
        import uuid
        return f"{fallback_prefix}_{uuid.uuid4().hex[:8]}"
    import hashlib
    token = hashlib.sha256(str(raw_id).encode("utf-8")).hexdigest()[:8].upper()
    return f"{fallback_prefix}_ANON_{token}"


def process_dicom_upload(
    upload_path: Path,
    dest_nii_path: Path,
    session_id: str
) -> Dict[str, Any]:
    """
    Parses a DICOM file or zip archive, de-identifies metadata,
    reconstructs a 3D volumetric array, and saves to dest_nii_path as NIfTI.
    """
    temp_extract_dir = upload_path.parent / f"_dcm_extract_{session_id}"
    temp_extract_dir.mkdir(parents=True, exist_ok=True)

    try:
        dcm_files: List[Path] = []
        if zipfile.is_zipfile(str(upload_path)):
            # Safe zip extraction guarding against Zip Slip and Zip Bombs
            total_size = 0
            with zipfile.ZipFile(str(upload_path), "r") as z:
                for member in z.infolist():
                    # Guard Zip Slip path traversal
                    target_path = (temp_extract_dir / member.filename).resolve()
                    if not str(target_path).startswith(str(temp_extract_dir.resolve())):
                        raise ValueError("Malicious archive detected: Zip Slip path traversal.")
                    total_size += member.file_size
                    if total_size > MAX_UNCOMPRESSED_BYTES:
                        raise ValueError("Archive exceeds maximum decompression limit (1 GB).")

                z.extractall(temp_extract_dir)

            for root, _, files in os.walk(temp_extract_dir):
                for f in files:
                    fp = Path(root) / f
                    if is_dicom_file(fp):
                        dcm_files.append(fp)
        else:
            if is_dicom_file(upload_path):
                dcm_files.append(upload_path)
            else:
                raise ValueError("File is not a valid DICOM file or DICOM zip archive.")

        if not dcm_files:
            raise ValueError("No valid DICOM slice files found in the upload.")

        if len(dcm_files) > MAX_DICOM_SLICES:
            raise ValueError(f"DICOM slice count ({len(dcm_files)}) exceeds safe limit ({MAX_DICOM_SLICES}).")

        # Read slices
        slices = []
        for fp in dcm_files:
            try:
                ds = pydicom.dcmread(str(fp))
                slices.append(ds)
            except Exception as e:
                logger.warning(f"Skipping unreadable DICOM slice {fp.name}: {e}")

        if not slices:
            raise ValueError("Could not read pixel data from DICOM slices.")

        # Sort slices by ImagePositionPatient (Z) or SliceLocation or InstanceNumber
        def get_slice_order_key(ds):
            if hasattr(ds, "ImagePositionPatient") and len(ds.ImagePositionPatient) >= 3:
                return float(ds.ImagePositionPatient[2])
            if hasattr(ds, "SliceLocation"):
                return float(ds.SliceLocation)
            if hasattr(ds, "InstanceNumber"):
                return float(ds.InstanceNumber)
            return 0.0

        slices.sort(key=get_slice_order_key)

        ref_ds = slices[0]
        modality = getattr(ref_ds, "Modality", "CT").upper()
        raw_patient_id = getattr(ref_ds, "PatientID", None)
        sanitized_id = sanitize_study_identifier(raw_patient_id, fallback_prefix=modality)

        # Extract pixel spacing & slice thickness
        pixel_spacing = [1.0, 1.0]
        if hasattr(ref_ds, "PixelSpacing") and len(ref_ds.PixelSpacing) >= 2:
            pixel_spacing = [float(ref_ds.PixelSpacing[0]), float(ref_ds.PixelSpacing[1])]

        slice_thickness = 1.0
        if hasattr(ref_ds, "SliceThickness"):
            slice_thickness = float(ref_ds.SliceThickness)
        elif len(slices) > 1 and hasattr(slices[0], "ImagePositionPatient") and hasattr(slices[1], "ImagePositionPatient"):
            diff = abs(float(slices[1].ImagePositionPatient[2]) - float(slices[0].ImagePositionPatient[2]))
            if diff > 0.01:
                slice_thickness = diff

        spacing = [pixel_spacing[0], pixel_spacing[1], slice_thickness]

        # Stack into 3D volume
        arrays_2d = []
        for s in slices:
            arr = s.pixel_array.astype(np.float32)
            # Apply RescaleSlope and RescaleIntercept for CT Hounsfield Units
            slope = float(getattr(s, "RescaleSlope", 1.0))
            intercept = float(getattr(s, "RescaleIntercept", 0.0))
            if slope != 1.0 or intercept != 0.0:
                arr = arr * slope + intercept
            arrays_2d.append(arr)

        vol_3d = np.stack(arrays_2d, axis=-1)  # (Rows, Cols, Slices) -> (Y, X, Z)
        # Transpose to (X, Y, Z) canonical order
        vol_3d = np.transpose(vol_3d, (1, 0, 2))

        # Check for NaN / Inf
        vol_3d = np.nan_to_num(vol_3d, nan=0.0, posinf=1000.0, neginf=-1000.0)

        # Create affine matrix with diagonal spacing
        affine = np.diag([spacing[0], spacing[1], spacing[2], 1.0])
        nii = nib.Nifti1Image(vol_3d, affine)
        nib.save(nii, str(dest_nii_path))

        # Windowing metadata if present (common for CT Head)
        window_center = getattr(ref_ds, "WindowCenter", 40)
        window_width = getattr(ref_ds, "WindowWidth", 80)
        if isinstance(window_center, (list, pydicom.multival.MultiValue)):
            window_center = float(window_center[0])
        else:
            window_center = float(window_center)
        if isinstance(window_width, (list, pydicom.multival.MultiValue)):
            window_width = float(window_width[0])
        else:
            window_width = float(window_width)

        # De-identified safe summary metadata
        meta = {
            "format": "DICOM",
            "modality": modality,
            "detected_patient_id": sanitized_id,
            "series_description": str(getattr(ref_ds, "SeriesDescription", f"{modality} Volumetric Scan")),
            "dimensions": list(vol_3d.shape),
            "spacing": [round(float(s), 2) for s in spacing],
            "num_slices": len(slices),
            "min_intensity": float(np.min(vol_3d)),
            "max_intensity": float(np.max(vol_3d)),
            "window_center": window_center,
            "window_width": window_width,
            "phi_stripped": True,
            "converted_nifti": dest_nii_path.name
        }

        return meta

    finally:
        # Cleanup temporary extraction directory
        if temp_extract_dir.exists():
            try:
                shutil.rmtree(temp_extract_dir)
            except Exception:
                pass
