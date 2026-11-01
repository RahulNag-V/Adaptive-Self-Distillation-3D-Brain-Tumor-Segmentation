# Local Setup & Execution Guide
## NeuroVision AI: Adaptive Self-Distillation Framework for 3D Brain Tumor Segmentation

This guide provides end-to-end, copy-paste-ready instructions for downloading, configuring, and running the **NeuroVision AI: Adaptive Self-Distillation Framework for 3D Brain Tumor Segmentation** on a local Windows 10/11 machine.

---

## Table of Contents
- [A. Project Overview](#a-project-overview)
- [B. Prerequisites](#b-prerequisites)
- [C. Download the Project from GitHub](#c-download-the-project-from-github)
- [D. Configure the Environment](#d-configure-the-environment)
  - [1. Python Virtual Environment (.venv)](#1-python-virtual-environment-venv)
  - [2. Frontend Environment & Dependencies](#2-frontend-environment--dependencies)
  - [3. Environment Variables Configuration](#3-environment-variables-configuration)
- [E. Run the Application on Localhost](#e-run-the-application-on-localhost)
  - [Terminal 1: FastAPI Backend (Port 8000)](#terminal-1-fastapi-backend-port-8000)
  - [Terminal 2: React Vite Frontend (Port 3000)](#terminal-2-react-vite-frontend-port-3000)
  - [Accessing the Application](#accessing-the-application)
  - [Shutting Down Services](#shutting-down-services)
- [F. Dataset and Model Setup](#f-dataset-and-model-setup)
- [G. Verification Checklist](#g-verification-checklist)
- [H. Troubleshooting](#h-troubleshooting)
- [I. Updating the Project](#i-updating-the-project)
- [J. Quick Start (Under 2 Minutes)](#j-quick-start-under-2-minutes)

---

## A. Project Overview

**NeuroVision AI** is an advanced medical AI platform for 3D multi-parametric Brain Tumor Segmentation (BraTS) powered by an **Adaptive Self-Distillation** framework. It bridges deep learning inference with clinical human-in-the-loop (HITL) active learning and interactive visualization.

### Key Capabilities
- **Adaptive Self-Distillation Framework**: Student-teacher model distillation architecture with UNETR / SwinUNETR backbones for 3D volumetric segmentation.
- **Three-Orthogonal Multi-Planar Reconstruction (MPR)**: Real-time Axial, Coronal, and Sagittal slice rendering from 3D NIfTI volumes (`flair`, `t1`, `t1ce`, `t2`) with RAS orientation normalization.
- **Sub-Region Segmentation Masks**: Real-time overlays for Whole Tumor (**WT**), Tumor Core (**TC**), and Enhancing Tumor (**ET**).
- **Volumetrics & Tumor Burden**: Automated calculations of tumor volumes ($cm^3$), peak slice detection, and relative intracranial tumor burden percentages.
- **Interactive HITL & Annotation Hub**: Voxel refinement tools, clinical review lifecycle, DICOM de-identification, and training candidate promotion.
- **Hands-Free Voice Control**: Voice command parser using the Web Speech API for modal switching, slice scrolling, and view manipulation.

### Architecture & Localhost Services

| Component | Framework / Technology | Local Directory | Localhost Port | Verified Local URL |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend UI** | React 18, Vite 6, Tailwind CSS, VTK.js | `dashboard/frontend` | `3000` | [http://localhost:3000](http://localhost:3000) |
| **Backend API** | FastAPI, Uvicorn, Pydantic v2 | `dashboard/backend` | `8000` | [http://127.0.0.1:8000](http://127.0.0.1:8000) |
| **API Documentation** | Swagger UI (FastAPI OpenAPI) | `dashboard/backend` | `8000` | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) |
| **API Health Check** | FastAPI JSON endpoint | `dashboard/backend` | `8000` | [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health) |

---

## B. Prerequisites

Ensure your system meets the following requirements before setting up the project.

### 1. Mandatory Software

1. **Git for Windows (v2.30 or newer)**
   - Download: [https://git-scm.com/download/win](https://git-scm.com/download/win)
   - Verify installation in PowerShell:
     ```powershell
     git --version
     ```
2. **Python 3.11 (Recommended: Python 3.11.9)**
   - Download: [https://www.python.org/downloads/release/python-3119/](https://www.python.org/downloads/release/python-3119/)
   - *Important*: During Windows installation, check the box **"Add python.exe to PATH"**.
   - Verify installation in PowerShell:
     ```powershell
     python --version
     ```
     *(Should output `Python 3.11.x`. Python 3.10 is also supported. Avoid Python 3.12+ as some PyTorch / MONAI C-extensions may not have pre-built wheels on Windows).*
3. **Node.js (v18.x, v20.x, or v24.x LTS) & npm**
   - Download: [https://nodejs.org/](https://nodejs.org/) (LTS recommended)
   - Verify installation in PowerShell:
     ```powershell
     node -v
     npm -v
     ```

### 2. Optional Software & Hardware

- **Code Editor**: [Visual Studio Code](https://code.visualstudio.com/) with the Python and ES7+ React extensions.
- **NVIDIA GPU & CUDA 11.8 / 12.x (Optional)**:
  - If an NVIDIA GPU with CUDA support is detected, PyTorch will run sliding-window 3D inference on the GPU (`cuda`).
  - If no GPU is detected, the backend **automatically falls back to CPU mode** (`cpu`) without failing.
- **Hardware Specifications**:
  - *Minimum*: 8 GB RAM (16 GB recommended for handling 3D NIfTI medical volumes), 4-core CPU, 10 GB free disk space.
  - *With Full BraTS Dataset*: At least 50 GB of free SSD storage.

---

## C. Download the Project from GitHub

Open **PowerShell** and execute the following commands to download and verify the repository.

### 1. Clone the Repository
```powershell
git clone https://github.com/RahulNag-V/Adaptive-Self-Distillation-3D-Brain-Tumor-Segmentation.git
```

### 2. Enter the Project Directory
```powershell
cd Adaptive-Self-Distillation-3D-Brain-Tumor-Segmentation
```

### 3. Verify Branch
Confirm you are on the `main` branch:
```powershell
git branch
```
*(If you are not on `main`, run `git checkout main`)*

### 4. For Existing Clones: Pull Latest Changes
If you had previously cloned the repository, ensure your local copy is completely up to date:
```powershell
git pull origin main
```

---

## D. Configure the Environment

The project has two distinct layers:
1. **Python Virtual Environment** for Deep Learning, MONAI, and the FastAPI backend.
2. **Node.js Environment** for the React Vite frontend dashboard.

Follow the instructions below to configure both layers.

### 1. Python Virtual Environment (.venv)

From the project root directory (`Adaptive-Self-Distillation-3D-Brain-Tumor-Segmentation`):

#### Step 1.1: Create the Virtual Environment
```powershell
python -m venv .venv
```

#### Step 1.2: Enable PowerShell Script Execution & Activate
If PowerShell reports that running scripts is disabled on your system, allow the current process:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```
*(Once activated, you will see `(.venv)` at the beginning of your PowerShell prompt).*

#### Step 1.3: Upgrade pip
```powershell
python -m pip install --upgrade pip
```

#### Step 1.4: Install Python Dependencies
Install the medical deep learning packages and the backend API dependencies:
```powershell
# 1. Install medical deep learning stack (PyTorch, MONAI, NiBabel, NumPy, SciPy)
pip install -r requirements.txt

# 2. Install FastAPI backend dependencies
pip install -r dashboard/backend/requirements.txt
```

> [!NOTE]
> For executing the automated backend test suite, you can optionally install `httpx` and `pytest`:
> ```powershell
> pip install httpx pytest
> ```

---

### 2. Frontend Environment & Dependencies

Open the frontend directory and install the required npm packages:

```powershell
cd dashboard\frontend
npm install
```

Return to the project root:
```powershell
cd ..\..
```

---

### 3. Environment Variables Configuration

The frontend uses Vite environment variables to communicate with the FastAPI backend.

#### Step 3.1: Copy Environment Template
In PowerShell, create the `.env` file from `.env.example`:
```powershell
Copy-Item dashboard\frontend\.env.example dashboard\frontend\.env
```

#### Step 3.2: Verify `.env` Content
Open `dashboard\frontend\.env` in an editor or inspect it in PowerShell:
```powershell
Get-Content dashboard\frontend\.env
```
Expected content:
```ini
VITE_API_BASE_URL=http://localhost:8000
```

#### Environment Variable Reference

| Variable Name | Default Value | Description |
| :--- | :--- | :--- |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Points the frontend API client (`dashboard/frontend/src/api/client.js`) to the local FastAPI backend. |

---

## E. Run the Application on Localhost

Running the application requires **two separate PowerShell terminals**:
- **Terminal 1**: Runs the FastAPI backend server on port `8000`.
- **Terminal 2**: Runs the React Vite development server on port `3000`.

---

### Terminal 1: FastAPI Backend (Port 8000)

1. Open a new PowerShell window.
2. Navigate to the `dashboard\backend` directory:
   ```powershell
   cd Adaptive-Self-Distillation-3D-Brain-Tumor-Segmentation\dashboard\backend
   ```
3. Activate the virtual environment:
   ```powershell
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   ..\..\.venv\Scripts\Activate.ps1
   ```
4. Start the Uvicorn server:
   ```powershell
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

#### Expected Startup Console Output
```text
============================================================
Model:       Adaptive Self-Distillation
Checkpoint:  D:\Project\Adaptive-Self-Distillation-3D-Brain-Tumor-Segmentation\checkpoints\adaptive\best.pth
Device:      cuda (or cpu)
============================================================

INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [XXXXX] using WatchFiles
INFO:     Started server process [XXXXX]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

- **Backend Base URL**: `http://127.0.0.1:8000`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **Health Check Endpoint**: `http://127.0.0.1:8000/api/health`

---

### Terminal 2: React Vite Frontend (Port 3000)

1. Open a second PowerShell window.
2. Navigate to the `dashboard\frontend` directory:
   ```powershell
   cd Adaptive-Self-Distillation-3D-Brain-Tumor-Segmentation\dashboard\frontend
   ```
3. Start the Vite development server:
   ```powershell
   npm run dev -- --host 127.0.0.1 --port 3000
   ```

#### Expected Startup Console Output
```text
  VITE v6.4.4  ready in 274 ms

  ➜  Local:   http://127.0.0.1:3000/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

- **Frontend Application URL**: `http://localhost:3000` or `http://127.0.0.1:3000`

---

### Accessing the Application

1. Open your web browser (Google Chrome, Microsoft Edge, or Firefox).
2. Navigate to:
   ```
   http://localhost:3000
   ```
3. You will be greeted by the **NeuroVision AI** interface, including the top navigation bar, 3D multi-planar viewer, patient sequence selector, and tumor burden panel.

---

### Shutting Down Services

To stop either service cleanly:
1. In the respective terminal window, press:
   ```powershell
   Ctrl + C
   ```
2. If PowerShell displays `Terminate batch job (Y/N)?`, type `Y` and press Enter.

---

## F. Dataset and Model Setup

### 1. Medical Imaging Formats & Expected Modalities
The framework processes 3D multi-parametric MRI (mpMRI) scans stored in the NIfTI format (`.nii` or `.nii.gz`). Each patient case typically includes four co-registered sequences and a ground truth segmentation mask:

| Modality Key | File Suffix | Description |
| :--- | :--- | :--- |
| `FLAIR` | `*_flair.nii.gz` | Fluid-Attenuated Inversion Recovery (highlights peritumoral edema) |
| `T1` | `*_t1.nii.gz` | T1-weighted native image |
| `T1CE` | `*_t1ce.nii.gz` | T1-weighted contrast-enhanced with Gadolinium (highlights active tumor) |
| `T2` | `*_t2.nii.gz` | T2-weighted structural image |
| `SEG` | `*_seg.nii.gz` | Multi-class ground truth segmentation mask |

### 2. BraTS Segmentation Labels
- **Label 0**: Background (healthy tissue / air).
- **Label 1**: Necrotic and non-enhancing tumor core (NCR/NET).
- **Label 2**: Peritumoral edema (ED).
- **Label 4**: GD-enhancing tumor (ET).

The application groups these labels into standard clinical evaluation sub-regions:
- **Whole Tumor (WT)**: Labels 1 + 2 + 4
- **Tumor Core (TC)**: Labels 1 + 4
- **Enhancing Tumor (ET)**: Label 4

---

### 3. Repository Data Organization

```text
Adaptive-Self-Distillation-3D-Brain-Tumor-Segmentation/
├── checkpoints/
│   └── adaptive/
│       └── best.pth                       <-- Primary model checkpoint (~1.79 GB)
├── data/
│   ├── raw/
│   │   └── BraTS2021/
│   │       └── BraTS2021_Training_Data/   <-- Patient folders (e.g., BraTS2021_01017)
│   └── splits/
│       ├── train.txt                      <-- 40 training subject IDs
│       └── val.txt                        <-- 10 validation subject IDs
└── dashboard/
    └── backend/
        └── runtime/
            └── sessions/                  <-- Pre-packaged sample patient sessions
```

> [!IMPORTANT]
> **Checkpoints and Raw Data in Git**:
> Large binary model checkpoints (`*.pth`) and raw MRI NIfTI scans (`*.nii.gz`) exceed standard GitHub file size limits and are intentionally excluded via `.gitignore`.
>
> - **Pre-Packaged Sample Sessions**: The repository includes pre-configured session metadata in `dashboard/backend/runtime/sessions/` (including `BraTS2021_01017` and `BraTS2021_01069`).
> - **Graceful Startup**: If `checkpoints/adaptive/best.pth` is missing, the backend continues to function gracefully. The health check will indicate `checkpoint_loaded: false`, allowing you to inspect sessions, upload new scans, and explore the UI.

### 4. How to Add Your Own Data or Checkpoints
1. **Acquire BraTS 2021 Data**: Download the BraTS 2021 dataset from the official [Synapse BraTS Challenge portal](https://www.synapse.org/#!Synapse:syn27049766/wiki/619865).
2. **Place Patient Folders**: Place the patient directories inside:
   ```
   data/raw/BraTS2021/BraTS2021_Training_Data/
   ```
3. **Add Model Weights**: If you have trained or downloaded the model weights, place `best.pth` at:
   ```
   checkpoints/adaptive/best.pth
   ```
4. **Direct Web UI Upload**: Alternatively, navigate to the **Upload** page in the web frontend (`http://localhost:3000`) and drag-and-drop your `.nii.gz` or DICOM files directly into the browser.

---

## G. Verification Checklist

Follow this checklist to confirm that your local environment is running properly:

### 1. Backend Verification
- [ ] Open [http://127.0.0.1:8000/](http://127.0.0.1:8000/) in your browser.
  - Expected JSON:
    ```json
    {
      "name": "NeuroSeg 3D API",
      "status": "online",
      "model_ready": true,
      "health_check": "/api/health",
      "docs": "/docs"
    }
    ```
- [ ] Open [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health) in your browser.
  - Expected JSON:
    ```json
    {
      "status": "ok",
      "model": "Adaptive Self-Distillation",
      "checkpoint_loaded": true,
      "device": "cuda",
      "version": "1.0.0"
    }
    ```
- [ ] Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) to verify all OpenAPI endpoints are accessible.

### 2. Frontend UI Verification
- [ ] Open [http://localhost:3000](http://localhost:3000).
- [ ] Confirm the header displays the **NeuroVision AI** brand, status pill (`API: Connected`), and navigation links.
- [ ] In the **Viewer** page, verify that the 3 orthogonal slice windows (Axial, Coronal, Sagittal) load cleanly.
- [ ] Click on the **Patient Selector** dropdown and select `BraTS2021_01017` or `BraTS2021_01069`.
- [ ] Switch active sequences (**FLAIR**, **T1**, **T1CE**, **T2**) and verify the slice images update smoothly.
- [ ] Toggle tumor segmentation sub-regions (**WT**, **TC**, **ET**) to view colored tumor overlays.
- [ ] Verify the **Tumor Burden Panel** displays metrics for volume ($cm^3$), slice area, and peak slices.

### 3. Automated Tests

#### Run Frontend Voice Control Unit Tests (113 Tests)
```powershell
cd dashboard\frontend
node src\services\voiceCommandParser.test.js
```
*Expected Result*: `TOTAL TESTS: 113 | PASSED: 113 | FAILED: 0 ✅ ALL TESTS PASSED`

#### Run Frontend Production Build Check
```powershell
cd dashboard\frontend
npm run build
```
*Expected Result*: `✓ built in X.XXs` with 0 syntax or bundling errors.

#### Run Backend API & MPR Test Suite
```powershell
cd dashboard\backend
..\..\.venv\Scripts\python.exe tests\run_tests.py
```
*Expected Result*: Runs 25 comprehensive backend tests, verifying patient discovery, RAS affine orientation, slice extraction, coordinate clamping, and tumor burden math.

---

## H. Troubleshooting

### 1. PowerShell Execution Policy Error
**Symptom**:
```text
File C:\...\Activate.ps1 cannot be loaded because running scripts is disabled on this system.
```
**Solution**:
Run this command in your PowerShell terminal to allow script execution for your current session:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```
Then rerun `.\.venv\Scripts\Activate.ps1`.

---

### 2. Python Command Not Recognized
**Symptom**:
```text
'python' is not recognized as an internal or external command, operable program or batch file.
```
**Solution**:
- Ensure Python was installed with **"Add python.exe to PATH"** selected.
- Alternatively, try running `py`:
  ```powershell
  py -3.11 -m venv .venv
  ```
- Or invoke your Python interpreter directly by full path:
  ```powershell
  & "C:\Users\$env:USERNAME\AppData\Local\Programs\Python\Python311\python.exe" -m venv .venv
  ```

---

### 3. Port 8000 or Port 3000 Already in Use
**Symptom**:
```text
ERROR: [Errno 10048] error while attempting to bind on address ('127.0.0.1', 8000): only one usage of each socket address is normally permitted
```
**Solution**:
Identify and terminate the process occupying the port:
```powershell
# Check what is using port 8000 or 3000
Get-NetTCPConnection -LocalPort 8000, 3000 -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, OwningProcess

# Stop the conflicting process by its PID
Stop-Process -Id <OwningProcessPID> -Force
```
Alternatively, specify a different port when launching:
- For Backend: `uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload`
- For Frontend: `npm run dev -- --host 127.0.0.1 --port 3001`
*(Note: If you change the backend port to 8001, update `VITE_API_BASE_URL=http://localhost:8001` in `dashboard/frontend/.env`)*.

---

### 4. CORS Errors in Browser Console
**Symptom**:
```text
Access to fetch at 'http://127.0.0.1:8000/api/...' has been blocked by CORS policy.
```
**Solution**:
1. Confirm that `dashboard/backend/app/main.py` has CORS origins configured for `http://localhost:3000` and `http://127.0.0.1:3000` (already configured by default).
2. Check that `dashboard/frontend/.env` contains `VITE_API_BASE_URL=http://localhost:8000`.
3. Restart the frontend development server (`npm run dev`) so Vite reloads the `.env` file.

---

### 5. Missing Checkpoint (`best.pth`) Warning
**Symptom**:
The backend console displays:
```text
Model loaded: NO (Checkpoint file missing)
```
**Explanation & Solution**:
This is expected if you just cloned the repository without downloading the ~1.79 GB model weights. The backend does not crash; it allows full inspection of MRI volumes, patient discovery, and tumor burden calculation on existing ground truth annotations. To enable full deep learning inference, place `best.pth` inside `checkpoints/adaptive/`.

---

### 6. CUDA Out-of-Memory (OOM) on GPU
**Symptom**:
```text
torch.cuda.OutOfMemoryError: CUDA out of memory.
```
**Solution**:
The application automatically defaults to CPU if CUDA is unavailable. If your GPU runs out of VRAM during large sliding-window inference:
- The inference service uses sliding window inference with `roi_size=(96, 96, 96)` and `sw_batch_size=1` to minimize VRAM usage.
- You can force CPU execution by passing `force_device="cpu"` to `InferenceService.initialize()` in `dashboard/backend/app/main.py`.

---

## I. Updating the Project

To fetch future updates and improvements from the GitHub repository without losing your local configuration:

### 1. Stash or Commit Local Changes
```powershell
git status
git stash
```

### 2. Pull the Latest Code
```powershell
git checkout main
git pull origin main
```

### 3. Restore Local Modifications (Optional)
```powershell
git stash pop
```

### 4. Re-synchronize Dependencies
If dependencies were updated in `requirements.txt` or `package.json`:
```powershell
# Python
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install -r dashboard/backend/requirements.txt

# Frontend
cd dashboard\frontend
npm install
cd ..\..
```

### 5. Restart Services
Restart Terminal 1 (Backend) and Terminal 2 (Frontend) to run the latest application version.

---

## J. Quick Start (Under 2 Minutes)

For developers with Python 3.11, Node.js, and Git already installed:

```powershell
# 1. Clone repository and navigate inside
git clone https://github.com/RahulNag-V/Adaptive-Self-Distillation-3D-Brain-Tumor-Segmentation.git
cd Adaptive-Self-Distillation-3D-Brain-Tumor-Segmentation

# 2. Configure Python environment (.venv)
python -m venv .venv
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install -r dashboard/backend/requirements.txt

# 3. Configure Frontend environment
cd dashboard\frontend
npm install
Copy-Item .env.example .env
cd ..\..
```

### Launch Services:

**Terminal 1 (Backend):**
```powershell
cd dashboard\backend
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
..\..\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 (Frontend):**
```powershell
cd dashboard\frontend
npm run dev -- --host 127.0.0.1 --port 3000
```

**Open in Browser:**
👉 [http://localhost:3000](http://localhost:3000)

