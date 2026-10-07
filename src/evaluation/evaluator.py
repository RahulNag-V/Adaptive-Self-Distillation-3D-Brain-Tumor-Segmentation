"""Unified Evaluation Engine for 3D Brain Tumor Segmentation models.

Supports full-volume sliding-window validation across:
- Baseline UNETR
- Online Tokenizer
- Dense Predictor
- Full MOD
- Adaptive MOD
"""

from pathlib import Path
import csv
import json
import os
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np
import torch
from monai.inferers import sliding_window_inference

from src.data.val_dataloader import create_validation_loader
from src.evaluation.metrics import calculate_brats_metrics
from src.models.unetr_baseline import UNETRBaseline


def load_model_from_checkpoint(
    checkpoint_path: Union[str, Path],
    device: str = "cuda",
) -> Tuple[UNETRBaseline, Dict[str, Any]]:
    """Loads UNETR model and metadata from a saved checkpoint."""
    ckpt_path = Path(checkpoint_path)
    if not ckpt_path.exists():
        raise FileNotFoundError(f"Checkpoint not found: {ckpt_path}")

    checkpoint = torch.load(ckpt_path, map_location=device, weights_only=False)

    model = UNETRBaseline(in_channels=4, out_channels=4)

    # Determine state dict key
    if isinstance(checkpoint, dict):
        if "model_state_dict" in checkpoint:
            state_dict = checkpoint["model_state_dict"]
        elif "student_state_dict" in checkpoint:
            state_dict = checkpoint["student_state_dict"]
        else:
            state_dict = checkpoint
    else:
        state_dict = checkpoint

    model.load_state_dict(state_dict)
    model.to(device)
    model.eval()

    return model, checkpoint if isinstance(checkpoint, dict) else {}


def evaluate_single_checkpoint(
    checkpoint_path: Union[str, Path],
    val_loader,
    device: str = "cuda",
    roi_size: Tuple[int, int, int] = (96, 96, 96),
    sw_batch_size: int = 1,
    overlap: float = 0.25,
    verbose: bool = False,
) -> Dict[str, Any]:
    """Runs sliding-window validation on all subjects in val_loader for one checkpoint."""
    model, metadata = load_model_from_checkpoint(checkpoint_path, device=device)

    all_results = {
        "WT": {"dice": [], "hd95": []},
        "TC": {"dice": [], "hd95": []},
        "ET": {"dice": [], "hd95": []},
    }
    subject_details = []

    with torch.no_grad():
        for idx, batch in enumerate(val_loader):
            patient_id = batch["patient_id"][0]
            images = batch["image"].to(device, non_blocking=True)
            labels = batch["label"].to(device, non_blocking=True)

            outputs = sliding_window_inference(
                inputs=images,
                roi_size=roi_size,
                sw_batch_size=sw_batch_size,
                predictor=model,
                overlap=overlap,
            )

            predictions = torch.argmax(outputs, dim=1, keepdim=True)
            metrics = calculate_brats_metrics(prediction=predictions, target=labels)

            subj_res = {"patient_id": patient_id}
            for region in ["WT", "TC", "ET"]:
                d = float(metrics[region]["dice"])
                h = float(metrics[region]["hd95"])
                all_results[region]["dice"].append(d)
                subj_res[f"{region}_dice"] = d

                if np.isfinite(h):
                    all_results[region]["hd95"].append(h)
                    subj_res[f"{region}_hd95"] = h
                else:
                    subj_res[f"{region}_hd95"] = None

            subj_res["mean_dice"] = float(
                np.mean([subj_res[f"{r}_dice"] for r in ["WT", "TC", "ET"]])
            )
            valid_hd = [
                subj_res[f"{r}_hd95"]
                for r in ["WT", "TC", "ET"]
                if subj_res[f"{r}_hd95"] is not None
            ]
            subj_res["mean_hd95"] = float(np.mean(valid_hd)) if valid_hd else None
            subject_details.append(subj_res)

            if verbose:
                print(
                    f"[{idx+1}/{len(val_loader)}] {patient_id} - "
                    f"WT: {subj_res['WT_dice']:.4f}, TC: {subj_res['TC_dice']:.4f}, ET: {subj_res['ET_dice']:.4f} | "
                    f"Mean Dice: {subj_res['mean_dice']:.4f}"
                )

    summary = {}
    for region in ["WT", "TC", "ET"]:
        d_vals = all_results[region]["dice"]
        h_vals = all_results[region]["hd95"]
        summary[f"{region}_dice"] = float(np.mean(d_vals)) if d_vals else 0.0
        summary[f"{region}_hd95"] = float(np.mean(h_vals)) if h_vals else float("nan")

    summary["mean_dice"] = float(
        np.mean([summary[f"{r}_dice"] for r in ["WT", "TC", "ET"]])
    )
    valid_hd = [
        summary[f"{r}_hd95"]
        for r in ["WT", "TC", "ET"]
        if np.isfinite(summary[f"{r}_hd95"])
    ]
    summary["mean_hd95"] = float(np.mean(valid_hd)) if valid_hd else float("nan")

    return {
        "checkpoint": str(checkpoint_path),
        "summary": summary,
        "subjects": subject_details,
        "metadata": {
            k: v
            for k, v in metadata.items()
            if isinstance(v, (int, float, str, bool, list, dict))
        },
    }


def save_evaluation_results(
    experiment_name: str,
    summary_metrics: Dict[str, Any],
    subject_metrics: Optional[List[Dict[str, Any]]] = None,
    output_dir: Union[str, Path] = "results",
    checkpoint_history: Optional[List[Dict[str, Any]]] = None,
) -> Path:
    """Saves metrics.csv, metrics.json, and summary.txt into results/<experiment_name>/."""
    exp_dir = Path(output_dir) / experiment_name
    exp_dir.mkdir(parents=True, exist_ok=True)

    # 1. metrics.json
    json_path = exp_dir / "metrics.json"
    full_payload = {
        "experiment": experiment_name,
        "summary": summary_metrics,
        "subjects": subject_metrics or [],
        "epoch_evaluations": checkpoint_history or [],
    }
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(full_payload, f, indent=2)

    # 2. metrics.csv
    csv_path = exp_dir / "metrics.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Metric", "Value"])
        for k, v in summary_metrics.items():
            if isinstance(v, float):
                writer.writerow([k, f"{v:.4f}"])
            else:
                writer.writerow([k, v])

    # 3. summary.txt
    txt_path = exp_dir / "summary.txt"
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(f"============================================================\n")
        f.write(f"EXPERIMENT EVALUATION SUMMARY: {experiment_name.upper()}\n")
        f.write(f"============================================================\n\n")
        f.write(f"Mean Dice: {summary_metrics.get('mean_dice', 0.0):.4f}\n")
        f.write(f"WT Dice:   {summary_metrics.get('WT_dice', 0.0):.4f}\n")
        f.write(f"TC Dice:   {summary_metrics.get('TC_dice', 0.0):.4f}\n")
        f.write(f"ET Dice:   {summary_metrics.get('ET_dice', 0.0):.4f}\n")
        mean_hd = summary_metrics.get('mean_hd95')
        if mean_hd is not None and np.isfinite(mean_hd):
            f.write(f"Mean HD95: {mean_hd:.4f}\n")
        else:
            f.write("Mean HD95: N/A\n")
        for r in ["WT", "TC", "ET"]:
            hd = summary_metrics.get(f"{r}_hd95")
            if hd is not None and np.isfinite(hd):
                f.write(f"{r} HD95:   {hd:.4f}\n")

    print(f"Results successfully saved for '{experiment_name}' in {exp_dir}:")
    print(f"  - {json_path}")
    print(f"  - {csv_path}")
    print(f"  - {txt_path}")

    return exp_dir


def print_comparison_banner(experiment_name: str, summary: Dict[str, Any], baseline_summary: Optional[Dict[str, Any]] = None):
    """Prints standard evaluation summary and comparison banner."""
    title = experiment_name.replace("_", " ").upper()
    print("\n" + "=" * 60)
    print(f"{title} EVALUATION SUMMARY")
    print("=" * 60)
    print(f"Mean Dice: {summary.get('mean_dice', 0.0):.4f}")
    print(f"WT Dice:   {summary.get('WT_dice', 0.0):.4f}")
    print(f"TC Dice:   {summary.get('TC_dice', 0.0):.4f}")
    print(f"ET Dice:   {summary.get('ET_dice', 0.0):.4f}")
    m_hd = summary.get('mean_hd95')
    if m_hd is not None and np.isfinite(m_hd):
        print(f"Mean HD95: {m_hd:.4f}")

    if baseline_summary:
        print("\n" + "-" * 60)
        print(f"BASELINE vs {title}")
        print("-" * 60)
        b_dice = baseline_summary.get('mean_dice', 0.0)
        m_dice = summary.get('mean_dice', 0.0)
        diff = m_dice - b_dice
        print(f"Baseline Mean Dice:  {b_dice:.4f}")
        print(f"{title} Mean Dice: {m_dice:.4f} ({'+' if diff >= 0 else ''}{diff:.4f})")
        print("=" * 60 + "\n")
