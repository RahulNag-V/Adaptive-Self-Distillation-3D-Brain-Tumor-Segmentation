# DATA LEAKAGE & CROSS-VALIDATION METHODOLOGICAL ASSESSMENT
## Phase 7 Stage B.1 Scientific Review

### 1. Executive Critique of the Proposed 5-Fold Cross-Validation

In Phase 7 Stage B, the report proposed:
> "Evaluate an optimal posterior threshold tau_ed in [0.60, 0.70] using 5-fold cross-validation across all 50 BraTS patients to prevent overfitting."

**Scientific Assessment: METHODOLOGICALLY FLAWED IF USING EXISTING CHECKPOINTS.**

#### Root Cause of the Flaw:
1. The repository currently possesses a single fixed production split:
   - `data/splits/train.txt`: Exactly 40 patients.
   - `data/splits/val.txt`: Exactly 10 patients.
2. The model checkpoints (`checkpoints/adaptive/best.pth`, etc.) were trained on the **40 training patients**.
3. If an engineer splits the 50 patients into 5 folds of 10 patients and uses the **existing** `best.pth` checkpoint to generate predictions for threshold calibration:
   - In 4 out of the 5 folds, the evaluated patients were part of the **training set** that the model was optimized on!
   - In-sample predictions exhibit higher confidence, lower training loss, and memorized boundaries compared to unseen data.
   - Tuning a threshold on training predictions is **training-set calibration leakage**. It invalidates any claim of out-of-sample generalization.

---

### 2. Scientifically Valid Evaluation Protocols for Stage C

To avoid data leakage, one of the following two rigorous protocols must be adopted:

#### Protocol Option A: Fixed Held-Out Split with Dedicated Calibration Split (Recommended for Zero-Retraining)
If zero retraining is enforced:
- **Do not touch the 40 training patients.**
- The existing validation set of 10 patients (`val.txt`) cannot be both the calibration tuning set and the final certified test set without optimistic bias.
- **Protocol:**
  - Split the 10 validation patients into:
    - 5 Calibration Patients (`val_calibration.txt`): Used strictly to tune the posterior threshold $\tau_{ed}$ or temperature parameter $T$.
    - 5 Unseen Test Patients (`val_test.txt`): Completely held-out and locked during threshold search. Evaluated only once to report final unbiased metrics.
- **Advantage:** Requires zero retraining; avoids training set memorization; establishes an honest test score.
- **Limitation:** Small test sample ($N=5$).

#### Protocol Option B: True Out-Of-Fold Nested Cross-Validation (Requires Retraining)
If model retraining is authorized:
- Split the 50 patients into 5 disjoint folds of 10 patients ($K_1, K_2, K_3, K_4, K_5$).
- For each fold $i \in \{1, \dots, 5\}$:
  - Train a completely new model from scratch on the remaining 40 patients ($D \setminus K_i$).
  - Generate inference predictions **only** on the held-out fold $K_i$ (true out-of-fold predictions).
- Combine all 50 out-of-fold prediction volumes.
- Tune the calibration threshold $\tau$ using cross-validation over these out-of-fold predictions.
- **Advantage:** Methodologically gold-standard; maximizes sample size ($N=50$) with zero training leakage.
- **Cost:** Requires training 5 separate 3D UNETR models on GPU (~15-20 hours total compute).

---

### 3. Recommendation for Stage C
Adopt **Protocol Option A** as the immediate, non-retraining verification step. If the calibrated threshold demonstrates robust gains on the 5 held-out test patients without TC/ET regression, adopt Protocol Option B only if full re-training and re-benchmarking is formally authorized.
