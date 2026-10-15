"""
Metrics service reusing existing project BraTS evaluation logic.
Computes case-specific volumetric measurements (WT, TC, ET) and
evaluates Dice / HD95 if ground truth is supplied.
"""
from typing import Dict, Optional, Any, Tuple
import numpy as np
import torch
from src.evaluation.metrics import calculate_brats_metrics


class MetricsService:
    @staticmethod
    def compute_volumetrics(
        prediction_tensor: torch.Tensor,
        voxel_spacing: Tuple[float, float, float]
    ) -> Dict[str, Any]:
        """
        Calculates voxel counts and volumetric measurements (mm³ and cm³) for:
        - WT: labels {1, 2, 3}
        - TC: labels {1, 3}
        - ET: label {3}
        """
        # Ensure single integer label map (can be 3D [H, W, D] or 4D [1, H, W, D])
        if prediction_tensor.ndim == 4:
            pred_map = prediction_tensor[0]
        else:
            pred_map = prediction_tensor

        voxel_vol_mm3 = float(voxel_spacing[0] * voxel_spacing[1] * voxel_spacing[2])

        wt_mask = (pred_map == 1) | (pred_map == 2) | (pred_map == 3)
        tc_mask = (pred_map == 1) | (pred_map == 3)
        et_mask = (pred_map == 3)

        wt_voxels = int(torch.sum(wt_mask).item())
        tc_voxels = int(torch.sum(tc_mask).item())
        et_voxels = int(torch.sum(et_mask).item())

        regions = {
            "WT": {
                "voxel_count": wt_voxels,
                "volume_mm3": round(wt_voxels * voxel_vol_mm3, 2),
                "volume_cm3": round((wt_voxels * voxel_vol_mm3) / 1000.0, 3),
            },
            "TC": {
                "voxel_count": tc_voxels,
                "volume_mm3": round(tc_voxels * voxel_vol_mm3, 2),
                "volume_cm3": round((tc_voxels * voxel_vol_mm3) / 1000.0, 3),
            },
            "ET": {
                "voxel_count": et_voxels,
                "volume_mm3": round(et_voxels * voxel_vol_mm3, 2),
                "volume_cm3": round((et_voxels * voxel_vol_mm3) / 1000.0, 3),
            }
        }

        # Overall tumor voxels is equal to Whole Tumor (WT)
        return {
            "tumor_voxels": wt_voxels,
            "tumor_volume_mm3": round(wt_voxels * voxel_vol_mm3, 2),
            "tumor_volume_cm3": round((wt_voxels * voxel_vol_mm3) / 1000.0, 3),
            "regions": regions
        }

    @staticmethod
    def evaluate_ground_truth(
        prediction_tensor: torch.Tensor,
        target_tensor: Optional[torch.Tensor]
    ) -> Optional[Dict[str, Any]]:
        """
        Calculates WT, TC, ET Dice and HD95 using the existing calculate_brats_metrics.
        Returns None if target_tensor is None.
        """
        if target_tensor is None:
            return None

        # Ensure batch dimension [1, 1, H, W, D]
        p = prediction_tensor
        t = target_tensor
        if p.ndim == 3:
            p = p.unsqueeze(0).unsqueeze(0)
        elif p.ndim == 4:
            p = p.unsqueeze(0)

        if t.ndim == 3:
            t = t.unsqueeze(0).unsqueeze(0)
        elif t.ndim == 4:
            t = t.unsqueeze(0)

        raw_metrics = calculate_brats_metrics(prediction=p, target=t)

        wt_d = float(raw_metrics["WT"]["dice"])
        tc_d = float(raw_metrics["TC"]["dice"])
        et_d = float(raw_metrics["ET"]["dice"])
        mean_d = float(np.mean([wt_d, tc_d, et_d]))

        wt_h = float(raw_metrics["WT"]["hd95"]) if np.isfinite(raw_metrics["WT"]["hd95"]) else None
        tc_h = float(raw_metrics["TC"]["hd95"]) if np.isfinite(raw_metrics["TC"]["hd95"]) else None
        et_h = float(raw_metrics["ET"]["hd95"]) if np.isfinite(raw_metrics["ET"]["hd95"]) else None

        valid_hds = [h for h in [wt_h, tc_h, et_h] if h is not None]
        mean_h = float(np.mean(valid_hds)) if valid_hds else None

        return {
            "WT_dice": round(wt_d, 4),
            "TC_dice": round(tc_d, 4),
            "ET_dice": round(et_d, 4),
            "mean_dice": round(mean_d, 4),
            "WT_hd95": round(wt_h, 4) if wt_h is not None else None,
            "TC_hd95": round(tc_h, 4) if tc_h is not None else None,
            "ET_hd95": round(et_h, 4) if et_h is not None else None,
            "mean_hd95": round(mean_h, 4) if mean_h is not None else None,
        }
