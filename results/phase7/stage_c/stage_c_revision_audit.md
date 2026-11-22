# NEUROVISION AI — PHASE 7: STAGE C
# STAGE C PROPOSAL REVISION & PRE-EXECUTION SCIENTIFIC AUDIT REPORT

**Document ID:** `NVAI-P7-EXP-STAGE-C-AUDIT-REVISION`  
**Audit Date:** 2026-11-06  
**Auditor:** Senior Medical AI Research Scientist, Deep Learning Auditor & ML Systems Engineer  
**Status:** **AUDIT COMPLETE — AWAITING EXPLICIT HUMAN AUTHORIZATION**  
**Repository State:** Zero application code modified &bull; Zero models retrained &bull; Zero experiments executed

---

## 1. Executive Summary & Audit Mandate

In accordance with user directives, a comprehensive pre-execution audit and methodological correction of the Phase 7 Stage C Optimization Experiment Proposal was performed. 

All identified scientific and methodological weaknesses have been corrected across all Stage C specification deliverables:
- `results/phase7/stage_c/stage_c_experiment_proposal.md`
- `results/phase7/stage_c/baseline_comparison_plan.csv`
- `results/phase7/stage_c/threshold_selection_protocol.md`
- `results/phase7/stage_c/evaluation_protocol.md`
- `results/phase7/stage_c/risk_assessment.md`
- `results/phase7/stage_c/resource_estimation.md`
- `results/phase7/stage_c/patient_calibration_split.json`

---

## 2. Granular Change Summary by Audit Domain

### Domain 1: Correction of Historical Baseline Metrics
- **Finding:** Prior draft documents cited approximate or heuristic values (e.g. WT Dice 0.7650/0.7712, Rel Vol Error +42.80% or +214.00%, TC/ET Dice 0.8060/0.8010) that differed from the independently verified Stage B.1 benchmarks.
- **Correction:** All historical baselines have been updated to match the exact measured numbers from Stage B.1 (`results/phase7/stage_b1/independent_five_model_comparison.csv` and `results/phase7/stage_b1/per_patient_verified_metrics.csv`):
  - **Baseline UNETR (N=10):**
    - WT Dice: $0.7525 \pm 0.1165$ (was estimated as $0.7650$ or $0.7712$).
    - TC Dice: $0.6520 \pm 0.1889$ (was estimated as $0.7490$).
    - ET Dice: $0.6615 \pm 0.1741$ (was estimated as $0.7200$).
    - WT Precision: $64.36\%$ (was estimated as $67.20\%$).
    - WT Recall: $94.46\%$ (was estimated as $92.50\%$).
    - WT Relative Volume Error: $+58.76\%$ (was estimated as $+42.80\%$).
    - WT HD95: $75.35\text{ mm}$ (was estimated as $77.50\text{ mm}$).
    - TC HD95: $88.18\text{ mm}$ (was estimated as $81.40\text{ mm}$).
    - ET HD95: $86.09\text{ mm}$ (was estimated as $78.00\text{ mm}$).
    - Overall Mean Dice: $0.6887$.
  - **Adaptive MOD Default Argmax (N=10):**
    - WT Dice: $0.5139 \pm 0.1645$ (was estimated as $0.5160$).
    - TC Dice: $0.6690 \pm 0.1886$ (was estimated as $0.8060$).
    - ET Dice: $0.6808 \pm 0.1705$ (was estimated as $0.8010$).
    - WT Precision: $36.43\%$ (was estimated as $36.00\%$).
    - WT Recall: $97.98\%$ (was estimated as $97.74\%$).
    - WT Relative Volume Error: $+237.44\%$ (was estimated as $+214.00\%$).
    - WT HD95: $74.94\text{ mm}$ (was estimated as $75.20\text{ mm}$).
    - TC HD95: $82.45\text{ mm}$ (was estimated as $69.50\text{ mm}$).
    - ET HD95: $83.95\text{ mm}$ (was estimated as $78.00\text{ mm}$).
    - Overall Mean Dice: $0.6213$.
  - **Exploratory Threshold $\tau=0.70$ (N=10):**
    - WT Dice: $0.8011 \pm 0.0929$.
    - WT Precision: $74.60\%$.
    - WT Recall: $88.88\%$.
    - WT Relative Volume Error: $+24.52\%$.
    - WT HD95: $68.76\text{ mm}$.
    - TC Dice: $0.6163$.
    - ET Dice: $0.6078$.
- **Invariant:** Zero estimated or heuristic values remain in baseline benchmark fields.

---

### Domain 2: Patient Partitioning & Volume Imbalance Audit
- **Verification Checks:**
  1. *Source Split:* All 10 patients (`01024`, `01026`, `01045`, `01046`, `01047`, `01052`, `01058`, `01063`, `01069`, `01072`) verified present in `data/splits/val.txt`.
  2. *Disjointness:* Calibration cohort ($N=5$) and Locked Test cohort ($N=5$) are completely mutually exclusive ($\text{Calib} \cap \text{Test} = \emptyset$).
  3. *Zero Leakage Guarantee:* Confirmed that locked-test predictions have NOT been evaluated or used to select candidate thresholds.
- **Volume Imbalance Documented:**
  - Calibration Cohort Mean WT Volume: $119.70 \pm 51.69\text{ cm}^3$ (Min: $51.39\text{ cm}^3$, Max: $190.00\text{ cm}^3$).
  - Locked Test Cohort Mean WT Volume: $146.66 \pm 49.34\text{ cm}^3$ (Min: $95.47\text{ cm}^3$, Max: $211.08\text{ cm}^3$).
  - Volume Imbalance: Locked test cohort is $+26.97\text{ cm}^3$ (**$+22.5\%$**) larger in Whole Tumor burden.
  - Core Imbalance: Locked test TC mean is $+53.6\%$ larger ($58.96$ vs $38.39\text{ cm}^3$), and ET mean is $+79.5\%$ larger ($36.96$ vs $20.58\text{ cm}^3$).
  - *Methodological Consequence:* Documented in `patient_calibration_split.json` and `evaluation_protocol.md` as an inherent source of variance, precluding claims of population generalization.
- **Rule Enforced:** The partition remains locked and cannot be altered after observing outcomes.

---

### Domain 3: Threshold Selection Protocol Corrections
- **Candidate Threshold Search Space:** Fixed to the **9 discrete candidate thresholds**:
  $$\mathcal{T} = \{0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90\}$$
  (Removed the unverified 21-point / 0.02 step continuous sweep).
- **Multi-Objective Utility $J(\tau)$ Justification:**
  - $w_{\text{wt\_dice}} = 0.40$: Primary spatial overlap index for Whole Tumor (primary target of investigation).
  - $w_{\text{wt\_prec}} = 0.25$: Direct penalty for false-positive edema assignments.
  - $w_{\text{tc\_dice}} = 0.15$: Safeguard against necrotic and enhancing core degradation.
  - $w_{\text{et\_dice}} = 0.10$: Safeguard protecting contrast-enhancing active tumor delineation.
  - $\lambda = 0.10$: Volumetric penalty on absolute relative volume error $|\Delta V_{\text{WT}}|$ to penalize over- and under-estimation.
- **Terminology Correction:**
  - Renamed all "clinical safety thresholds" to **"research acceptance criteria"** across all documents, recognizing that clinical validation requires formal multi-center prospective trials.
- **Tie-Breaking Protocol Formalized:**
  1. *Tie-Breaker 1:* Higher calibration mean Whole Tumor Recall ($\overline{\text{WT Recall}}$) to preserve tumor margins.
  2. *Tie-Breaker 2:* Lower absolute relative volume error ($|\overline{\Delta V}_{\text{WT}}|$).
  3. *Tie-Breaker 3:* Lower numerical threshold $\tau$ (conservative choice against false negatives).

---

### Domain 4: Statistical Methodology Corrections
- **Per-Patient Granularity:** Enforced requirement to report individual results for all 5 locked test subjects across all 3 experimental arms.
- **Summary Metrics:** Required reporting both Mean and Standard Deviation ($\text{Mean} \pm \text{Std}$).
- **Confidence Intervals & Scope Limitations:**
  - Specified 95% Confidence Intervals using Student's t distribution with $df = 4$ ($t_{0.025, 4} = 2.776$) and bootstrap resampling ($B = 1,000$).
  - Explicitly classified inferential statistical tests (paired t-test, Wilcoxon signed-rank) as **exploratory diagnostic checks**.
  - Added mandatory limitation warning: **"Do not claim clinical validation or statistical generalization from five patients."**

---

### Domain 5: Retraining Contingency Corrections
- **Removed Automatic Retraining Trigger:** Deleted all language permitting automatic initiation of model fine-tuning or retraining upon calibration failure.
- **Formal Retraining Proposal Standard:** If calibration fails research acceptance criteria, the system halts and produces a separate Retraining Proposal specifying:
  1. Training split ($N=40$ patients from `data/splits/train.txt`).
  2. Validation protocol with early stopping.
  3. Loss function formulation (Asymmetric Focal Loss $\gamma=2.0, \alpha_{\text{edema}}=0.65$ + Generalized Dice Loss).
  4. Checkpoint isolation (preserving existing production weights untouched).
  5. GPU memory requirements and batch size / gradient accumulation.
  6. Training duration estimates on RTX A1000.
  7. Deterministic reproducibility controls.
  8. Pre-registered rollback criteria.
- **Human Authorization Gate:** Explicit human approval is strictly mandatory before any retraining code is executed.

---

### Domain 6: Resource Estimation Corrections
- **Labeling:** All latency, VRAM, RAM, and thermal figures across `resource_estimation.md` and related documents are explicitly labeled as **"engineering estimates based on preliminary runs"** until empirically measured during formal test execution.
- **Memory Advisory:** Removed any claim of "zero OOM risk". Replaced with explicit memory pressure advisory acknowledging non-linear PyTorch/CUDA workspace allocations and specifying sequential patch execution safeguards.

---

## 3. Side-by-Side Verification Matrix

| Parameter / Field | Prior Draft (Uncorrected) | Revised Specification (Audited) | Scientific Rationale |
| :--- | :--- | :--- | :--- |
| **Baseline UNETR WT Dice** | $0.7650$ / $0.7712$ | **$0.7525 \pm 0.1165$** | Exact Stage B.1 measured baseline (N=10) |
| **Baseline UNETR WT Vol Error**| $+42.80\%$ | **$+58.76\%$** | Exact Stage B.1 measured baseline (N=10) |
| **Adaptive MOD WT Dice** | $0.5160$ | **$0.5139 \pm 0.1645$** | Exact Stage B.1 measured baseline (N=10) |
| **Adaptive MOD WT Vol Error** | $+214.00\%$ | **$+237.44\%$** | Exact Stage B.1 measured baseline (N=10) |
| **Adaptive MOD TC Dice** | $0.8060$ | **$0.6690 \pm 0.1886$** | Exact Stage B.1 measured baseline (N=10) |
| **Adaptive MOD ET Dice** | $0.8010$ | **$0.6808 \pm 0.1705$** | Exact Stage B.1 measured baseline (N=10) |
| **Candidate Thresholds** | 21 thresholds (step 0.02) | **9 thresholds (step 0.05)** | Pre-registered discrete grid prevents over-fitting |
| **Gating Threshold Terminology**| "Clinical safety thresholds" | **"Research acceptance criteria"** | Scientifically accurate; clinical validation disclaimed |
| **Threshold Tie-Breaker** | Undefined | **3-tier hierarchical rule** | Deterministic selection without arbitrary discretion |
| **Statistical Inferences** | Asserted significance | **Exploratory only ($df=4$)** | Prevents overclaiming on small sample ($N=5$) |
| **Retraining Authority** | Automatic trigger | **Halt & separate proposal** | Human authorization strictly mandatory |
| **Hardware Guarantees** | "Zero OOM risk" | **"Estimates & memory advisory"** | Acknowledges non-linear memory dynamics |

---

## 4. Preservation of Prior Research Artifacts

The audit verified that all historical research artifacts remain intact and unmodified:
- `results/phase7/stage_b1/stage_b1_final_report.md` (Intact)
- `results/phase7/stage_b1/independent_five_model_comparison.csv` (Intact)
- `results/phase7/stage_b1/independent_threshold_sweep.csv` (Intact)
- `results/phase7/stage_b1/per_patient_verified_metrics.csv` (Intact)
- `results/phase7/stage_b1/flair_statistical_verification.json` (Intact)
- Checkpoint SHA-256 signatures (Intact and verified)

---

## 5. Final Sign-Off & Strict Invariant Declaration

```
========================================================================================
PRE-EXECUTION AUDIT COMPLETED SUCCESSFULLY.
ALL 6 SPECIFICATION DOCUMENTS REVISED AND HARMONIZED.
NO EXPERIMENTS HAVE BEEN EXECUTED.
NO MODEL WEIGHTS HAVE BEEN ALTERED.
NO APPLICATION CODE HAS BEEN MODIFIED.
STRICTLY AWAITING EXPLICIT HUMAN AUTHORIZATION BEFORE EXPERIMENT EXECUTION.
========================================================================================
```

