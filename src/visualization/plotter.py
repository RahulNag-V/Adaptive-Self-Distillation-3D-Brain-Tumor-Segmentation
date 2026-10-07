"""Visualization utilities for 3D Brain Tumor Segmentation."""

from pathlib import Path
from typing import Dict, List, Optional, Union
import matplotlib.pyplot as plt
import numpy as np


def plot_loss_curves(
    history_dict: Dict[str, List[float]],
    output_path: Union[str, Path] = "results/figures/training_loss_comparison.png",
    title: str = "Training Loss Curves Across Experiments",
):
    """Plots training loss curves for multiple models."""
    plt.figure(figsize=(10, 6), dpi=300)
    
    colors = {
        "Baseline": "#2563EB",
        "Online Tokenizer": "#10B981",
        "Full MOD": "#DC2626",
        "Dense Predictor": "#8B5CF6",
    }
    
    for model_name, losses in history_dict.items():
        epochs = list(range(1, len(losses) + 1))
        color = colors.get(model_name, None)
        plt.plot(epochs, losses, marker='o', linewidth=2, label=model_name, color=color)
        
    plt.xlabel("Epoch", fontsize=12, fontweight='bold')
    plt.ylabel("Total Training Loss", fontsize=12, fontweight='bold')
    plt.title(title, fontsize=14, fontweight='bold')
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.legend(fontsize=11)
    plt.tight_layout()
    
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(out, dpi=300)
    plt.close()
    print(f"Saved: {out}")


def plot_mod_loss_breakdown(
    epochs: List[int],
    total_loss: List[float],
    seg_loss: List[float],
    ot_loss: List[float],
    dp_loss: List[float],
    mod_loss: List[float],
    output_path: Union[str, Path] = "results/figures/mod_loss_breakdown.png",
):
    """Plots fine-grained MOD loss components across epochs."""
    plt.figure(figsize=(10, 6), dpi=300)
    plt.plot(epochs, total_loss, marker='o', linewidth=2.5, color='#DC2626', label='Total Loss (Seg + MOD)')
    plt.plot(epochs, seg_loss,   marker='s', linewidth=2.0, color='#2563EB', label='Segmentation Loss (DiceFocal)')
    plt.plot(epochs, mod_loss,   marker='^', linewidth=2.0, color='#D97706', label='MOD Loss (OT + DP)')
    plt.plot(epochs, dp_loss,    marker='d', linewidth=1.8, linestyle='--', color='#7C3AED', label='Dense Predictor Loss')
    plt.plot(epochs, ot_loss,    marker='x', linewidth=1.8, linestyle=':', color='#059669', label='Online Tokenizer Loss')

    plt.xlabel('Epoch', fontsize=12, fontweight='bold')
    plt.ylabel('Loss Value', fontsize=12, fontweight='bold')
    plt.title('MOD 10-Epoch Multi-Objective Loss Trajectory', fontsize=14, fontweight='bold')
    plt.grid(True, linestyle='--', alpha=0.6)
    plt.xticks(epochs)
    plt.legend(fontsize=10, loc='upper right')
    plt.tight_layout()

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(out, dpi=300)
    plt.close()
    print(f"Saved: {out}")


def plot_dice_comparison(
    models: List[str],
    mean_dice: List[float],
    output_path: Union[str, Path] = "results/figures/mean_dice_comparison.png",
):
    """Plots Mean Dice comparison bar chart."""
    plt.figure(figsize=(8, 5), dpi=300)
    colors = ["#2563EB", "#10B981", "#DC2626"][:len(models)]
    bars = plt.bar(models, mean_dice, color=colors, width=0.45, edgecolor="black", linewidth=1.2)
    
    for bar in bars:
        h = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., h + 0.015, f"{h:.4f}",
                 ha="center", va="bottom", fontsize=11, fontweight="bold")
        
    plt.ylabel("Mean Dice Score", fontsize=12, fontweight='bold')
    plt.title("Mean Dice Score Comparison (BraTS 2021 Subset)", fontsize=13, fontweight='bold')
    plt.ylim(0, 1.0)
    plt.grid(axis='y', linestyle='--', alpha=0.6)
    plt.tight_layout()
    
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(out, dpi=300)
    plt.close()
    print(f"Saved: {out}")


def plot_hd95_comparison(
    models: List[str],
    mean_hd95: List[float],
    output_path: Union[str, Path] = "results/figures/hd95_comparison.png",
):
    """Plots Mean HD95 boundary distance comparison (lower is better)."""
    plt.figure(figsize=(8, 5), dpi=300)
    colors = ["#2563EB", "#10B981", "#DC2626"][:len(models)]
    bars = plt.bar(models, mean_hd95, color=colors, width=0.45, edgecolor="black", linewidth=1.2)
    
    for bar in bars:
        h = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2., h + 1.2, f"{h:.2f} mm",
                 ha="center", va="bottom", fontsize=11, fontweight="bold")
        
    plt.ylabel("Mean HD95 (mm) [Lower is Better]", fontsize=12, fontweight='bold')
    plt.title("95% Hausdorff Distance Comparison (Mean HD95)", fontsize=13, fontweight='bold')
    plt.ylim(0, max(mean_hd95) * 1.25)
    plt.grid(axis='y', linestyle='--', alpha=0.6)
    plt.tight_layout()
    
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(out, dpi=300)
    plt.close()
    print(f"Saved: {out}")


def plot_region_dice_comparison(
    models: List[str],
    wt_dice: List[float],
    tc_dice: List[float],
    et_dice: List[float],
    output_path: Union[str, Path] = "results/figures/region_dice_comparison.png",
):
    """Plots sub-region (WT, TC, ET) Dice comparison grouped bar chart."""
    x = np.arange(len(models))
    width = 0.25
    
    plt.figure(figsize=(10, 6), dpi=300)
    plt.bar(x - width, wt_dice, width, label='Whole Tumor (WT)', color='#3B82F6', edgecolor='black')
    plt.bar(x, tc_dice, width, label='Tumor Core (TC)', color='#10B981', edgecolor='black')
    plt.bar(x + width, et_dice, width, label='Enhancing Tumor (ET)', color='#F59E0B', edgecolor='black')
    
    plt.ylabel('Dice Score', fontsize=12, fontweight='bold')
    plt.title('Sub-Region Segmentation Performance (WT, TC, ET)', fontsize=14, fontweight='bold')
    plt.xticks(x, models, fontsize=11, fontweight='bold')
    plt.ylim(0, 1.0)
    plt.legend(fontsize=11)
    plt.grid(axis='y', linestyle='--', alpha=0.6)
    plt.tight_layout()
    
    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(out, dpi=300)
    plt.close()
    print(f"Saved: {out}")
