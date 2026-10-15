# Final Authoritative Research Summary Table

### 1. Overall Performance Matrix

| Model | WT Dice | TC Dice | ET Dice | Mean Dice | WT HD95 | TC HD95 | ET HD95 | Mean HD95 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Baseline UNETR** | 0.7525 | 0.6520 | 0.6615 | **0.6887** | 75.3469 | 88.1820 | 86.0923 | **83.2071** |
| **Online Tokenizer** | 0.5324 | 0.7022 | 0.7454 | **0.6600** | 76.3887 | 76.6335 | 79.4056 | **77.4759** |
| **Dense Predictor** | 0.4815 | 0.6714 | 0.6706 | **0.6078** | 76.8924 | 83.3242 | 84.6877 | **81.6347** |
| **Full MOD** | 0.6180 | 0.5866 | 0.5309 | **0.5785** | 74.3392 | 87.7911 | 87.9167 | **83.3490** |
| **Adaptive MOD** | 0.5139 | 0.6690 | 0.6808 | **0.6213** | 74.9393 | 82.4491 | 83.9553 | **80.4479** |

### 2. Comparative Ablation Deltas (Adaptive vs. Prior Models)

| Comparison | Mean Dice Delta (Abs) | Mean Dice Delta (Rel) | Mean HD95 Delta (Abs) | Wilcoxon W (Dice) | p-value (Dice) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Adaptive vs. Baseline UNETR** | -0.0674 | -9.79% | -2.76 voxels | 0.0 | p=0.0020 |
| **Adaptive vs. Online Tokenizer** | -0.0387 | -5.87% | +2.97 voxels | 0.0 | p=0.0020 |
| **Adaptive vs. Dense Predictor** | +0.0134 | +2.21% | -1.19 voxels | 8.0 | p=0.0488 |
| **Adaptive vs. Full MOD** | +0.0427 | +7.39% | -2.90 voxels | 4.0 | p=0.0137 |

*Note: Cohort size is n=10 subjects. Statistical tests are paired two-sided Wilcoxon signed-rank tests.*

### 3. Subject-Level Distribution Statistics

| Model | Mean Dice (Mean ± Std) | Median Dice | Min Dice | Max Dice | Mean HD95 (Mean ± Std) | Median HD95 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Baseline UNETR** | 0.6887 ± 0.1382 | 0.7295 | 0.3199 | 0.8445 | 83.21 ± 14.54 | 78.79 |
| **Online Tokenizer** | 0.6600 ± 0.1150 | 0.6871 | 0.3620 | 0.7807 | 77.48 ± 17.53 | 74.66 |
| **Dense Predictor** | 0.6078 ± 0.1272 | 0.6346 | 0.2807 | 0.7514 | 81.63 ± 14.34 | 77.28 |
| **Full MOD** | 0.5785 ± 0.1432 | 0.6314 | 0.2183 | 0.7461 | 83.35 ± 12.38 | 81.25 |
| **Adaptive MOD** | 0.6213 ± 0.1340 | 0.6589 | 0.2708 | 0.7714 | 80.45 ± 15.65 | 75.81 |
