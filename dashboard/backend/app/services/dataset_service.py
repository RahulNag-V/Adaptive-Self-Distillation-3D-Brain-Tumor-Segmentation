"""
Adaptive Learning Dataset Service for NeuroSeg 3D.
Maintains a curated, versioned training dataset of verified human corrections.
Enforces geometric integrity checks, label compliance, non-emptiness, deduplication,
and strict patient-level splitting to safeguard the fixed validation benchmark.
"""
from pathlib import Path
import json
import logging
import shutil
import time
from typing import Dict, Any, List, Optional

import nibabel as nib
import numpy as np

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
from app.schemas.adaptive import AnnotationState
from app.services.annotation_service import AnnotationService
from app.services.volume_service import VolumeService

logger = logging.getLogger("neuroseg3d.adaptive.dataset")

DATASET_BASE_DIR = BACKEND_DIR / "runtime" / "adaptive" / "dataset"
DATASET_BASE_DIR.mkdir(parents=True, exist_ok=True)
MANIFEST_FILE = DATASET_BASE_DIR / "dataset_manifest.json"

# Protected validation cohort that must NEVER be contaminated by training data
PROTECTED_VALIDATION_PATIENTS = {
    "BraTS2021_01060", "BraTS2021_01061", "BraTS2021_01062", "BraTS2021_01063",
    "BraTS2021_01064", "BraTS2021_01065", "BraTS2021_01066", "BraTS2021_01067",
    "BraTS2021_01068", "BraTS2021_01069"
}


class DatasetService:
    @classmethod
    def _load_manifest(cls) -> Dict[str, Any]:
        if MANIFEST_FILE.exists():
            try:
                with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Error reading dataset manifest: {e}")

        # Default manifest structure
        now = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        initial = {
            "dataset_version": "v1.0.0-adaptive",
            "created_at": now,
            "updated_at": now,
            "total_samples": 0,
            "splits": {
                "train": [],
                "fixed_validation": list(sorted(PROTECTED_VALIDATION_PATIENTS)),
                "test": []
            },
            "samples": []
        }
        cls._save_manifest(initial)
        return initial

    @classmethod
    def _save_manifest(cls, manifest: Dict[str, Any]) -> None:
        manifest["updated_at"] = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)

    @classmethod
    def get_dataset_stats(cls) -> Dict[str, Any]:
        """Returns comprehensive statistics regarding annotations, dataset samples, and split distributions."""
        manifest = cls._load_manifest()
        annotations = AnnotationService.list_all_annotations()

        approved_for_training = [a for a in annotations if a.get("status") == AnnotationState.APPROVED_FOR_TRAINING.value]
        pending_review = [a for a in annotations if a.get("status") == AnnotationState.SUBMITTED_FOR_REVIEW.value]
        in_progress = [a for a in annotations if a.get("status") in [AnnotationState.CORRECTION_IN_PROGRESS.value, AnnotationState.DRAFT_SAVED.value]]
        ingested = [a for a in annotations if a.get("status") == AnnotationState.INCLUDED_IN_TRAINING_DATASET.value]

        return {
            "dataset_version": manifest.get("dataset_version", "v1.0.0-adaptive"),
            "total_ingested_samples": len(manifest.get("samples", [])),
            "samples_approved_pending_ingestion": len(approved_for_training),
            "samples_pending_review": len(pending_review),
            "samples_in_progress": len(in_progress),
            "total_annotations_tracked": len(annotations),
            "splits_count": {
                "train": len(manifest.get("splits", {}).get("train", [])),
                "fixed_validation": len(manifest.get("splits", {}).get("fixed_validation", [])),
                "test": len(manifest.get("splits", {}).get("test", []))
            },
            "protected_validation_count": len(PROTECTED_VALIDATION_PATIENTS)
        }

    @classmethod
    def validate_and_ingest_approved_sample(cls, patient_id: str) -> Dict[str, Any]:
        """
        Validates geometric and anatomical compliance of an approved correction before adding to adaptive dataset.
        Prevents data leakage into the fixed validation cohort.
        """
        record = AnnotationService.get_or_create_annotation(patient_id)
        if record.get("status") != AnnotationState.APPROVED_FOR_TRAINING.value:
            return {
                "success": False,
                "error": f"Cannot ingest sample {patient_id}. Current status is '{record.get('status')}', but 'Approved for Training' is required."
            }

        # Data Leakage Guard: Check if patient belongs to protected validation cohort
        if patient_id in PROTECTED_VALIDATION_PATIENTS:
            return {
                "success": False,
                "error": f"Data leakage protection: Patient {patient_id} belongs to the fixed validation cohort and CANNOT be added to training data."
            }

        pdir = AnnotationService._get_patient_annotation_dir(patient_id)
        corrected_path = pdir / "corrected_seg.nii.gz"
        if not corrected_path.exists():
            return {"success": False, "error": f"Corrected mask file missing for {patient_id}."}

        # Validate NIfTI geometry and labels
        try:
            nii = nib.load(str(corrected_path))
            data = np.asanyarray(nii.dataobj).astype(np.uint8)
        except Exception as e:
            return {"success": False, "error": f"Corrupt NIfTI volume: {str(e)}"}

        if data.ndim != 3:
            return {"success": False, "error": f"Expected 3D mask volume, got shape {data.shape}."}

        # Check for empty mask
        non_zero_voxels = int(np.count_nonzero(data))
        if non_zero_voxels == 0:
            return {"success": False, "error": "Mask is completely empty (0 non-zero voxels)."}

        # Validate labels
        unique_labels = set(np.unique(data))
        valid_labels = {0, 1, 2, 3, 4}
        if not unique_labels.issubset(valid_labels):
            return {"success": False, "error": f"Invalid labels detected: {unique_labels - valid_labels}. Allowed: {valid_labels}."}

        # Copy to dataset repository folder
        sample_dest_dir = DATASET_BASE_DIR / "samples" / patient_id
        sample_dest_dir.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(corrected_path, sample_dest_dir / "label.nii.gz")

        # Ingest into manifest
        manifest = cls._load_manifest()
        now = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())

        # Check for deduplication
        existing_sample = next((s for s in manifest["samples"] if s["patient_id"] == patient_id), None)
        sample_entry = {
            "patient_id": patient_id,
            "annotation_id": record.get("annotation_id"),
            "ingested_at": now,
            "voxel_count": int(non_zero_voxels),
            "labels_present": [int(x) for x in sorted(unique_labels)],
            "label_file": str(sample_dest_dir / "label.nii.gz")
        }

        if existing_sample:
            manifest["samples"].remove(existing_sample)
        manifest["samples"].append(sample_entry)
        manifest["total_samples"] = len(manifest["samples"])

        if patient_id not in manifest["splits"]["train"]:
            manifest["splits"]["train"].append(patient_id)

        cls._save_manifest(manifest)

        # Transition annotation status
        record["status"] = AnnotationState.INCLUDED_IN_TRAINING_DATASET.value
        record["updated_at"] = now
        record["history"].append({
            "action": "ingested_into_training_dataset",
            "timestamp": now,
            "dataset_version": manifest["dataset_version"]
        })
        with open(AnnotationService._get_metadata_file(patient_id), "w", encoding="utf-8") as f:
            json.dump(record, f, indent=2)

        return {
            "success": True,
            "patient_id": patient_id,
            "status": record["status"],
            "dataset_version": manifest["dataset_version"],
            "total_dataset_samples": manifest["total_samples"]
        }

    @classmethod
    def ingest_all_approved_samples(cls) -> Dict[str, Any]:
        """Ingests all currently approved annotations that have passed review."""
        annotations = AnnotationService.list_all_annotations()
        approved = [a for a in annotations if a.get("status") == AnnotationState.APPROVED_FOR_TRAINING.value]

        ingested_count = 0
        errors = []

        for item in approved:
            pid = item.get("patient_id")
            res = cls.validate_and_ingest_approved_sample(pid)
            if res.get("success"):
                ingested_count += 1
            else:
                errors.append({"patient_id": pid, "error": res.get("error")})

        return {
            "success": True,
            "ingested_count": ingested_count,
            "failed_count": len(errors),
            "errors": errors
        }
