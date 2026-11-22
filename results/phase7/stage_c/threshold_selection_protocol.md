# NEUROVISION AI — PHASE 7: STAGE C
## Protocol 1: Threshold Selection & Multi-Objective Optimization Protocol

**Document Version:** 3.0 (Final Pre-Execution Methodological Revision)  
**Author:** Senior Medical AI Research Scientist & ML Systems Engineer  
**Target Architecture:** Vision Transformer UNETR (4-Channel 3D MRI, $102.24\text{M}$ Parameters)  
**Target Split:** Calibration Cohort ($N=5$ patients: `01024`, `01052`, `01072`, `01047`, `01063`)  
**Status:** **PRE-REGISTRATION SPECIFICATION (AWAITING HUMAN APPROVAL)**

---

## 1. Scientific Objective & Rationale

Stage B and Stage B.1 demonstrated that the severe Whole Tumor over-segmentation in the Adaptive Self-Distillation UNETR model ($\text{Dice} = 0.5139$, relative volume error $+237.44\%$) is caused by assigning low-confidence background voxels to Edema (Label 2) under the uncalibrated default `argmax` operator.

The goal of this protocol is to determine an optimal, calibrated edema probability threshold $\tau^*$ that suppresses false-positive edema assignments while preserving true infiltrating tumor margins, necrotic core (TC), and active enhancing tissue (ET).

### Decision Rule Formulation
For each voxel $v$, given 4-class softmax probabilities $(p_0, p_1, p_2, p_3)$:
$$\hat{y}(v) = \begin{cases} 
\text{argmax}_{c \in \{0, 1, 3\}} p_c(v) & \text{if } p_2(v) < \tau \\
\text{argmax}_{c \in \{0, 1, 2, 3\}} p_c(v) & \text{if } p_2(v) \ge \tau 
\end{cases}$$

---

## 2. Discrete Candidate Threshold Search Space

To prevent over-fitting to the small calibration sample and maintain reproducibility, the candidate threshold space is restricted to **9 pre-registered discrete thresholds**:

$$\mathcal{T} = \{0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.85, 0.90\}$$

- **Step Size:** $\Delta \tau = 0.05$.
- **Lower Bound ($\tau = 0.50$):** Standard binary probability dominance.
- **Upper Bound ($\tau = 0.90$):** Conservative ceiling to prevent tumor margin collapse.
- **Continuous Interpolation Prohibited:** No fine-grained secondary sweep (e.g. $\Delta \tau = 0.01$) is permitted, as dense sweeps on $N=5$ patients risk hyper-optimizing to noise.

---

## 3. Multi-Objective Utility Function $J(\tau)$ with MARE Regularization

The optimal threshold $\tau^*$ is selected by maximizing a multi-objective utility function on the 5 calibration patients:

$$\tau^* = \arg\max_{\tau \in \mathcal{T}} J(\tau)$$

Where:
$$J(\tau) = w_{\text{wt\_dice}} \cdot \overline{\text{Dice}}_{\text{WT}}(\tau) + w_{\text{wt\_prec}} \cdot \overline{\text{Prec}}_{\text{WT}}(\tau) + w_{\text{tc\_dice}} \cdot \overline{\text{Dice}}_{\text{TC}}(\tau) + w_{\text{et\_dice}} \cdot \overline{\text{Dice}}_{\text{ET}}(\tau) - \lambda \cdot \text{MARE}_{\text{WT}}(\tau)$$

### 3.1 Mean Absolute Relative Error (MARE) Definition & Units
$$\text{MARE}_{\text{WT}}(\tau) = \frac{1}{N_{\text{calib}}} \sum_{i=1}^{N_{\text{calib}}} \frac{|V_{\text{pred}, i}(\tau) - V_{\text{true}, i}|}{V_{\text{true}, i}}$$

- **Normalization:** Per-patient absolute volume difference is normalized by that specific patient's ground-truth tumor volume $V_{\text{true}, i}$ prior to averaging across the cohort.
- **Mathematical Superiority:** Unlike signed cohort-averaged relative volume error ($\frac{1}{N}\sum \frac{V_p - V_t}{V_t}$), which allows positive errors (over-segmentation) and negative errors (under-segmentation) to cancel each other out, MARE strictly accumulates all per-patient volumetric deviations.
- **Units in Objective Function:** For computing $J(\tau)$, $\text{MARE}_{\text{WT}}$ is expressed as a dimensionless decimal ratio (e.g. $0.2928$ for $29.28\%$), ensuring dimensional balance with Dice and Precision. In reporting and acceptance checks, it is presented as a percentage ($\%$).

### 3.2 Weight Parameterization & Scientific Rationale

| Term | Weight | Scientific & Methodological Rationale |
| :--- | :--- | :--- |
| $\overline{\text{Dice}}_{\text{WT}}(\tau)$ | $w_{\text{wt\_dice}} = 0.40$ | **Primary Volumetric Overlap:** Measures global spatial overlap for the entire lesion (edema + core + enhancing). Carries highest weight because WT is the primary defect. |
| $\overline{\text{Prec}}_{\text{WT}}(\tau)$ | $w_{\text{wt\_prec}} = 0.25$ | **False Positive Suppression:** Directly quantifies the reduction of healthy brain parenchyma falsely flagged as edema. |
| $\overline{\text{Dice}}_{\text{TC}}(\tau)$ | $w_{\text{tc\_dice}} = 0.15$ | **Core Region Safeguard:** Ensures that suppressing edema logits does not erode non-enhancing or necrotic tumor boundaries. |
| $\overline{\text{Dice}}_{\text{ET}}(\tau)$ | $w_{\text{et\_dice}} = 0.10$ | **Enhancing Region Safeguard:** Protects the contrast-enhancing viable tumor tissue from boundary degradation. |
| $\text{MARE}_{\text{WT}}(\tau)$ | $\lambda = 0.10$ | **Volumetric Concordance Penalty:** Penalizes Mean Absolute Relative Error directly to prevent severe tumor burden over- or under-estimation. |

*Note: The performance weights sum to $1.00$ ($0.40 + 0.25 + 0.15 + 0.10 = 1.00$), and the MARE penalty $\lambda = 0.10$ acts as a regularizer.*

---

## 4. Research Acceptance Criteria & Individual-Patient Audits

To ensure candidate thresholds maintain surgical safety margins and do not conceal individual patient failures behind cohort averages, every candidate threshold must pass both **Cohort-Level Criteria** and **Individual-Patient Acceptance Audits** on the calibration cohort:

### 4.1 Cohort-Level Criteria (Gating Constraints)
1. **Whole Tumor Margin Preservation:** $\overline{\text{WT Recall}}(\tau) \ge 85.0\%$
2. **Tumor Core Boundary Concordance:** $\overline{\text{TC Dice}}(\tau) \ge 0.6000$
3. **Enhancing Tumor Boundary Concordance:** $\overline{\text{ET Dice}}(\tau) \ge 0.6000$
4. **False-Positive Suppression:** $\overline{\text{WT Precision}}(\tau) \ge 65.0\%$
5. **Volumetric Concordance Bound:** $\text{MARE}_{\text{WT}}(\tau) \le 45.0\%$

### 4.2 Individual-Patient Acceptance Checks (Anti-Masking Checks)
Cohort averages can mask catastrophic failures on individual subjects. For every candidate threshold $\tau$:
1. **Patient-Level WT Recall:** Report individual $\text{WT Recall}_i(\tau)$ for all 5 patients. **Flag any patient with $\text{WT Recall} < 85.0\%$.**
2. **Patient-Level TC Dice:** Report individual $\text{TC Dice}_i(\tau)$ for all 5 patients. **Flag any patient with $\text{TC Dice} < 0.6000$.**
3. **Patient-Level ET Dice:** Report individual $\text{ET Dice}_i(\tau)$ for all 5 patients. **Flag any patient with $\text{ET Dice} < 0.6000$.**
4. **Patient-Level Volume Errors:** Report both signed relative volume error and absolute relative error ($|V_p - V_t| / V_t$) for every patient.
5. **Disqualification Rule:** If a candidate threshold causes catastrophic margin collapse ($\text{WT Recall} < 70.0\%$) on any individual patient, that candidate threshold is disqualified regardless of its cohort average.

---

## 5. Formal Tie-Breaking Protocol

If two or more candidate thresholds $\tau_a, \tau_b \in \mathcal{T}$ yield identical utility within numerical precision ($\Delta J \le 1 \times 10^{-5}$):

1. **Tie-Breaker 1 (Higher Sensitivity / Recall):** Select the candidate with the higher calibration mean Whole Tumor Recall ($\overline{\text{WT Recall}}$), prioritizing tumor margin coverage over specificity.
2. **Tie-Breaker 2 (Lower MARE):** If recall is also tied within $0.05\%$, select the candidate with the lower $\text{MARE}_{\text{WT}}$.
3. **Tie-Breaker 3 (Conservative Threshold Choice):** If still tied, select the lower numerical threshold $\tau$ (more conservative against false negatives).

---

## 6. Split Transparency & Zero-Leakage Declaration

1. **Partition Provenance:** The 5 calibration patients (`01024`, `01052`, `01072`, `01047`, `01063`) and 5 locked-test patients were partitioned using ground-truth tumor volumes from all 10 validation patients. It is explicitly disclosed that this is a volume-stratified non-random partition, not an independent random sample.
2. **Zero Model Leakage:** No model predictions, probabilities, or inference outputs from the locked-test patients were generated or inspected during protocol design.
3. **Strict Blindness:** The locked-test cohort remains unobserved during threshold selection and will be evaluated strictly once after $\tau^*$ is locked.
