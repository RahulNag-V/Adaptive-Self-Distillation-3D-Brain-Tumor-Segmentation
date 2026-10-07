# Model Comparison — 3D Brain Tumor Segmentation

Evaluated on the 50-subject BraTS 2021 experimental development subset using full-volume sliding window inference (ROI $96 \times 96 \times 96$, overlap $0.25$, batch size $1$).

| Model | WT Dice | TC Dice | ET Dice | Mean Dice | Mean HD95 | Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Baseline UNETR** | 0.7525 | 0.6520 | 0.6615 | 0.6887 | 83.2078 | Completed |
| **Online Tokenizer** | 0.5324 | 0.7022 | 0.7454 | 0.6600 | 66.6347 | Completed |
| **Dense Predictor** | TBD | TBD | TBD | TBD | TBD | Pending Ablation |
| **Full MOD** | 0.6180 | 0.5867 | 0.5309 | 0.5786 | 79.5767 | Completed |
| **Adaptive MOD** | TBD | TBD | TBD | TBD | TBD | Planned Experiment |

### Key Observations:
1. **Online Tokenizer:** Achieved substantially superior Tumor Core (0.7022 vs 0.6520) and Enhancing Tumor (0.7454 vs 0.6615) Dice scores and drastically lower boundary distance (HD95: 66.63 vs 83.21) compared to the baseline UNETR, at the expense of Whole Tumor Dice (0.5324).
2. **Full MOD:** In the static 10-epoch setting on this subset, combining Dense Predictor with Online Tokenizer at equal weights ($\lambda_{ot}=1.0, \lambda_{dp}=1.0$) constrained fine-grain tumor segmentation (Mean Dice 0.5786).
3. **Dense Predictor Isolation:** Demonstrates the scientific necessity of the isolated Dense Predictor ablation experiment before advancing to dynamic adaptive self-distillation.
