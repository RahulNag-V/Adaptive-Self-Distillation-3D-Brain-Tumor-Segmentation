"""
Annotation & Interactive Correction Service for NeuroSeg 3D.
Manages versioned human-in-the-loop annotations, 3D voxel mask updates from 2D slice strokes,
undo/redo stacks, audit trails, and multi-stage review workflows.
"""
from pathlib import Path
import json
import logging
import math
import shutil
import time
import uuid
from typing import Dict, Any, List, Optional, Tuple

import nibabel as nib
import numpy as np

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent

from app.schemas.adaptive import AnnotationState
from app.services.volume_service import VolumeService

logger = logging.getLogger("neuroseg3d.adaptive.annotation")

ANNOTATIONS_BASE_DIR = BACKEND_DIR / "runtime" / "adaptive" / "annotations"
ANNOTATIONS_BASE_DIR.mkdir(parents=True, exist_ok=True)


class AnnotationService:
    @classmethod
    def _get_patient_annotation_dir(cls, patient_id: str) -> Path:
        pdir = ANNOTATIONS_BASE_DIR / patient_id
        pdir.mkdir(parents=True, exist_ok=True)
        return pdir

    @classmethod
    def _get_metadata_file(cls, patient_id: str) -> Path:
        return cls._get_patient_annotation_dir(patient_id) / "annotation_record.json"

    @classmethod
    def get_or_create_annotation(cls, patient_id: str, seg_source: str = "prediction") -> Dict[str, Any]:
        """
        Retrieves the active annotation record for a patient or initializes a new one.
        Copies the baseline mask (prediction or ground_truth) to initialize working correction.
        """
        meta_file = cls._get_metadata_file(patient_id)
        pdir = cls._get_patient_annotation_dir(patient_id)
        corrected_mask_path = pdir / "corrected_seg.nii.gz"
        original_mask_path = pdir / "original_seg.nii.gz"

        if meta_file.exists():
            try:
                with open(meta_file, "r", encoding="utf-8") as f:
                    record = json.load(f)
                return record
            except Exception as e:
                logger.warning(f"Could not read existing annotation record for {patient_id}: {e}")

        # Initialize new record from baseline mask
        subj_dir = VolumeService._find_subject_dir(patient_id)
        sess_dir = VolumeService._find_session_dir(patient_id)

        source_nii = None
        if seg_source == "prediction" and sess_dir and (sess_dir / "prediction.nii.gz").exists():
            source_nii = sess_dir / "prediction.nii.gz"
        elif subj_dir:
            gt_file = subj_dir / f"{patient_id}_seg.nii.gz"
            if gt_file.exists():
                source_nii = gt_file

        if not source_nii or not source_nii.exists():
            # Create a blank NIfTI template matching dimensions if available
            dims = (240, 240, 155)
            aff = np.eye(4)
            img = nib.Nifti1Image(np.zeros(dims, dtype=np.uint8), aff)
            nib.save(img, str(original_mask_path))
            nib.save(img, str(corrected_mask_path))
        else:
            # Copy source to both original and initial corrected
            shutil.copyfile(source_nii, original_mask_path)
            shutil.copyfile(source_nii, corrected_mask_path)

        now = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        record = {
            "annotation_id": str(uuid.uuid4()),
            "patient_id": patient_id,
            "seg_source": seg_source,
            "status": AnnotationState.PREDICTION_GENERATED.value,
            "created_at": now,
            "updated_at": now,
            "annotator_id": "system_initial",
            "model_version": "v1.0.0-adaptive-unetr",
            "total_edits_count": 0,
            "total_voxels_modified": 0,
            "history": [
                {
                    "action": "initial_creation",
                    "timestamp": now,
                    "description": f"Initialized from {seg_source} source mask."
                }
            ],
            "undo_stack_size": 0,
            "redo_stack_size": 0,
            "review_decision": None,
            "reviewer_id": None,
            "review_notes": None,
            "review_timestamp": None,
            "is_approved_for_training": False
        }

        with open(meta_file, "w", encoding="utf-8") as f:
            json.dump(record, f, indent=2)

        return record

    @classmethod
    def apply_voxel_strokes(
        cls,
        patient_id: str,
        strokes: List[Any],
        action_type: str = "paint"
    ) -> Dict[str, Any]:
        """
        Applies interactive 2D brush/eraser strokes directly into the 3D NIfTI segmentation volume.
        Ensures exact spatial mapping across Axial (Z), Coronal (Y), and Sagittal (X) planes.
        """
        record = cls.get_or_create_annotation(patient_id)
        pdir = cls._get_patient_annotation_dir(patient_id)
        corrected_path = pdir / "corrected_seg.nii.gz"
        undo_backup_path = pdir / f"undo_backup_{record.get('total_edits_count', 0)}.nii.gz"

        if not corrected_path.exists():
            raise FileNotFoundError(f"Corrected mask for {patient_id} does not exist.")

        # Save previous state to undo stack
        shutil.copyfile(corrected_path, undo_backup_path)

        nii = nib.load(str(corrected_path))
        data = np.asanyarray(nii.dataobj).astype(np.uint8).copy()
        shape = data.shape  # (X, Y, Z) usually (240, 240, 155)

        voxels_modified_this_step = 0

        for stroke in strokes:
            plane = stroke.plane.lower()
            slice_idx = stroke.slice_index
            target_label = int(stroke.label)
            radius = int(stroke.brush_radius)
            points = stroke.points

            for pt in points:
                px, py = int(pt[0]), int(pt[1])

                # Generate circular brush disk
                for dx in range(-radius, radius + 1):
                    for dy in range(-radius, radius + 1):
                        if dx * dx + dy * dy <= radius * radius:
                            cx, cy = px + dx, py + dy

                            # Map 2D slice coordinate + slice_index to 3D voxel index (x, y, z)
                            if plane == "axial":
                                # Screen (cx, cy) -> (X, Y), slice_idx -> Z
                                vx, vy, vz = cx, cy, slice_idx
                            elif plane == "coronal":
                                # Screen (cx, cy) -> (X, Z), slice_idx -> Y
                                vx, vy, vz = cx, slice_idx, shape[2] - 1 - cy
                            elif plane == "sagittal":
                                # Screen (cx, cy) -> (Y, Z), slice_idx -> X
                                vx, vy, vz = slice_idx, cx, shape[2] - 1 - cy
                            else:
                                continue

                            # Verify bounds
                            if 0 <= vx < shape[0] and 0 <= vy < shape[1] and 0 <= vz < shape[2]:
                                if data[vx, vy, vz] != target_label:
                                    data[vx, vy, vz] = target_label
                                    voxels_modified_this_step += 1

        # Save modified mask
        new_nii = nib.Nifti1Image(data, nii.affine, nii.header)
        nib.save(new_nii, str(corrected_path))

        # Invalidate volume service cache for this subject so viewers display new mask immediately
        with VolumeService._cache_lock:
            key_pred = (patient_id, "prediction")
            key_corr = (patient_id, "corrected")
            if key_pred in VolumeService._cache:
                del VolumeService._cache[key_pred]
            if key_corr in VolumeService._cache:
                del VolumeService._cache[key_corr]

        # Update annotation metadata
        now = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        record["status"] = AnnotationState.CORRECTION_IN_PROGRESS.value
        record["updated_at"] = now
        record["total_edits_count"] = record.get("total_edits_count", 0) + 1
        record["total_voxels_modified"] = record.get("total_voxels_modified", 0) + voxels_modified_this_step
        record["undo_stack_size"] = record.get("undo_stack_size", 0) + 1
        record["redo_stack_size"] = 0
        record["history"].append({
            "action": action_type,
            "timestamp": now,
            "strokes_count": len(strokes),
            "voxels_modified": voxels_modified_this_step
        })

        with open(cls._get_metadata_file(patient_id), "w", encoding="utf-8") as f:
            json.dump(record, f, indent=2)

        return {
            "success": True,
            "patient_id": patient_id,
            "status": record["status"],
            "voxels_modified": voxels_modified_this_step,
            "total_edits": record["total_edits_count"],
            "undo_available": True
        }

    @classmethod
    def undo_last_edit(cls, patient_id: str) -> Dict[str, Any]:
        """Restores the previous volume state from the backup stack."""
        record = cls.get_or_create_annotation(patient_id)
        edit_cnt = record.get("total_edits_count", 0)
        pdir = cls._get_patient_annotation_dir(patient_id)

        if edit_cnt <= 0:
            return {"success": False, "error": "No previous edits to undo."}

        last_backup = pdir / f"undo_backup_{edit_cnt - 1}.nii.gz"
        corrected_path = pdir / "corrected_seg.nii.gz"
        redo_backup = pdir / f"redo_backup_{edit_cnt}.nii.gz"

        if not last_backup.exists():
            return {"success": False, "error": "Undo backup file not found."}

        # Stash current as redo
        shutil.copyfile(corrected_path, redo_backup)
        # Restore backup as corrected
        shutil.copyfile(last_backup, corrected_path)
        last_backup.unlink(missing_ok=True)

        record["total_edits_count"] = edit_cnt - 1
        record["undo_stack_size"] = max(0, record.get("undo_stack_size", 1) - 1)
        record["redo_stack_size"] = record.get("redo_stack_size", 0) + 1
        now = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        record["updated_at"] = now
        record["history"].append({"action": "undo", "timestamp": now})

        # Clear cache
        with VolumeService._cache_lock:
            for k in [(patient_id, "prediction"), (patient_id, "corrected")]:
                if k in VolumeService._cache:
                    del VolumeService._cache[k]

        with open(cls._get_metadata_file(patient_id), "w", encoding="utf-8") as f:
            json.dump(record, f, indent=2)

        return {"success": True, "undo_available": record["undo_stack_size"] > 0, "redo_available": True}

    @classmethod
    def redo_last_edit(cls, patient_id: str) -> Dict[str, Any]:
        """Restores the next volume state from the redo backup stack."""
        record = cls.get_or_create_annotation(patient_id)
        redo_cnt = record.get("redo_stack_size", 0)
        pdir = cls._get_patient_annotation_dir(patient_id)
        edit_cnt = record.get("total_edits_count", 0)

        if redo_cnt <= 0:
            return {"success": False, "error": "No edits available to redo."}

        redo_backup = pdir / f"redo_backup_{edit_cnt + 1}.nii.gz"
        corrected_path = pdir / "corrected_seg.nii.gz"
        undo_backup = pdir / f"undo_backup_{edit_cnt}.nii.gz"

        if not redo_backup.exists():
            return {"success": False, "error": "Redo backup file not found."}

        # Stash current state as undo backup
        shutil.copyfile(corrected_path, undo_backup)
        # Restore redo state as corrected
        shutil.copyfile(redo_backup, corrected_path)
        redo_backup.unlink(missing_ok=True)

        record["total_edits_count"] = edit_cnt + 1
        record["undo_stack_size"] = record.get("undo_stack_size", 0) + 1
        record["redo_stack_size"] = max(0, redo_cnt - 1)
        now = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        record["updated_at"] = now
        record["history"].append({"action": "redo", "timestamp": now})

        # Clear volume cache
        with VolumeService._cache_lock:
            for k in [(patient_id, "prediction"), (patient_id, "corrected")]:
                if k in VolumeService._cache:
                    del VolumeService._cache[k]

        with open(cls._get_metadata_file(patient_id), "w", encoding="utf-8") as f:
            json.dump(record, f, indent=2)

        return {"success": True, "undo_available": True, "redo_available": record["redo_stack_size"] > 0}

    @classmethod
    def clear_all_edits(cls, patient_id: str) -> Dict[str, Any]:
        """Resets the corrected mask back to the original unmodified prediction."""
        record = cls.get_or_create_annotation(patient_id)
        pdir = cls._get_patient_annotation_dir(patient_id)
        original_path = pdir / "original_seg.nii.gz"
        corrected_path = pdir / "corrected_seg.nii.gz"

        if original_path.exists():
            shutil.copyfile(original_path, corrected_path)

        record["status"] = AnnotationState.PREDICTION_GENERATED.value
        record["total_edits_count"] = 0
        record["total_voxels_modified"] = 0
        record["undo_stack_size"] = 0
        record["redo_stack_size"] = 0
        now = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        record["updated_at"] = now
        record["history"].append({"action": "clear_all_edits", "timestamp": now})

        with VolumeService._cache_lock:
            for k in [(patient_id, "prediction"), (patient_id, "corrected")]:
                if k in VolumeService._cache:
                    del VolumeService._cache[k]

        with open(cls._get_metadata_file(patient_id), "w", encoding="utf-8") as f:
            json.dump(record, f, indent=2)

        return {"success": True, "status": record["status"], "message": "All edits cleared, original restored."}

    @classmethod
    def save_draft(cls, patient_id: str, annotator_id: str = "radiologist_user", notes: Optional[str] = None) -> Dict[str, Any]:
        """Saves current corrected segmentation as an in-progress draft."""
        record = cls.get_or_create_annotation(patient_id)
        now = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        record["status"] = AnnotationState.DRAFT_SAVED.value
        record["annotator_id"] = annotator_id
        record["updated_at"] = now
        record["notes"] = notes
        record["history"].append({"action": "save_draft", "timestamp": now, "annotator": annotator_id})

        with open(cls._get_metadata_file(patient_id), "w", encoding="utf-8") as f:
            json.dump(record, f, indent=2)

        return {"success": True, "record": record}

    @classmethod
    def submit_for_review(cls, patient_id: str, annotator_id: str = "radiologist_user", notes: Optional[str] = None) -> Dict[str, Any]:
        """Submits the human-reviewed annotation into the supervisory review queue."""
        record = cls.get_or_create_annotation(patient_id)
        now = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        record["status"] = AnnotationState.SUBMITTED_FOR_REVIEW.value
        record["annotator_id"] = annotator_id
        record["updated_at"] = now
        record["submission_notes"] = notes
        record["history"].append({"action": "submit_for_review", "timestamp": now, "annotator": annotator_id})

        with open(cls._get_metadata_file(patient_id), "w", encoding="utf-8") as f:
            json.dump(record, f, indent=2)

        return {"success": True, "record": record}

    @classmethod
    def review_annotation(
        cls,
        patient_id: str,
        decision: str,
        reviewer_id: str = "senior_neuro_radiologist",
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes formal clinical review decision ('approve' or 'reject').
        If approved, promotes state to 'Approved for Training' so dataset ingestion can accept it.
        """
        record = cls.get_or_create_annotation(patient_id)
        now = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())

        is_approved = decision.lower() == "approve"
        new_status = AnnotationState.APPROVED_FOR_TRAINING.value if is_approved else AnnotationState.REJECTED.value

        record["status"] = new_status
        record["review_decision"] = "approved" if is_approved else "rejected"
        record["reviewer_id"] = reviewer_id
        record["review_notes"] = reason
        record["review_timestamp"] = now
        record["updated_at"] = now
        record["is_approved_for_training"] = is_approved

        record["history"].append({
            "action": f"review_{decision.lower()}",
            "timestamp": now,
            "reviewer": reviewer_id,
            "decision": record["review_decision"],
            "reason": reason
        })

        with open(cls._get_metadata_file(patient_id), "w", encoding="utf-8") as f:
            json.dump(record, f, indent=2)

        return {"success": True, "record": record}

    @classmethod
    def compare_masks(cls, patient_id: str) -> Dict[str, Any]:
        """
        Compares original model prediction against corrected human mask:
        Computes WT, TC, ET agreement Dice and net volume displacement.
        """
        pdir = cls._get_patient_annotation_dir(patient_id)
        orig_path = pdir / "original_seg.nii.gz"
        corr_path = pdir / "corrected_seg.nii.gz"

        if not orig_path.exists() or not corr_path.exists():
            return {"success": False, "error": "Both original and corrected masks required for comparison."}

        orig_nii = nib.load(str(orig_path))
        corr_nii = nib.load(str(corr_path))

        orig = np.asanyarray(orig_nii.dataobj).astype(np.uint8)
        corr = np.asanyarray(corr_nii.dataobj).astype(np.uint8)

        zooms = orig_nii.header.get_zooms()[:3]
        voxel_vol_cm3 = (zooms[0] * zooms[1] * zooms[2]) / 1000.0

        def get_subregion(arr, name):
            if name == "WT":
                return (arr > 0).astype(np.uint8)
            elif name == "TC":
                return ((arr == 1) | (arr == 3) | (arr == 4)).astype(np.uint8)
            elif name == "ET":
                return ((arr == 3) | (arr == 4)).astype(np.uint8)
            return np.zeros_like(arr)

        def dice(a, b):
            inter = np.sum((a > 0) & (b > 0))
            total = np.sum(a > 0) + np.sum(b > 0)
            if total == 0:
                return 1.0
            return round(float((2.0 * inter) / total), 4)

        comparison = {}
        for reg in ["WT", "TC", "ET"]:
            m_orig = get_subregion(orig, reg)
            m_corr = get_subregion(corr, reg)
            d = dice(m_orig, m_corr)
            vol_orig = round(float(np.count_nonzero(m_orig) * voxel_vol_cm3), 2)
            vol_corr = round(float(np.count_nonzero(m_corr) * voxel_vol_cm3), 2)
            delta_vol = round(vol_corr - vol_orig, 2)
            comparison[reg] = {
                "dice_agreement": d,
                "original_volume_cm3": vol_orig,
                "corrected_volume_cm3": vol_corr,
                "delta_volume_cm3": delta_vol
            }

        total_voxels_changed = int(np.count_nonzero(orig != corr))
        total_vol_changed_cm3 = round(total_voxels_changed * voxel_vol_cm3, 2)

        return {
            "success": True,
            "patient_id": patient_id,
            "total_voxels_changed": total_voxels_changed,
            "total_volume_changed_cm3": total_vol_changed_cm3,
            "regions": comparison
        }

    @classmethod
    def list_all_annotations(cls) -> List[Dict[str, Any]]:
        """Lists all annotations with their current lifecycle state and review status."""
        items = []
        if not ANNOTATIONS_BASE_DIR.exists():
            return items

        for pdir in sorted(ANNOTATIONS_BASE_DIR.iterdir()):
            if pdir.is_dir():
                meta_file = pdir / "annotation_record.json"
                if meta_file.exists():
                    try:
                        with open(meta_file, "r", encoding="utf-8") as f:
                            items.append(json.load(f))
                    except Exception:
                        pass
        return items
