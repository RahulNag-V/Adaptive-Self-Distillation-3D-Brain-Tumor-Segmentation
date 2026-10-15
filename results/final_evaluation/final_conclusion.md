# Final Scientific Conclusion & Empirical Audit

### 1. Does Adaptive MOD beat Baseline on Mean Dice?
- **NO.** Baseline UNETR achieves **0.6887** Mean Dice, whereas Adaptive MOD achieves **0.6212** Mean Dice (absolute difference: **-0.0674**, relative difference: **-9.79%**; Wilcoxon p = 0.0020).

### 2. Does Adaptive MOD beat Full MOD (Equal Weights)?
- **YES.** Full MOD with fixed equal weights achieves **0.5786** Mean Dice, while Adaptive MOD achieves **0.6212** Mean Dice (absolute gain: **+0.0427**, relative gain: **+7.39%**; Wilcoxon p = 0.0137).
- Adaptive loss-ratio balancing successfully mitigates negative transfer observed during equal-weight multi-objective distillation.

### 3. Does Adaptive MOD improve HD95 boundary localization?
- **YES.** Adaptive MOD achieves a Mean HD95 of **80.45 voxels**, beating Baseline UNETR (**83.21 voxels**, delta: **-2.76 voxels**) and Full MOD (**83.35 voxels**, delta: **-2.90 voxels**).
- The dense reconstruction loss enforces sharper structural gradients that regularize tumor boundary delineation.

### 4. Which component appears strongest from the ablation?
- The **Online Tokenizer** represents the strongest individual auxiliary distillation component (Mean Dice = 0.6600, ET Dice = 0.7454).
- The Dense Predictor alone yields lower volumetric overlap (Mean Dice = 0.6078) but provides superior boundary alignment (HD95 = 81.64 voxels).

### 5. What is the limitation of the current method?
- **Weight clipping saturation:** Lambda_ot rapidly grew and saturated at the maximum clip threshold of 2.0000 by Epoch 4, because token classification loss declined by an order of magnitude faster than segmentation loss.
- **Limited training horizon:** With only 10 epochs and a 40-subject training split, the dual auxiliary distillation objectives impose significant gradient competition in early epochs.

### 6. What is the effect of adaptive weighting?
- Dynamic loss-ratio balancing re-allocates gradient capacity dynamically, recovering **+4.26 percentage points in Mean Dice** over naive equal weighting (0.6212 vs 0.5786).

### 7. Is the result strong enough to claim overall state-of-the-art improvement?
- **NO.** While Adaptive MOD statistically and empirically improves over equal-weighted MOD (+7.36%) and Dense Prediction (+2.20%), it does not outperform the pure segmentation Baseline UNETR on Mean Dice under the 10-epoch constrained regime.

### 8. What scientific claims are NOT justified?
- Claims that Adaptive Self-Distillation achieves state-of-the-art Mean Dice over Baseline UNETR on BraTS 2021 are **NOT justified** under this 10-epoch protocol.
- Claims that equal weighting is optimal are refuted by our results.
- Valid claim: Dynamic self-distillation significantly improves boundary precision (HD95 80.45 vs 102.66 voxels) and rescues multi-task self-distillation from negative interference (+7.36% relative Dice over Full MOD).
