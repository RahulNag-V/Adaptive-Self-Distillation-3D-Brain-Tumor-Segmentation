"""Full-volume validation evaluation script for Adaptive MOD checkpoints.

Evaluates all epoch checkpoints and identifies the best checkpoint based on Mean Dice.
Prints comparative summaries against Baseline UNETR.
"""

from pathlib import Path
import glob
import os
import sys

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import torch

from src.data.val_dataloader import create_validation_loader
from src.evaluation.evaluator import (
    evaluate_single_checkpoint,
    save_evaluation_results,
)
from src.utils.config import load_config


def main(
    config_path: str = "configs/base.yaml",
    checkpoint_dir: str = "checkpoints/adaptive",
):
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
    print("ADAPTIVE MOD CHECKPOINT EVALUATION")
    print("=" * 60)

    val_loader = create_validation_loader(
        root_dir=root_dir,
        batch_size=1,
        num_workers=0,
        val_split_file=val_split,
    )
    print(f"Validation cases: {len(val_loader.dataset)}")

    ckpt_path = Path(checkpoint_dir)
    epoch_ckpts = sorted(glob.glob(str(ckpt_path / "epoch_*.pth")))

    if not epoch_ckpts:
        target = ckpt_path / "latest.pth"
        if target.exists():
            epoch_ckpts = [str(target)]
        else:
            print(f"No checkpoints found in {ckpt_path}. Please train first.")
            return

    best_mean_dice = -1.0
    best_eval = None
    all_evals = []

    for c_path in epoch_ckpts:
        fname = os.path.basename(c_path)
        print(f"\nEvaluating: {fname}")
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
        all_evals.append({"checkpoint": fname, "summary": summary})
        print(
            f"Mean Dice: {summary['mean_dice']:.4f} | "
            f"WT: {summary['WT_dice']:.4f}, TC: {summary['TC_dice']:.4f}, ET: {summary['ET_dice']:.4f}"
        )

        if summary["mean_dice"] > best_mean_dice:
            best_mean_dice = summary["mean_dice"]
            best_eval = res

    if best_eval is not None:
        best_name = os.path.basename(best_eval["checkpoint"])
        summary = best_eval["summary"]

        print("\n" + "=" * 60)
        print("BEST ADAPTIVE MOD CHECKPOINT")
        print("=" * 60)
        print(f"Checkpoint: {best_name}")
        print(f"Mean Dice:  {summary['mean_dice']:.4f}")

        # Update best.pth link
        best_ckpt_path = Path(best_eval["checkpoint"])
        best_link_target = ckpt_path / "best.pth"
        if best_link_target.exists():
            best_link_target.unlink()
        try:
            os.link(best_ckpt_path, best_link_target)
            print(f"Linked {best_link_target} -> {best_ckpt_path.name}")
        except Exception:
            import shutil
            shutil.copyfile(best_ckpt_path, best_link_target)
            print(f"Copied {best_ckpt_path.name} -> {best_link_target}")

        print("\n" + "=" * 60)
        print("ADAPTIVE MOD EVALUATION SUMMARY")
        print("=" * 60)
        print(f"Mean Dice: {summary['mean_dice']:.4f}")
        print(f"WT Dice:   {summary['WT_dice']:.4f}")
        print(f"TC Dice:   {summary['TC_dice']:.4f}")
        print(f"ET Dice:   {summary['ET_dice']:.4f}")
        print(f"Mean HD95: {summary['mean_hd95']:.4f}")

        # Baseline comparison
        baseline_dice = 0.6887
        diff = summary["mean_dice"] - baseline_dice
        print("\n" + "-" * 60)
        print("BASELINE vs ADAPTIVE MOD")
        print("-" * 60)
        print(f"Baseline Mean Dice:     {baseline_dice:.4f}")
        print(f"Adaptive MOD Mean Dice: {summary['mean_dice']:.4f} ({'+' if diff >= 0 else ''}{diff:.4f})")
        print("=" * 60 + "\n")

        save_evaluation_results(
            experiment_name="adaptive",
            summary_metrics=summary,
            subject_metrics=best_eval["subjects"],
            output_dir="results",
            checkpoint_history=all_evals,
        )


if __name__ == "__main__":
    main()
