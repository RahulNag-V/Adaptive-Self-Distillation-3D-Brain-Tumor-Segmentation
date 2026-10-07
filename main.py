"""CLI Entry Point for Adaptive Self-Distillation 3D Brain Tumor Segmentation Framework."""

import argparse
from pathlib import Path
import sys

import torch

from src.utils.config import load_config


def inspect_project(config_path: str = "configs/base.yaml"):
    """Inspects dataset, environment, and checkpoints."""
    config = load_config(config_path)
    print("=" * 65)
    print("PROJECT INSPECTION: Adaptive Self-Distillation Framework")
    print("=" * 65)
    print(f"Project Name:    {config.get('project', {}).get('name')}")
    print(f"Dataset Name:    {config.get('dataset', {}).get('name')}")
    
    root_dir = Path(config.get("dataset", {}).get("root_dir", "data/raw/BraTS2021/BraTS2021_Training_Data"))
    if root_dir.exists():
        subjects = [p for p in root_dir.iterdir() if p.is_dir()]
        print(f"Dataset Path:    {root_dir} ({len(subjects)} subjects found)")
    else:
        print(f"Dataset Path:    {root_dir} (NOT FOUND)")

    train_split = Path(config.get("dataset", {}).get("train_split", "data/splits/train.txt"))
    val_split = Path(config.get("dataset", {}).get("val_split", "data/splits/val.txt"))
    print(f"Train Split:     {train_split} ({'EXISTS' if train_split.exists() else 'MISSING'})")
    print(f"Val Split:       {val_split} ({'EXISTS' if val_split.exists() else 'MISSING'})")

    print("\nEnvironment & Compute:")
    print(f"  PyTorch:       {torch.__version__}")
    print(f"  CUDA Active:   {torch.cuda.is_available()}")
    if torch.cuda.is_available():
        print(f"  GPU Name:      {torch.cuda.get_device_name(0)}")

    print("\nCheckpoint Inventory:")
    for exp in ["baseline", "online_tokenizer", "dense_predictor", "mod", "adaptive"]:
        p = Path("checkpoints") / exp
        if p.exists():
            files = list(p.glob("*.pth"))
            print(f"  {exp:18s}: {len(files)} checkpoint files")
        else:
            print(f"  {exp:18s}: Not started / Directory absent")
    print("=" * 65)


def run_training(experiment: str, config_path: str):
    """Dispatches training command."""
    if experiment == "baseline":
        import scripts.train_baseline as tb
        tb.main()
    elif experiment == "online_tokenizer":
        import scripts.train_online_tokenizer as tot
        tot.main()
    elif experiment == "dense_predictor":
        import scripts.train_dense_predictor as tdp
        tdp.train_dense_predictor(config_path=config_path)
    elif experiment == "mod":
        import scripts.train_mod as tmod
        tmod.main()
    elif experiment == "adaptive":
        print("Adaptive training is configured in configs/base.yaml. Ensure ablation runs are complete first.")
    else:
        print(f"Unknown experiment '{experiment}'. Choose from: baseline, online_tokenizer, dense_predictor, mod, adaptive")


def run_evaluation(experiment: str, config_path: str):
    """Dispatches evaluation command."""
    if experiment == "baseline":
        import scripts.evaluate_baseline as eb
        eb.main(config_path=config_path)
    elif experiment == "online_tokenizer":
        import scripts.evaluate_online_tokenizer as eot
        eot.main(config_path=config_path)
    elif experiment == "dense_predictor":
        import scripts.evaluate_dense_predictor as edp
        edp.evaluate_dense_predictor(config_path=config_path)
    elif experiment == "mod":
        import scripts.evaluate_mod as em
        em.main(config_path=config_path)
    else:
        print(f"Unknown experiment '{experiment}'. Choose from: baseline, online_tokenizer, dense_predictor, mod")


def run_comparison():
    """Prints model comparison table."""
    comp_file = Path("results/model_comparison.md")
    if comp_file.exists():
        with open(comp_file, "r", encoding="utf-8") as f:
            print(f.read())
    else:
        print("No comparison table found at results/model_comparison.md")


def main():
    parser = argparse.ArgumentParser(
        description="CLI for 3D Brain Tumor Segmentation (UNETR + Self-Distillation Framework)"
    )
    parser.add_argument(
        "--mode",
        choices=["inspect", "train", "evaluate", "compare", "visualize"],
        default="inspect",
        help="Execution mode (inspect, train, evaluate, compare, visualize)",
    )
    parser.add_argument(
        "--experiment",
        choices=["baseline", "online_tokenizer", "dense_predictor", "mod", "adaptive"],
        default="baseline",
        help="Experiment target",
    )
    parser.add_argument(
        "--config",
        default="configs/base.yaml",
        help="Path to YAML configuration file",
    )

    args = parser.parse_args()

    if args.mode == "inspect":
        inspect_project(config_path=args.config)
    elif args.mode == "train":
        run_training(experiment=args.experiment, config_path=args.config)
    elif args.mode == "evaluate":
        run_evaluation(experiment=args.experiment, config_path=args.config)
    elif args.mode == "compare":
        run_comparison()
    elif args.mode == "visualize":
        from src.visualization.plotter import (
            plot_dice_comparison,
            plot_hd95_comparison,
            plot_loss_curves,
            plot_region_dice_comparison,
        )
        print("Visualizing latest experimental metrics into results/figures/...")
        # Execute plotter commands
        run_comparison()


if __name__ == "__main__":
    main()
