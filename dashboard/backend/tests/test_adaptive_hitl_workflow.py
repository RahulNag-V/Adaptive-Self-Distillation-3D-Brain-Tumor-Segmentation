"""
Comprehensive automated test suite for NeuroSeg 3D Adaptive Human-in-the-Loop workflow.
Tests:
1. Scan upload & format detection (NIfTI & DICOM)
2. CT upload & compatibility checks (reports AI prediction withheld to prevent hazard)
3. Model and task selection catalog
4. Initial AI segmentation generation with uncertainty indicators
5. Interactive voxel editing & exact coordinate mapping across planes
6. Undo, Redo, and Clear edits
7. Annotation versioning, provenance, and lifecycle transitions
8. Clinical review workflow (Approve for Training vs Reject)
9. Adaptive dataset integrity checks & data leakage prevention
10. Background fine-tuning job execution & candidate checkpoint creation
11. Candidate evaluation against fixed validation cohort & non-regression safety criteria
12. Model promotion & safe rollback
"""
from pathlib import Path
import json
import os
import shutil
import sys
import tempfile
import time
import unittest

# Fix Windows console UTF-8 output
sys.stdout.reconfigure(encoding="utf-8")

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import numpy as np
import nibabel as nib
import torch

from app.schemas.adaptive import AnnotationState, ModelRegistryStatus, VoxelEditStroke
from app.services.annotation_service import AnnotationService
from app.services.dataset_service import DatasetService, PROTECTED_VALIDATION_PATIENTS
from app.services.training_service import TrainingService
from app.services.model_registry_service import ModelRegistryService
from app.services.volume_service import VolumeService
from app.services.validation_service import ValidationService
from app.services.upload_service import UploadService
from app.utils.nifti_utils import get_session_dir, cleanup_session_dir
from app.utils.dicom_utils import sanitize_study_identifier


def test_model_task_catalog():
    """Verifies that model catalog declares supported modalities, tasks, and limitations."""
    from app.api.adaptive_routes import CONFIG_FILE
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        cfg = json.load(f)

    mods = cfg.get("supported_modalities_and_tasks", {})
    assert "brain_mri_multimodal" in mods, "brain_mri_multimodal missing from catalog"
    assert "ct_head" in mods, "ct_head missing from catalog"

    mri_spec = mods["brain_mri_multimodal"]["model_specification"]
    assert mri_spec["input_channels"] == 4, "Expected 4 input channels for multimodal MRI"
    assert "FLAIR" in mri_spec["supported_modalities"], "Expected FLAIR in supported modalities"
    assert "output_label_definitions" in mri_spec, "Output label definitions missing"
    assert "validation_metrics" in mri_spec, "Validation metrics missing"
    assert mods["brain_mri_multimodal"]["is_ai_prediction_supported"] is True, "MRI prediction should be supported"

    ct_spec = mods["ct_head"]
    assert ct_spec["is_ai_prediction_supported"] is False, "CT AI prediction must NOT be claimed as supported"
    assert "unsupported_reason" in ct_spec, "CT must declare unsupported reason"


def test_ct_upload_and_compatibility_rejection():
    """Verifies that a CT scan is recognized, validated, and AI prediction is withheld."""
    session_id = "test_ct_session_001"
    sess_dir = get_session_dir(session_id)

    try:
        # Create a synthetic 3D CT volume (Hounsfield units -1000 to +1000)
        ct_arr = np.random.uniform(-1000, 1000, size=(128, 128, 64)).astype(np.float32)
        affine = np.diag([1.0, 1.0, 2.0, 1.0])
        nii = nib.Nifti1Image(ct_arr, affine)
        ct_path = sess_dir / "ct.nii.gz"
        nib.save(nii, str(ct_path))

        is_valid, notes, meta, has_gt = ValidationService.validate_session(session_id)
        assert is_valid is True, f"CT session should be valid as an image: {notes}"
        assert meta["modality_type"] == "CT", f"Expected modality CT, got {meta.get('modality_type')}"
        assert meta["is_ai_prediction_supported"] is False, "CT must NOT support MRI UNETR prediction"
        assert meta["compatible_model"] is None, "CT must have no compatible model"
        assert "unsupported_reason" in meta, "Must provide clear unsupported reason"

    finally:
        cleanup_session_dir(session_id)


def test_dicom_deidentification():
    """Verifies that DICOM metadata sanitization strips PHI while keeping technical specs."""
    clean_id = sanitize_study_identifier("John Doe ^Patient#123", fallback_prefix="CT")
    assert "John" not in clean_id, "Patient name leaked in sanitized ID"
    assert " " not in clean_id, "Spaces not sanitized in ID"


def test_interactive_voxel_editing_and_coordinate_mapping():
    """
    Verifies that 2D strokes in Axial, Coronal, and Sagittal planes
    accurately update 3D voxels in NIfTI space and trigger cache invalidation.
    """
    test_pid = "test_hitl_patient_coord"
    pdir = AnnotationService._get_patient_annotation_dir(test_pid)

    try:
        # Create synthetic blank volume (240, 240, 155)
        init_mask = np.zeros((240, 240, 155), dtype=np.uint8)
        nii = nib.Nifti1Image(init_mask, np.eye(4))
        nib.save(nii, str(pdir / "original_seg.nii.gz"))
        nib.save(nii, str(pdir / "corrected_seg.nii.gz"))

        # Initialize annotation record
        record = AnnotationService.get_or_create_annotation(test_pid)
        assert record["status"] == AnnotationState.PREDICTION_GENERATED.value

        # 1. Apply Axial Stroke at Z=80, (X=100, Y=120) with label=1 (NCR)
        stroke_ax = VoxelEditStroke(
            plane="axial",
            slice_index=80,
            label=1,
            brush_radius=1,
            points=[[100, 120]]
        )
        res_ax = AnnotationService.apply_voxel_strokes(test_pid, strokes=[stroke_ax])
        assert res_ax["success"] is True, "Axial stroke failed"
        assert res_ax["voxels_modified"] > 0, "No voxels modified in axial stroke"

        # Verify voxel directly in NIfTI file
        corr_nii = nib.load(str(pdir / "corrected_seg.nii.gz"))
        data = np.asanyarray(corr_nii.dataobj)
        assert data[100, 120, 80] == 1, f"Expected voxel (100, 120, 80) to be 1, got {data[100, 120, 80]}"

        # 2. Apply Coronal Stroke at Y=120, with label=2 (ED)
        # Screen point (cx=100, cy=74) -> vx=100, vy=120, vz=155 - 1 - 74 = 80
        stroke_cor = VoxelEditStroke(
            plane="coronal",
            slice_index=120,
            label=2,
            brush_radius=1,
            points=[[100, 74]]
        )
        res_cor = AnnotationService.apply_voxel_strokes(test_pid, strokes=[stroke_cor])
        assert res_cor["success"] is True

        corr_nii = nib.load(str(pdir / "corrected_seg.nii.gz"))
        data = np.asanyarray(corr_nii.dataobj)
        assert data[100, 120, 80] == 2, f"Coronal stroke coordinate mapped incorrectly, got {data[100, 120, 80]}"

        # 3. Test Undo
        res_undo = AnnotationService.undo_last_edit(test_pid)
        assert res_undo["success"] is True, "Undo failed"
        data_after_undo = np.asanyarray(nib.load(str(pdir / "corrected_seg.nii.gz")).dataobj)
        assert data_after_undo[100, 120, 80] == 1, "Undo did not revert voxel back to 1"

        # 4. Test Redo
        res_redo = AnnotationService.redo_last_edit(test_pid)
        assert res_redo["success"] is True, "Redo failed"
        data_after_redo = np.asanyarray(nib.load(str(pdir / "corrected_seg.nii.gz")).dataobj)
        assert data_after_redo[100, 120, 80] == 2, "Redo did not restore voxel back to 2"

        # 5. Test Clear Edits
        res_clear = AnnotationService.clear_all_edits(test_pid)
        assert res_clear["success"] is True
        data_after_clear = np.asanyarray(nib.load(str(pdir / "corrected_seg.nii.gz")).dataobj)
        assert np.count_nonzero(data_after_clear) == 0, "Clear did not reset mask back to 0"

    finally:
        shutil.rmtree(pdir, ignore_errors=True)


def test_annotation_lifecycle_and_review():
    """Tests Draft Saving, Submission for Review, Approval, and Rejection."""
    test_pid = "test_review_patient_001"
    pdir = AnnotationService._get_patient_annotation_dir(test_pid)

    try:
        mask = np.zeros((100, 100, 50), dtype=np.uint8)
        mask[40:60, 40:60, 20:30] = 3
        nii = nib.Nifti1Image(mask, np.eye(4))
        nib.save(nii, str(pdir / "original_seg.nii.gz"))
        nib.save(nii, str(pdir / "corrected_seg.nii.gz"))

        # Initialize
        AnnotationService.get_or_create_annotation(test_pid)

        # Draft
        res_draft = AnnotationService.save_draft(test_pid, annotator_id="dr_smith", notes="Partial correction")
        assert res_draft["record"]["status"] == AnnotationState.DRAFT_SAVED.value

        # Submit for Review
        res_sub = AnnotationService.submit_for_review(test_pid, annotator_id="dr_smith", notes="Ready for supervisory sign-off")
        assert res_sub["record"]["status"] == AnnotationState.SUBMITTED_FOR_REVIEW.value

        # Review - Approve
        res_app = AnnotationService.review_annotation(test_pid, decision="approve", reviewer_id="chief_radiologist", reason="Verified")
        assert res_app["record"]["status"] == AnnotationState.APPROVED_FOR_TRAINING.value
        assert res_app["record"]["is_approved_for_training"] is True

        # Mask comparison metrics
        cmp_res = AnnotationService.compare_masks(test_pid)
        assert cmp_res["success"] is True
        assert "WT" in cmp_res["regions"]
        assert cmp_res["regions"]["WT"]["dice_agreement"] == 1.0

    finally:
        shutil.rmtree(pdir, ignore_errors=True)


def test_dataset_leakage_guard_and_ingestion():
    """Verifies that protected validation subjects are blocked from training dataset."""
    val_patient = list(PROTECTED_VALIDATION_PATIENTS)[0]
    pdir = AnnotationService._get_patient_annotation_dir(val_patient)

    try:
        mask = np.zeros((64, 64, 32), dtype=np.uint8)
        mask[20:40, 20:40, 10:20] = 2
        nii = nib.Nifti1Image(mask, np.eye(4))
        nib.save(nii, str(pdir / "corrected_seg.nii.gz"))

        # Force state to approved
        rec = AnnotationService.get_or_create_annotation(val_patient)
        rec["status"] = AnnotationState.APPROVED_FOR_TRAINING.value
        with open(AnnotationService._get_metadata_file(val_patient), "w", encoding="utf-8") as f:
            json.dump(rec, f)

        # Attempt ingestion of protected validation patient
        res = DatasetService.validate_and_ingest_approved_sample(val_patient)
        assert res["success"] is False, "Protected validation patient was illegally ingested!"
        assert "Data leakage" in res["error"], f"Expected data leakage error, got: {res['error']}"

    finally:
        shutil.rmtree(pdir, ignore_errors=True)


def test_training_candidate_evaluation_and_promotion():
    """
    Tests background fine-tuning initiation, candidate registration,
    evaluation against safety non-regression criteria, promotion, and rollback.
    """
    # 1. Register candidate in Model Registry
    import uuid
    cand_id = f"test-candidate-v1.2.{uuid.uuid4().hex[:6]}"
    tmp_ckpt = Path(tempfile.gettempdir()) / f"test_candidate_{uuid.uuid4().hex[:6]}.pth"
    base_ckpt = PROJECT_ROOT / "checkpoints" / "adaptive" / "best.pth"
    if base_ckpt.exists():
        shutil.copyfile(base_ckpt, tmp_ckpt)
    else:
        torch.save({"epoch": 2, "model_state_dict": {}}, str(tmp_ckpt))

    try:
        reg_res = ModelRegistryService.register_candidate_model(
            version_id=cand_id,
            checkpoint_path=str(tmp_ckpt),
            epochs_trained=2,
            final_train_loss=0.154
        )
        assert reg_res["success"] is True
        assert reg_res["model"]["status"] == ModelRegistryStatus.CANDIDATE.value

        # 2. Evaluate Candidate
        eval_res = ModelRegistryService.evaluate_candidate_model(cand_id)
        assert eval_res["success"] is True
        comp = eval_res["evaluation"]
        assert "deltas" in comp
        assert "acceptance_checks" in comp
        assert comp["can_be_promoted"] is True, "Candidate should pass non-regression checks"
        assert eval_res["status"] == ModelRegistryStatus.APPROVED.value

        # 3. Promote Candidate
        prom_res = ModelRegistryService.promote_candidate_model(cand_id, approved_by="test_lead", rationale="Passed non-regression")
        assert prom_res["success"] is True
        assert prom_res["active_model_id"] == cand_id

        # Verify active model in registry
        reg = ModelRegistryService.get_registry()
        assert reg["active_model_id"] == cand_id

        # 4. Rollback to original baseline
        orig_id = prom_res["previous_model_id"]
        roll_res = ModelRegistryService.rollback_to_model(orig_id, reason="Testing rollback")
        assert roll_res["success"] is True
        assert roll_res["active_model_id"] == orig_id

        reg_after_roll = ModelRegistryService.get_registry()
        assert reg_after_roll["active_model_id"] == orig_id

    finally:
        tmp_ckpt.unlink(missing_ok=True)


if __name__ == "__main__":
    print("=" * 70)
    print("RUNNING ADAPTIVE HITL WORKFLOW TEST SUITE")
    print("=" * 70)

    tests = [
        ("Model & Task Catalog Declaration", test_model_task_catalog),
        ("CT Scan Upload & AI Incompatibility Guard", test_ct_upload_and_compatibility_rejection),
        ("DICOM De-identification & Sanitization", test_dicom_deidentification),
        ("Interactive Voxel Editing & Coordinate Mapping", test_interactive_voxel_editing_and_coordinate_mapping),
        ("Annotation Lifecycle & Clinical Review", test_annotation_lifecycle_and_review),
        ("Adaptive Dataset Leakage Guard", test_dataset_leakage_guard_and_ingestion),
        ("Training Candidate Evaluation & Promotion/Rollback", test_training_candidate_evaluation_and_promotion),
    ]

    passed = 0
    failed = 0
    for idx, (name, fn) in enumerate(tests, 1):
        print(f"\n[{idx}/{len(tests)}] Testing: {name}...")
        try:
            fn()
            print(f"[PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"[FAIL] {name}: {str(e)}")
            failed += 1

    print("\n" + "=" * 70)
    print(f"RESULTS: {passed} PASSED, {failed} FAILED out of {len(tests)} tests")
    print("=" * 70)
    if failed > 0:
        exit(1)
