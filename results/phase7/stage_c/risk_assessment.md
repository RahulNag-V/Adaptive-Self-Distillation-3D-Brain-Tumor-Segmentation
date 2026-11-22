# NEUROVISION AI — PHASE 7: STAGE C
## Experimental Risk Assessment & Research Quality Controls

**Document Version:** 3.0 (Final Pre-Execution Methodological Revision)  
**Author:** Senior Medical AI Research Scientist & ML Systems Engineer  
**Scope:** Phase 7 Stage C Controlled Optimization Experiments  
**Status:** **PRE-REGISTRATION SPECIFICATION (AWAITING HUMAN APPROVAL)**

---

## 1. Executive Summary

This document formalizes the risk matrix, failure modes, research acceptance criteria, and rollback protocols governing Phase 7 Stage C. The experiment investigates whether post-processing threshold calibration can resolve Whole Tumor over-segmentation without retraining the underlying Vision Transformer model.

> [!NOTE]
> All criteria defined herein are **research acceptance criteria** for controlled offline experimentation. They do not constitute clinically certified thresholds, as clinical deployment requires formal multi-center clinical trials.

---

## 2. Experimental Risk Matrix

| Risk ID | Risk Description | Severity | Probability | Pre-Mitigation Score | Mitigation & Quality Control Strategy | Post-Mitigation Score |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R-01** | **Calibration Over-Fitting**<br>Optimal $\tau^*$ over-fits to the 5 calibration patients and degrades on locked test patients. | High | Medium | **HIGH** | Volume-stratified rank interleaving split; candidate threshold search restricted to 9 discrete steps ($\Delta \tau = 0.05$); multi-objective utility function regularized with Mean Absolute Relative Error (MARE). | **LOW** |
| **R-02** | **Tumor Under-Segmentation (False Negatives)**<br>Excessive thresholding suppresses true infiltrating tumor margins. | Critical | Medium | **CRITICAL** | Strict research acceptance criterion enforcing cohort $\overline{\text{WT Recall}} \ge 85.0\%$ AND individual-patient flagging for any patient $< 85.0\%$; tie-breaking rule favors higher sensitivity. | **LOW** |
| **R-03** | **Tumor Core Degradation**<br>Edema filtering alters core boundaries. | High | Low | **HIGH** | Research acceptance criteria requiring cohort $\overline{\text{TC Dice}} \ge 0.6000$ and individual-patient flagging for any patient $< 0.6000$; decision rule preserves core classes ($p_1, p_3$). | **NEGLIGIBLE** |
| **R-04** | **Data Leakage & Post-Hoc Bias**<br>Tuning thresholds after observing locked test results. | Critical | Low | **CRITICAL** | Cryptographic pre-registration seal; single-evaluation pass rule on locked test cohort; permanent split lock; no secondary adjustments permitted. | **NEGLIGIBLE** |
| **R-05** | **GPU Memory Allocation Fault (OOM)**<br>Sliding-window inference exceeds available GPU VRAM. | Medium | Low | **MEDIUM** | Strict batch size 1; explicit cache flushing via `torch.cuda.empty_cache()` between volumes; sequential patch processing. | **LOW** |
| **R-06** | **Statistical Misinterpretation**<br>Claiming population generalization from a 5-patient test sample. | High | Medium | **HIGH** | Explicit declaration of all inferential tests as exploratory; reporting individual patient results; presenting confidence interval limitations. | **NEGLIGIBLE** |
| **R-07** | **Cohort Masking of Individual Failures**<br>Cohort average passes while an individual patient experiences margin collapse. | Critical | Medium | **CRITICAL** | Mandatory individual-patient auditing: report every subject's WT Recall, TC Dice, ET Dice, and MARE; flag any subject violating thresholds. | **LOW** |

---

## 3. Failure Modes & Gating Criteria

### 3.1 Failure Mode 1: Insufficient Boundary Overlap
- **Condition:** Arm 3 locked test mean $\overline{\text{WT Dice}} < 0.7200$.
- **Action:** Record failure; halt execution; prepare a standalone Retraining Proposal for human review.

### 3.2 Failure Mode 2: Margin Erosion (False Negative Breach)
- **Condition:** Arm 3 locked test mean $\overline{\text{WT Recall}} < 85.0\%$ OR any individual patient $\text{WT Recall}_i < 70.0\%$.
- **Action:** Record failure; reject threshold; prepare a standalone Retraining Proposal for human review.

### 3.3 Failure Mode 3: Core Boundary Disruption
- **Condition:** Arm 3 locked test mean $\overline{\text{TC Dice}} < 0.6000$ or $\overline{\text{ET Dice}} < 0.6000$.
- **Action:** Record failure; reject threshold; prepare a standalone Retraining Proposal for human review.

### 3.4 Failure Mode 4: Volumetric Concordance Failure
- **Condition:** Arm 3 locked test $\text{MARE}_{\text{WT}} > 50.0\%$.
- **Action:** Record failure; prepare a standalone Retraining Proposal for human review.

### 3.5 Failure Mode 5: Individual Patient Outlier Collapse
- **Condition:** Cohort mean passes, but one or more individual patients show $\text{WT Recall} < 85.0\%$, $\text{TC Dice} < 0.6000$, or $\text{ET Dice} < 0.6000$.
- **Action:** Mandatory case-level radiologic post-mortem; flag in audit log; halt automatic certification and require explicit human review.

---

## 4. Contingency Protocol: Retraining Proposal Requirements

> [!IMPORTANT]
> **No Automatic Retraining Authorization:**
> In the event of any failure mode listed above, the system will **NOT** automatically initiate model retraining or fine-tuning.

If calibration fails on the locked test cohort, the research team will generate a comprehensive, standalone **Phase 7 Retraining Proposal** covering:
1. **Training Partition:** Explicit specification of the 40 training patients from `data/splits/train.txt`.
2. **Validation Protocol:** Checkpointing against calibration data with early stopping.
3. **Loss Function Formulation:** Asymmetric Focal Loss ($\gamma = 2.0$, $\alpha_{\text{edema}} = 0.65$) + Generalized Dice Loss.
4. **Checkpoint Isolation:** Creating a new checkpoint file (e.g. `checkpoints/adaptive_finetuned/`) with zero modification or overwriting of production checkpoints (`checkpoints/adaptive/best.pth`).
5. **GPU Memory & Batch Configuration:** Mixed precision (AMP FP16), batch size 1 with gradient accumulation 2, targeting $< 5.0\text{ GB}$ VRAM.
6. **Training Duration:** Estimated epochs (e.g. 5 epochs, ~1.2 hours) on local RTX A1000 hardware.
7. **Reproducibility Guarantee:** Random seeds, CUDA determinism flags, and SHA-256 baseline hashing.
8. **Rollback Criteria:** Clear exit criteria if fine-tuning fails to outperform baseline UNETR.
9. **Formal Human Sign-Off:** Execution will strictly wait for human approval.
