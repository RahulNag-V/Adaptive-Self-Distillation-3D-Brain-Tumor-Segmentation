"""
REST API Router for NeuroSeg 3D Adaptive Human-in-the-Loop Workflow.
Exposes endpoints for interactive voxel editing, versioned annotations, review & approval,
dataset management, background fine-tuning, candidate evaluation, safe promotion, and rollback.
"""
from pathlib import Path
import json
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, status, Query, Body

from app.schemas.adaptive import (
    VoxelEditRequest,
    SaveDraftRequest,
    SubmitCorrectionRequest,
    ReviewDecisionRequest,
    TrainingTriggerRequest,
    PromotionRequest,
    RollbackRequest
)
from app.services.annotation_service import AnnotationService
from app.services.dataset_service import DatasetService
from app.services.training_service import TrainingService
from app.services.model_registry_service import ModelRegistryService
from app.utils.nifti_utils import sanitize_filename

router = APIRouter(prefix="/api/adaptive", tags=["Adaptive HITL"])
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
CONFIG_FILE = BACKEND_DIR / "app" / "config" / "adaptive_config.json"


@router.get("/catalog")
async def get_models_and_tasks_catalog():
    """
    Returns declared capabilities for all supported modalities and tasks:
    Declares whether AI inference is supported (e.g. Multimodal Brain MRI vs CT),
    input channels, output labels, checkpoint versions, validation metrics, and limitations.
    """
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            cfg = json.load(f)
    else:
        cfg = {}

    registry = ModelRegistryService.get_registry()
    active_model_id = registry.get("active_model_id")
    active_model = next((m for m in registry.get("models", []) if m["model_id"] == active_model_id), None)

    return {
        "success": True,
        "supported_modalities_and_tasks": cfg.get("supported_modalities_and_tasks", {}),
        "active_model": active_model,
        "promotion_criteria": cfg.get("promotion_criteria", {})
    }


@router.get("/annotations")
async def list_annotations():
    """Lists all tracked human-in-the-loop annotations across all patients."""
    items = AnnotationService.list_all_annotations()
    return {"annotations": items, "total": len(items)}


@router.get("/annotations/{patient_id}")
async def get_patient_annotation(patient_id: str, seg_source: str = Query("prediction")):
    """Retrieves or initializes the versioned annotation record for a patient."""
    clean_id = sanitize_filename(patient_id)
    record = AnnotationService.get_or_create_annotation(clean_id, seg_source=seg_source)
    return record


@router.post("/annotations/{patient_id}/edit")
async def apply_voxel_edits(patient_id: str, payload: VoxelEditRequest):
    """
    Applies interactive 2D brush or eraser strokes directly to the 3D NIfTI segmentation mask.
    Synchronizes 3D coordinates immediately.
    """
    clean_id = sanitize_filename(patient_id)
    try:
        res = AnnotationService.apply_voxel_strokes(
            clean_id,
            strokes=payload.strokes,
            action_type=payload.action_type
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/annotations/{patient_id}/undo")
async def undo_annotation_edit(patient_id: str):
    """Reverts the last paint/erase stroke from the undo stack."""
    clean_id = sanitize_filename(patient_id)
    res = AnnotationService.undo_last_edit(clean_id)
    if not res.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res.get("error"))
    return res


@router.post("/annotations/{patient_id}/redo")
async def redo_annotation_edit(patient_id: str):
    """Re-applies the last undone paint/erase stroke."""
    clean_id = sanitize_filename(patient_id)
    res = AnnotationService.redo_last_edit(clean_id)
    if not res.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res.get("error"))
    return res


@router.post("/annotations/{patient_id}/clear")
async def clear_all_annotation_edits(patient_id: str):
    """Clears all human edits and resets the mask back to the original unmodified prediction."""
    clean_id = sanitize_filename(patient_id)
    return AnnotationService.clear_all_edits(clean_id)


@router.post("/annotations/{patient_id}/draft")
async def save_annotation_draft(patient_id: str, payload: SaveDraftRequest):
    """Saves the current corrected segmentation as an in-progress draft."""
    clean_id = sanitize_filename(patient_id)
    return AnnotationService.save_draft(clean_id, annotator_id=payload.annotator_id, notes=payload.notes)


@router.post("/annotations/{patient_id}/submit")
async def submit_annotation_for_review(patient_id: str, payload: SubmitCorrectionRequest):
    """Submits the human correction into the supervisory clinical review queue."""
    clean_id = sanitize_filename(patient_id)
    return AnnotationService.submit_for_review(clean_id, annotator_id=payload.annotator_id, notes=payload.notes)


@router.post("/annotations/{patient_id}/review")
async def review_annotation_decision(patient_id: str, payload: ReviewDecisionRequest):
    """
    Executes a formal review decision ('approve' or 'reject').
    If approved, transitions to 'Approved for Training' so dataset ingestion can accept it.
    """
    clean_id = sanitize_filename(patient_id)
    return AnnotationService.review_annotation(
        clean_id,
        decision=payload.decision,
        reviewer_id=payload.reviewer_id,
        reason=payload.reason
    )


@router.get("/annotations/{patient_id}/compare")
async def compare_annotation_masks(patient_id: str):
    """Compares original AI prediction vs corrected human segmentation (Dice overlap, volume displacement)."""
    clean_id = sanitize_filename(patient_id)
    res = AnnotationService.compare_masks(clean_id)
    if not res.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res.get("error"))
    return res


@router.get("/dataset/stats")
async def get_dataset_statistics():
    """Returns dataset sample counts, approval queue status, and train/val/test split distribution."""
    return DatasetService.get_dataset_stats()


@router.post("/dataset/ingest-approved")
async def ingest_approved_samples():
    """Ingests all currently approved human annotations into the adaptive training dataset."""
    return DatasetService.ingest_all_approved_samples()


@router.get("/training/status")
async def get_training_status():
    """Returns status, progress percentage, and loss history for the active fine-tuning background job."""
    return TrainingService.get_current_status()


@router.post("/training/start")
async def start_training_job(payload: TrainingTriggerRequest):
    """Launches an asynchronous fine-tuning job in a background thread."""
    res = TrainingService.start_training_job(
        epochs=payload.epochs,
        learning_rate=payload.learning_rate,
        candidate_tag=payload.candidate_tag,
        notes=payload.notes
    )
    if not res.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res.get("error"))
    return res


@router.get("/models/registry")
async def get_models_registry():
    """Returns the complete model registry with active, candidate, approved, and archived models."""
    return ModelRegistryService.get_registry()


@router.post("/models/{candidate_id}/evaluate")
async def evaluate_candidate(candidate_id: str):
    """Evaluates a candidate model on the fixed validation cohort and applies safety non-regression criteria."""
    clean_id = sanitize_filename(candidate_id)
    res = ModelRegistryService.evaluate_candidate_model(clean_id)
    if not res.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res.get("error"))
    return res


@router.post("/models/{candidate_id}/promote")
async def promote_candidate(candidate_id: str, payload: PromotionRequest):
    """
    Promotes an approved candidate model to Active production status.
    Switches live inference model pointer to the new checkpoint.
    """
    clean_id = sanitize_filename(candidate_id)
    res = ModelRegistryService.promote_candidate_model(
        clean_id,
        approved_by=payload.approved_by,
        rationale=payload.rationale
    )
    if not res.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res.get("error"))
    return res


@router.post("/models/rollback")
async def rollback_model(payload: RollbackRequest):
    """Safely rolls back the active production model to any previous approved or archived checkpoint."""
    clean_id = sanitize_filename(payload.target_model_id)
    res = ModelRegistryService.rollback_to_model(clean_id, reason=payload.reason)
    if not res.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res.get("error"))
    return res


@router.post("/demo/seed-sample")
async def seed_demo_approved_sample():
    """
    Convenience endpoint for testing: seeds a verified training subject (BraTS2021_01017)
    with a clinical correction, approves it, and ingests it into the adaptive training split.
    """
    patient_id = "BraTS2021_01017"
    record = AnnotationService.get_or_create_annotation(patient_id, seg_source="ground_truth")
    AnnotationService.review_annotation(
        patient_id=patient_id,
        decision="approve",
        reviewer_id="supervisory_neuro_radiologist",
        reason="Verified expert contour refinement of necrotic core and edema boundaries for adaptive training."
    )
    ingest_res = DatasetService.validate_and_ingest_approved_sample(patient_id)
    return {
        "success": True,
        "patient_id": patient_id,
        "message": f"Sample {patient_id} approved and ingested into adaptive training split successfully.",
        "ingest_result": ingest_res
    }

