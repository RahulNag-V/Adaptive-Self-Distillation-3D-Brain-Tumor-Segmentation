"""
Pydantic schemas for NeuroSeg 3D backend API.
Reuses existing project representations without hardcoding or fabricating results.
"""
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="ok", description="Health check status")
    model: str = Field(default="Adaptive Self-Distillation", description="Associated model architecture")
    checkpoint_loaded: bool = Field(default=False, description="Whether the checkpoint was loaded into memory")
    device: str = Field(default="cpu", description="Active computation device (cuda or cpu)")
    version: str = Field(default="1.0.0", description="API version")


class ModalityFileInfo(BaseModel):
    modality: str
    filename: str
    size_bytes: int
    valid: bool
    dimensions: Optional[List[int]] = None
    spacing: Optional[List[float]] = None
    error: Optional[str] = None


class ValidationRequest(BaseModel):
    session_id: str


class ValidationResponse(BaseModel):
    is_valid: bool
    session_id: str
    modalities_found: List[str]
    missing_modalities: List[str]
    has_ground_truth: bool = False
    details: List[ModalityFileInfo] = []
    notes: List[str] = []
    modality_type: Optional[str] = "MRI"
    modality_name: Optional[str] = "Brain MRI (Multimodal)"
    is_ai_prediction_supported: bool = True
    compatible_model: Optional[str] = "unetr-adaptive-v1.0.0"
    unsupported_reason: Optional[str] = None
    dicom_metadata: Optional[Dict[str, Any]] = None


class UploadResponse(BaseModel):
    session_id: str
    message: str
    received_modalities: List[str]
    has_ground_truth: bool = False
    status: str


class SegmentationRequest(BaseModel):
    session_id: str


class RegionMetrics(BaseModel):
    voxel_count: int
    volume_mm3: float
    volume_cm3: float
    dice: Optional[float] = None
    hd95: Optional[float] = None


class SegmentationResponse(BaseModel):
    status: str = "success"
    session_id: str
    prediction_file: str
    mri_file: str
    original_shape: List[int]
    processed_shape: List[int]
    voxel_spacing: List[float]
    unique_labels: List[int]
    tumor_voxels: int
    tumor_volume_mm3: float
    tumor_volume_cm3: float
    inference_time_seconds: float
    device: str
    model: str = "Adaptive Self-Distillation (UNETR)"
    regions: Dict[str, RegionMetrics]
    ground_truth_available: bool = False
    metrics: Optional[Dict[str, Optional[float]]] = None
    note: Optional[str] = None
    model_version: Optional[str] = "1.0.0"
    uncertainty_indicators: Optional[Dict[str, Any]] = None


class ErrorDetail(BaseModel):
    detail: str
    code: str
