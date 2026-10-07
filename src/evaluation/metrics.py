import torch
from monai.metrics import DiceMetric, HausdorffDistanceMetric


def calculate_brats_metrics(
    prediction: torch.Tensor,
    target: torch.Tensor,
):
    """
    Calculate Dice and HD95 for WT, TC and ET.

    prediction:
        [B, 1, H, W, D] integer label map

    target:
        [B, 1, H, W, D] integer label map
    """

    pred_regions = {
        "WT": (prediction == 1)
        | (prediction == 2)
        | (prediction == 3),

        "TC": (prediction == 1)
        | (prediction == 3),

        "ET": prediction == 3,
    }

    target_regions = {
        "WT": (target == 1)
        | (target == 2)
        | (target == 3),

        "TC": (target == 1)
        | (target == 3),

        "ET": target == 3,
    }

    results = {}

    dice_metric = DiceMetric(
        include_background=False,
        reduction="mean",
        get_not_nans=False,
    )

    hd95_metric = HausdorffDistanceMetric(
        include_background=False,
        percentile=95.0,
        reduction="mean",
        get_not_nans=False,
    )

    for region in ["WT", "TC", "ET"]:

        pred = pred_regions[region].float()
        target_region = target_regions[region].float()

        # Add channel dimension expected by MONAI metrics
        pred = pred.unsqueeze(1) if pred.ndim == 4 else pred
        target_region = (
            target_region.unsqueeze(1)
            if target_region.ndim == 4
            else target_region
        )

        dice_metric.reset()
        hd95_metric.reset()

        dice_metric(y_pred=pred, y=target_region)
        hd95_metric(y_pred=pred, y=target_region)

        dice = dice_metric.aggregate().item()

        try:
            hd95 = hd95_metric.aggregate().item()
        except Exception:
            hd95 = float("nan")

        results[region] = {
            "dice": dice,
            "hd95": hd95,
        }

    return results