FINAL RESEARCH EVALUATION AUDIT — METRIC AGGREGATION SPECIFICATION
======================================================================

1. EVALUATION COHORT:
   - Fixed split: data/splits/val.txt (10 BraTS 2021 validation cases)
   - Input shape: Full 3D Multi-modal MRI (FLAIR, T1w, T1gd, T2w)
   - Sliding-Window Inference: ROI 96x96x96 voxels, overlap 0.25, sw_batch_size 1

2. SUB-REGION DEFINITIONS (BraTS 2021):
   - Whole Tumor (WT): Labels 1 (Necrotic/Non-Enhancing), 2 (Edema), 3 (Enhancing)
   - Tumor Core (TC): Labels 1 (Necrotic), 3 (Enhancing)
   - Enhancing Tumor (ET): Label 3 (Enhancing)

3. AGGREGATION METHODOLOGY: METHOD A (Macro-averaging / Mean of per-subject values)
   - For each subject i in {1..10}, calculate Dice_i and HD95_i for WT, TC, ET.
   - Region Dice = (1 / N) * sum(Dice_i)
   - Region HD95 = (1 / N_valid) * sum(HD95_i) (excluding non-finite values)
   - Mean Dice = (WT_Dice + TC_Dice + ET_Dice) / 3
   - Mean HD95 = (WT_HD95 + TC_HD95 + ET_HD95) / 3

4. OFFICIAL MODEL CHECKPOINTS TESTED:
   - Baseline UNETR      : checkpoints/baseline/epoch_10.pth
   - Online Tokenizer    : checkpoints/online_tokenizer/epoch_10.pth
   - Dense Predictor     : checkpoints/dense_predictor/epoch_10.pth
   - Full MOD            : checkpoints/mod/epoch_09.pth
   - Adaptive MOD        : checkpoints/adaptive/best.pth
