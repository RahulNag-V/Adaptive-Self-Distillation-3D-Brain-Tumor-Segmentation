/**
 * NeuroSeg 3D - Demonstration Mock Data
 *
 * IMPORTANT SCIENTIFIC NOTICE:
 * This file contains strictly synthetic / demonstration placeholder data for UI development.
 * It is clearly separated from real inference and MUST NOT be presented as actual runtime results.
 */

export const IS_DEMO_DATA = true;

export const DEMO_CASE_METADATA = {
  patientId: "DEMO_PATIENT_01069",
  cohort: "BraTS 2021 Reference Benchmark (UI Demo Only)",
  acquisitionDate: "2024-03-15",
  modalities: [
    { name: "FLAIR", filename: "BraTS2021_01069_flair.nii.gz", size: "2.4 MB", status: "Validated" },
    { name: "T1", filename: "BraTS2021_01069_t1.nii.gz", size: "2.2 MB", status: "Validated" },
    { name: "T1ce", filename: "BraTS2021_01069_t1ce.nii.gz", size: "2.5 MB", status: "Validated" },
    { name: "T2", filename: "BraTS2021_01069_t2.nii.gz", size: "2.3 MB", status: "Validated" }
  ],
  volumeDimensions: {
    shape: [240, 240, 155],
    voxelSpacing: [1.0, 1.0, 1.0], // mm
    unit: "mm³"
  },
  modelInfo: {
    name: "Adaptive Self-Distillation (Adaptive MOD)",
    architecture: "UNETR (Transformer Encoder + Deconv Decoder)",
    framework: "PyTorch 2.11 + MONAI 1.6",
    checkpoint: "checkpoints/adaptive/best.pth (Demo Preview)",
    inputResolution: "96 × 96 × 96 (Sliding Window, overlap 0.25)",
    inferenceTime: "2.34s (GPU Accelerated)",
  },
  // Ground truth evaluation metrics (available in benchmark mode)
  benchmarkMetrics: {
    groundTruthProvided: true,
    meanDice: 0.7714,
    wtDice: 0.5557,
    tcDice: 0.8600,
    etDice: 0.8986,
    meanHd95: 56.83,
    wtHd95: 70.09,
    tcHd95: 49.33,
    etHd95: 51.06,
  },
  // Estimated volumetric analysis
  volumetrics: {
    wholeTumorVolumeCm3: 42.15,
    tumorCoreVolumeCm3: 18.60,
    enhancingTumorVolumeCm3: 11.45,
    edemaVolumeCm3: 23.55,
  }
};

export const UNLABELED_SCAN_DEMO = {
  patientId: "CLINICAL_UNLABELED_SCAN_001",
  cohort: "Custom Prospective Ingestion (Unlabeled)",
  modalities: [
    { name: "FLAIR", filename: "patient_scan_flair.nii.gz", size: "2.8 MB", status: "Validated" },
    { name: "T1", filename: "patient_scan_t1.nii.gz", size: "2.6 MB", status: "Validated" },
    { name: "T1ce", filename: "patient_scan_t1ce.nii.gz", size: "2.9 MB", status: "Validated" },
    { name: "T2", filename: "patient_scan_t2.nii.gz", size: "2.7 MB", status: "Validated" }
  ],
  modelInfo: {
    name: "Adaptive Self-Distillation (Adaptive MOD)",
    inferenceTime: "2.41s",
  },
  benchmarkMetrics: {
    groundTruthProvided: false,
    meanDice: null,
    wtDice: null,
    tcDice: null,
    etDice: null,
    meanHd95: null,
    note: "Ground truth not provided. Quantitative validation metrics (Dice/HD95) are unavailable."
  },
  volumetrics: {
    wholeTumorVolumeCm3: 36.80,
    tumorCoreVolumeCm3: 14.20,
    enhancingTumorVolumeCm3: 8.90,
    edemaVolumeCm3: 22.60,
  }
};

export const REGION_LEGEND = [
  {
    code: "WT",
    name: "Whole Tumor",
    description: "Entire abnormal tissue (Edema + Necrotic Core + Enhancing Tumor)",
    color: "#10B981", // Emerald Green
    hexRgb: "rgb(16, 185, 129)",
    labels: [1, 2, 3]
  },
  {
    code: "TC",
    name: "Tumor Core",
    description: "Necrotic Core + Active Enhancing Tumor",
    color: "#F59E0B", // Amber Orange
    hexRgb: "rgb(245, 158, 11)",
    labels: [1, 3]
  },
  {
    code: "ET",
    name: "Enhancing Tumor",
    description: "Hyper-intense Gadolinium contrast-enhancing active malignancy",
    color: "#EF4444", // Coral Red
    hexRgb: "rgb(239, 68, 68)",
    labels: [3]
  }
];
