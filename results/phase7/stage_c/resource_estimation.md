# NEUROVISION AI — PHASE 7: STAGE C
## Computational Resource Estimation & Hardware Budget Analysis

**Document Version:** 2.0 (Pre-Execution Audit Revision)  
**Author:** Senior Medical AI Research Scientist & ML Systems Engineer  
**Target Hardware:** NVIDIA RTX A1000 Laptop GPU (6,144 MB GDDR6 VRAM, Ampere Architecture)  
**Host System:** 13th Gen Intel Core i7 / AMD Ryzen, 32 GB System RAM, Windows 11  
**Project Workspace:** `d:\Project\Adaptive-Self-Distillation-3D-Brain-Tumor-Segmentation`  
**Status:** **ENGINEERING ESTIMATES (AWAITING MEASURED TEST BENCHMARKING)**

---

## 1. Executive Summary & Feasibility Declaration

The resource requirements for Phase 7 Stage C have been modeled based on preliminary benchmarks from Stages B and B.1.

> [!WARNING]
> **Measurement Notice & Memory Advisory:**
> All latency, VRAM, RAM, and thermal figures presented below are **engineering estimates based on preliminary runs** and will be empirically measured and logged during formal execution.
> **No guarantee of zero Out-Of-Memory (OOM) risk can be made** for complex 3D Vision Transformer workloads due to non-linear driver overhead, CUDA workspace caching, and dynamic memory fragmentation. Strict execution safeguards (sequential patch evaluation, batch size 1, and periodic cache clearing) are enforced to mitigate memory pressure.

---

## 2. Zero-Retraining Inference & Calibration Resource Estimates (Primary Pathway)

### 2.1 Model Static Memory Footprint (Estimate)
- **Active Parameters:** $102,240,836$ Float32 parameters.
- **Estimated Weight Footprint:** $102,240,836 \times 4 \text{ bytes} \approx 408.96 \text{ MB}$.
- **Estimated PyTorch / CUDA Runtime Overhead:** $\approx 450 - 500 \text{ MB}$.
- **Estimated Base Loaded Footprint:** $\approx 860 - 910 \text{ MB}$.

### 2.2 Dynamic Inference Memory Budget (Estimate)
- **Volume Dimensions:** $240 \times 240 \times 155$ voxels across 4 MRI modalities (T1, T1ce, T2, FLAIR).
- **Sliding-Window Patch Size:** $96 \times 96 \times 96$ voxels.
- **Overlap:** $0.50$ (spatial step size $48$ voxels).
- **Sliding-Window Batch Size:** $1$ (strictly sequential patch processing).
- **Mode:** `gaussian` importance blending.
- **Estimated Peak Dynamic Activation VRAM:** $\approx 850 - 950 \text{ MB}$.
- **Estimated Peak Combined GPU VRAM:** $\mathbf{\approx 1,750 - 1,850 \text{ MB}}$ ($\approx 28.5\% - 30.1\%$ of available 6,144 MB VRAM).
- **Nominal Theoretical Headroom:** $\approx 4,290 \text{ MB}$ ($\approx 70\%$).

### 2.3 Host System Memory (RAM) Allocation (Estimate)
- **Raw Multi-Parametric MRI Volume (Float32):** $240 \times 240 \times 155 \times 4 \times 4 \text{ bytes} \approx 142.8 \text{ MB}$.
- **4-Class Probability Tensor (Float32):** $4 \times 240 \times 240 \times 155 \times 4 \text{ bytes} \approx 142.8 \text{ MB}$.
- **Ground Truth Mask (Int16):** $240 \times 240 \times 155 \times 2 \text{ bytes} \approx 17.8 \text{ MB}$.
- **NumPy / SciPy Processing Arrays:** $\approx 1.0 - 1.5 \text{ GB}$.
- **Estimated Peak Process RAM:** $\mathbf{\approx 4.0 - 4.5 \text{ GB}}$ (within the host 32 GB RAM).

### 2.4 Estimated Wall-Clock Latency Profile
*Estimates derived from average execution logs of prior exploratory runs on this workstation:*

| Task Phase | Unit Scope | Estimated Per-Unit Time | Estimated Total Phase Time |
| :--- | :--- | :--- | :--- |
| **Calibration Inference** | 5 Patients | ~3.8 - 4.2 s | ~19 - 21 seconds |
| **Grid Search Sweep** | 9 Candidate Thresholds ($\Delta \tau = 0.05$) | ~0.15 s | ~1.35 seconds |
| **Objective Score Calculation** | $J(\tau)$ across 9 candidates | < 0.01 s | ~0.05 seconds |
| **Locked Test Inference (Arm 1 Baseline)** | 5 Patients | ~3.8 - 4.2 s | ~19 - 21 seconds |
| **Locked Test Inference (Arm 2 Adaptive)** | 5 Patients | ~3.8 - 4.2 s | ~19 - 21 seconds |
| **Locked Test Inference (Arm 3 Calibrated)** | 5 Patients (Reusing Arm 2 Probs) | ~0.7 s | ~3.5 seconds |
| **Statistical Analysis & Reporting** | Paired tests + Bootstrap CI | ~1.5 s | ~1.5 seconds |
| **ESTIMATED TOTAL RUNTIME** | — | — | **~65 - 75 seconds (~1.1 - 1.25 min)** |

---

## 3. Storage Footprint Estimates

All output artifacts are directed to `results/phase7/stage_c/`:
- **Compressed Probability Cache (Calibration Patients):** $\approx 90 - 100 \text{ MB}$ (`.npz` format).
- **Tabular Metric CSV Files:** $\approx 150 \text{ KB}$.
- **Statistical Output JSON:** $\approx 25 \text{ KB}$.
- **Orthogonal Slice PNG Visualizations:** $\approx 10 - 15 \text{ MB}$.
- **Estimated Total Disk Usage:** $\mathbf{\approx 100 - 115 \text{ MB}}$.

---

## 4. Contingency Retraining Budget (Theoretical Planning Estimate)

> [!NOTE]
> The following resource estimates are provided for **forward-planning purposes only**. No retraining will occur automatically upon calibration failure; retraining requires a separate, dedicated proposal and explicit human approval.

### 4.1 Theoretical Retraining Track A (Asymmetric Focal Loss Fine-Tuning)
- **Trainable Parameters:** Decoder & heads only ($\approx 14.2\text{M}$ parameters; encoder frozen).
- **Training Cohort:** $N = 40$ patients from `data/splits/train.txt`.
- **Target Precision:** Mixed Precision (PyTorch AMP FP16).
- **Batch Size:** $1$ patch ROI ($96 \times 96 \times 96$) with Gradient Accumulation Steps = $2$.
- **Estimated Peak VRAM:** $\mathbf{\approx 4.5 - 4.9 \text{ GB}}$ ($\approx 75\% - 80\%$ of 6,144 MB VRAM).
- **Estimated Throughput:** ~22 seconds per patient volume.
- **Estimated Epoch Time:** $40 \times 22 \text{ s} \approx 880 \text{ s} \approx 14.7 \text{ minutes}$.
- **Estimated 5-Epoch Duration:** $\mathbf{\approx 1.2 - 1.3 \text{ GPU Hours}}$.

---

## 5. Thermal & Power Estimates (NVIDIA RTX A1000 Laptop GPU)

- **Power Envelope:** 50W TGP (Total Graphics Power).
- **Thermal Range (Estimated):** Operating temperature projected at $54^\circ\text{C} - 65^\circ\text{C}$ during short inference bursts. Thermal throttle limit is $78^\circ\text{C}$ (critical limit $87^\circ\text{C}$).
- **Mitigation Controls:** Explicit cache clearance (`torch.cuda.empty_cache()`) between patient volumes allows brief GPU idle windows, minimizing heat build-up.
