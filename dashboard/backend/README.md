# NeuroSeg 3D - Backend API

FastAPI backend service for **NeuroSeg 3D: Adaptive Self-Distillation for 3D Brain Tumor Segmentation**.

## Architecture & Responsibilities

The backend provides the API service layer supporting the medical web dashboard, organized into modular services:

```text
dashboard/backend/
├── app/
│   ├── api/
│   │   ├── routes.py          # REST endpoints (/api/health, /api/validate, /api/upload, /api/segment)
│   ├── models/                # Domain models
│   ├── schemas/
│   │   ├── segmentation.py    # Pydantic request & response validation schemas
│   ├── services/
│   │   ├── validation_service.py      # Modality checks & NIfTI extension enforcement
│   │   ├── upload_service.py          # Ephemeral file writing & auto-cleanup
│   │   ├── preprocessing_service.py   # Prepared interface for MONAI sliding-window transforms
│   │   ├── inference_service.py       # Raises HTTP 501 until model is connected
│   │   ├── postprocessing_service.py  # WT/TC/ET sub-region binarization interface
│   │   └── metrics_service.py         # Dice & HD95 ground-truth evaluator (N/A if absent)
│   ├── utils/
│   │   └── nifti_utils.py     # File security, path-traversal sanitization, temporary sessions
│   ├── __init__.py
│   └── main.py                # FastAPI entry point with CORS middleware
├── requirements.txt           # Python dependencies
└── README.md
```

## Security & Ephemeral Storage Strategy

1. **Strict File Type Enforcement:** Only `.nii` and `.nii.gz` files are accepted. Dangerous executable extensions (`.exe`, `.bat`, `.sh`, `.bin`, `.dll`, etc.) and malicious path traversals (`../`) are systematically rejected.
2. **Ephemeral Lifecycle:** Uploaded scans are written to temporary session folders (`neuroseg3d_sessions/<session_id>`) and deleted automatically upon processing completion. No clinical or patient imaging data is permanently retained on disk.

## Setup & Running

### 1. Installation

From the project root:

```bash
cd dashboard/backend
pip install -r requirements.txt
```

### 2. Development Server

Start the FastAPI server on port 8000:

```bash
uvicorn app.main:app --reload --port 8000
```

Once running:
- **Health Check:** `http://localhost:8000/api/health`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`
- **ReDoc:** `http://localhost:8000/redoc`

## Current API Endpoints

| Method | Endpoint | Description | Status |
|---|---|---|---|
| `GET` | `/api/health` | Backend status & model readiness | `200 OK` |
| `POST` | `/api/validate` | Validates file extensions & required modalities | `200 OK` |
| `POST` | `/api/upload` | Ephemeral upload of FLAIR, T1, T1ce, T2 | `200 OK` |
| `POST` | `/api/segment` | Runs 3D UNETR Adaptive inference | `501 Not Implemented` (Safety locked) |
| `GET` | `/api/results/{id}` | Retrieves computed masks & volumetric analysis | `501 Not Implemented` |

## Model Connection Roadmap

When ready to connect real inference in future milestones:
1. `services/preprocessing_service.py` connects directly to the repository's MONAI data loader pipeline.
2. `services/inference_service.py` loads weights from `checkpoints/adaptive/best.pth` and executes 96×96×96 sliding-window inference with FP16 AMP.
3. `services/postprocessing_service.py` extracts Whole Tumor (WT), Tumor Core (TC), and Enhancing Tumor (ET) volumes.
