"""Full-volume validation evaluation for Baseline UNETR.

Wraps the shared evaluation engine in src/evaluation/evaluator.py.
"""

from pathlib import Path
import os
import sys

import torch

from src.data.val_dataloader import create_validation_loader
from src.evaluation.evaluator import (
    evaluate_single_checkpoint,
    save_evaluation_results,
)
from src.utils.config import load_config


def main(config_path: str = "configs/base.yaml", checkpoint_path: str = "checkpoints/baseline/latest.pth"):
    config = load_config(config_path)

    ds_cfg = config.get("dataset", {})
    root_dir = ds_cfg.get("root_dir", "data/raw/BraTS2021/BraTS2021_Training_Data")
    val_split = ds_cfg.get("val_split", "data/splits/val.txt")

    eval_cfg = config.get("evaluation", {})
    roi_size = tuple(eval_cfg.get("roi_size", [96, 96, 96]))
    sw_batch_size = eval_cfg.get("sw_batch_size", 1)
    overlap = float(eval_cfg.get("overlap", 0.25))

    device = "cuda" if torch.cuda.is_available() else "cpu"

    print("=" * 60)
    print("BASELINE UNETR FULL-VOLUME EVALUATION")
    print("=" * 60)

    val_loader = create_validation_loader(
        root_dir=root_dir,
        batch_size=1,
        num_workers=0,
        val_split_file=val_split,
    )
    print(f"Validation cases: {len(val_loader.dataset)}")
    print(f"Evaluating checkpoint: {checkpoint_path}")

    res = evaluate_single_checkpoint(
        checkpoint_path=checkpoint_path,
        val_loader=val_loader,
        device=device,
        roi_size=roi_size,
        sw_batch_size=sw_batch_size,
        overlap=overlap,
        verbose=True,
    )

    summary = res["summary"]
    print("\n" + "=" * 60)
    print("BASELINE FULL-VOLUME RESULTS")
    print("=" * 60)
    print(f"Mean Dice: {summary['mean_dice']:.4f}")
    print(f"WT Dice:   {summary['WT_dice']:.4f}")
    print(f"TC Dice:   {summary['TC_dice']:.4f}")
    print(f"ET Dice:   {summary['ET_dice']:.4f}")
    print(f"Mean HD95: {summary['mean_hd95']:.4f}")

    save_evaluation_results(
        experiment_name="baseline",
        summary_metrics=summary,
        subject_metrics=res["subjects"],
        output_dir="results",
    )


if __name__ == "__main__":
    main()