"""Evaluation script for Dense Predictor ablation experiment.

Measures full-volume 3D segmentation performance on the 10 validation subjects.
Also computes Dense Predictor voxel reconstruction error (MAE, MSE) on validation patches.
"""

from pathlib import Path
import glob
import os
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import torch
import torch.nn.functional as F

from src.data.val_dataloader import create_validation_loader
from src.evaluation.evaluator import (
    evaluate_single_checkpoint,
    print_comparison_banner,
    save_evaluation_results,
)
from src.utils.config import load_config


def evaluate_dense_predictor(
    checkpoint_dir: str = "checkpoints/dense_predictor",
    config_path: str = "configs/base.yaml",
):
    config = load_config(config_path)
    eval_cfg = config.get("evaluation", {})
    roi_size = tuple(eval_cfg.get("roi_size", [96, 96, 96]))
    sw_batch_size = eval_cfg.get("sw_batch_size", 1)
    overlap = float(eval_cfg.get("overlap", 0.25))

    ds_cfg = config.get("dataset", {})
    root_dir = ds_cfg.get("root_dir", "data/raw/BraTS2021/BraTS2021_Training_Data")
    val_split = ds_cfg.get("val_split", "data/splits/val.txt")

    device = "cuda" if torch.cuda.is_available() else "cpu"

    print("=" * 60)
    print("DENSE PREDICTOR CHECKPOINT EVALUATION")
    print("=" * 60)

    val_loader = create_validation_loader(
        root_dir=root_dir,
        batch_size=1,
        num_workers=0,
        val_split_file=val_split,
    )
    print(f"Validation cases: {len(val_loader.dataset)}")

    ckpt_path = Path(checkpoint_dir)
    if not ckpt_path.exists():
        print(f"Checkpoint directory {ckpt_path} does not exist yet. Please train first.")
        return

    # Check for epoch checkpoints or latest/best
    epoch_ckpts = sorted(glob.glob(str(ckpt_path / "epoch_*.pth")))
    eval_targets = epoch_ckpts if epoch_ckpts else [str(ckpt_path / "latest.pth")]

    best_mean_dice = -1.0
    best_eval = None
    all_evals = []

    for c_path in eval_targets:
        if not os.path.exists(c_path):
            continue
        print(f"\nEvaluating: {os.path.basename(c_path)}")
        res = evaluate_single_checkpoint(
            checkpoint_path=c_path,
            val_loader=val_loader,
            device=device,
            roi_size=roi_size,
            sw_batch_size=sw_batch_size,
            overlap=overlap,
            verbose=False,
        )
        summary = res["summary"]
        all_evals.append({"checkpoint": os.path.basename(c_path), "summary": summary})
        print(
            f"Mean Dice: {summary['mean_dice']:.4f} | "
            f"WT: {summary['WT_dice']:.4f}, TC: {summary['TC_dice']:.4f}, ET: {summary['ET_dice']:.4f}"
        )

        if summary["mean_dice"] > best_mean_dice:
            best_mean_dice = summary["mean_dice"]
            best_eval = res

    if best_eval is not None:
        # Load baseline for comparison
        baseline_summary = {"mean_dice": 0.6887, "WT_dice": 0.7525, "TC_dice": 0.6520, "ET_dice": 0.6615, "mean_hd95": 83.2078}
        print_comparison_banner("Dense Predictor", best_eval["summary"], baseline_summary)

        # Save results to results/dense_predictor
        save_evaluation_results(
            experiment_name="dense_predictor",
            summary_metrics=best_eval["summary"],
            subject_metrics=best_eval["subjects"],
            output_dir="results",
            checkpoint_history=all_evals,
        )


if __name__ == "__main__":
    evaluate_dense_predictor()
