"""
Pydantic schemas and enums for NeuroSeg 3D Adaptive Human-in-the-Loop Workflow.
"""
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class AnnotationState(str, Enum):
    PREDICTION_GENERATED = "Prediction Generated"
    CORRECTION_IN_PROGRESS = "Correction In Progress"
    DRAFT_SAVED = "Draft Saved"
    SUBMITTED_FOR_REVIEW = "Submitted for Review"
    REVIEWED = "Reviewed"
    APPROVED_FOR_TRAINING = "Approved for Training"
    REJECTED = "Rejected"
    INCLUDED_IN_TRAINING_DATASET = "Included in Training Dataset"


class ModelRegistryStatus(str, Enum):
    ACTIVE = "Active"
    CANDIDATE = "Candidate"
    VALIDATING = "Validating"
    APPROVED = "Approved"
    REJECTED = "Rejected"
    ARCHIVED = "Archived"


class VoxelEditStroke(BaseModel):
    plane: str = Field(..., description="axial, coronal, or sagittal")
    slice_index: int = Field(..., description="Coordinate index along plane")
    label: int = Field(..., description="Target label (0 for erase, 1=NCR, 2=ED, 3=ET)")
    brush_radius: int = Field(default=3, ge=1, le=50, description="Brush radius in pixels")
    points: List[List[int]] = Field(..., description="List of [x, y] coordinates on the 2D slice")


class VoxelEditRequest(BaseModel):
    patient_id: str
    seg_source: str = "prediction"
    strokes: List[VoxelEditStroke]
    action_type: str = "paint"  # paint, erase, clear_all


class SaveDraftRequest(BaseModel):
    patient_id: str
    annotator_id: str = "radiologist_user"
    notes: Optional[str] = None


class SubmitCorrectionRequest(BaseModel):
    patient_id: str
    annotator_id: str = "radiologist_user"
    notes: Optional[str] = None


class ReviewDecisionRequest(BaseModel):
    decision: str = Field(..., description="'approve' or 'reject'")
    reviewer_id: str = Field(default="senior_neuro_radiologist")
    reason: Optional[str] = Field(default=None, description="Clinical feedback or reason for rejection/approval")


class TrainingTriggerRequest(BaseModel):
    epochs: int = Field(default=2, ge=1, le=100)
    learning_rate: float = Field(default=0.0001, gt=0)
    candidate_tag: Optional[str] = Field(default=None, description="Optional custom candidate identifier")
    notes: Optional[str] = None


class PromotionRequest(BaseModel):
    candidate_id: str
    approved_by: str = "lead_ml_engineer"
    rationale: str = "Met validation non-regression and performance criteria"


class RollbackRequest(BaseModel):
    target_model_id: str
    reason: str = "Rollback requested by authorized operator"
