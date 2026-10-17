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
| `GET` | `/api/patients` | Lists discovered BraTS 2021 patient volumes | `200 OK` |
| `GET` | `/api/patients/{id}` | Dimensions, voxel spacing, and volumetrics | `200 OK` |
| `GET` | `/api/volume/slice` | High-speed 2D orthogonal slice rendering with overlay | `200 OK` |
| `GET` | `/api/patients/{id}/tumor-burden` | Quantitative tumor burden, slice extents & research categorization | `200 OK` |
| `POST` | `/api/patients/{id}/predict` | Runs real Adaptive UNETR sliding-window inference | `200 OK` |
| `POST` | `/api/validate` | Validates file extensions & required modalities | `200 OK` |
| `POST` | `/api/upload` | Ephemeral upload of FLAIR, T1, T1ce, T2 | `200 OK` |
| `POST` | `/api/segment` | Runs 3D UNETR Adaptive inference for uploaded session | `200 OK` |
| `GET` | `/api/results/{id}` | Retrieves computed masks & volumetric analysis | `200 OK` |

## AI-Based Tumor Burden Assessment Service

Located in `app/services/tumor_burden_service.py` with configurable thresholds in `app/config/tumor_burden_config.json`:

- **Real NIfTI Voxel Spacing:** Extracts affine zooms ($s_x, s_y, s_z$) to compute exact physical volumes ($\text{cm}^3$ and $\text{mm}^3$) without assuming $1.0\text{ mm}^3$ isotropic spacing.
- **BraTS Label Derivation:**
  - Whole Tumor (WT): Necrotic core (1) + Edema (2) + Enhancing tumor (3 or 4)
  - Tumor Core (TC): Necrotic core (1) + Enhancing tumor (3 or 4)
  - Enhancing Tumor (ET): Active enhancing tumor (3 or 4)
- **Slice-Wise Area & Extent:** Calculates cross-sectional tumor area ($\text{cm}^2$) per slice, identifies the peak axial slice index, and calculates affected slice counts and bounding box extents in millimeters along Sagittal ($X$), Coronal ($Y$), and Axial ($Z$).
- **Relative Intracranial Burden (%):** Calculates percentage of skull-stripped intracranial brain volume occupied by the tumor when brain foreground voxels ($>0$) are available.
- **Experimental Research Category:** Configurable research thresholds (Minimal/Focal $<5\text{ cm}^3$, Moderate $5–25\text{ cm}^3$, Substantial $25–60\text{ cm}^3$, Extensive $>60\text{ cm}^3$).
- **Mandatory Non-Clinical Disclaimer:** Tumor burden categories describe volumetric spatial extent only and do NOT predict WHO tumor grade (1–4), histological malignancy, cancer staging, or patient prognosis.

