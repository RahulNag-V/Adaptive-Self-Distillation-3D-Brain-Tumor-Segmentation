"""Adaptive Self-Distillation (Adaptive MOD) Training Script — Storage-Safe Mode.

Formulation:
    L_total = L_seg + lambda_ot(t) * L_OT + lambda_dp(t) * L_DP

Adaptive update rule (once per epoch):
    seg_ema(t) = 0.90 * seg_ema(t-1) + 0.10 * L_seg(t)
    ot_ema(t) = 0.90 * ot_ema(t-1) + 0.10 * L_OT(t)
    dp_ema(t) = 0.90 * dp_ema(t-1) + 0.10 * L_DP(t)
    target_ot = seg_ema / (ot_ema + 1e-6)
    target_dp = seg_ema / (dp_ema + 1e-6)
    lambda_ot = clip(0.90 * previous_lambda_ot + 0.10 * target_ot, 0.10, 2.00)
    lambda_dp = clip(0.90 * previous_lambda_dp + 0.10 * target_dp, 0.10, 2.00)

Storage-Safe Mode:
- Saves ONLY checkpoints/adaptive/best.pth and checkpoints/adaptive/latest.pth.
- Does NOT create permanent epoch_XX.pth files, keeping storage strictly below 4 GB.
- Selects best.pth based on highest validation Mean Dice across the 10 validation subjects.
"""

from pathlib import Path
import copy
import csv
import json
import os
import sys
import time
from typing import Dict, Any, Tuple, List

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import numpy as np
import torch
from monai.inferers import sliding_window_inference
from monai.losses import DiceFocalLoss
from tqdm import tqdm

from src.data.dataloader import create_dataloaders
from src.data.val_dataloader import create_validation_loader
from src.evaluation.metrics import calculate_brats_metrics
from src.losses.dense_predictor import DensePredictorLoss
from src.losses.online_tokenizer import OnlineTokenizerLoss
from src.models.dense_predictor import DensePredictor
from src.models.ema import update_ema
from src.models.unetr_baseline import UNETRBaseline
from src.models.unetr_tokens import UNETRTokenExtractor
from src.training.masking import PatchMaskGenerator
from src.utils.config import load_config


def evaluate_model_full_volume(
    model: torch.nn.Module,
    val_loader,
    device: torch.device,
    roi_size: Tuple[int, int, int] = (96, 96, 96),
    sw_batch_size: int = 1,
    overlap: float = 0.25,
) -> Tuple[Dict[str, float], List[Dict[str, Any]]]:
    """Evaluates model using sliding-window inference on 10 validation subjects."""
    model.eval()
    all_results = {
        "WT": {"dice": [], "hd95": []},
        "TC": {"dice": [], "hd95": []},
        "ET": {"dice": [], "hd95": []},
    }
    subject_details = []

    with torch.no_grad():
        for batch in val_loader:
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

    return summary, subject_details


def train_adaptive_storage_safe(config_path: str = "configs/base.yaml"):
    config = load_config(config_path)

    ds_cfg = config.get("dataset", {})
    root_dir = ds_cfg.get("root_dir", "data/raw/BraTS2021/BraTS2021_Training_Data")
    patch_size = tuple(ds_cfg.get("patch_size", [96, 96, 96]))
    batch_size = ds_cfg.get("batch_size", 1)
    num_workers = ds_cfg.get("num_workers", 0)
    seed = config.get("training", {}).get("seed", 42)

    epochs = config.get("training", {}).get("epochs", 10)
    lr = float(config.get("optimizer", {}).get("learning_rate", 1e-4))
    weight_decay = float(config.get("optimizer", {}).get("weight_decay", 5e-5))

    dp_cfg = config.get("dense_predictor", {})
    token_patch_size = tuple(dp_cfg.get("patch_size", [16, 16, 16]))
    mask_ratio = config.get("mod", {}).get("mask_ratio", 0.60)
    ema_momentum = float(config.get("mod", {}).get("ema_momentum", 0.996))

    eval_cfg = config.get("evaluation", {})
    roi_size = tuple(eval_cfg.get("roi_size", [96, 96, 96]))
    sw_batch_size = eval_cfg.get("sw_batch_size", 1)
    overlap = float(eval_cfg.get("overlap", 0.25))

    ckpt_dir = Path("checkpoints/adaptive")
    ckpt_dir.mkdir(parents=True, exist_ok=True)

    results_dir = Path("results/adaptive")
    results_dir.mkdir(parents=True, exist_ok=True)
    figures_dir = Path("results/figures")
    figures_dir.mkdir(parents=True, exist_ok=True)

    device = torch.device(config.get("hardware", {}).get("device", "cuda") if torch.cuda.is_available() else "cpu")

    print("=" * 70)
    print("FULL ADAPTIVE SELF-DISTILLATION TRAINING — STORAGE-SAFE MODE")
    print("=" * 70)
    print(f"Device:               {device}")
    if device.type == "cuda":
        torch.cuda.reset_peak_memory_stats(device)
        print(f"GPU:                  {torch.cuda.get_device_name(0)}")
    print(f"Epochs:               {epochs}")
    print(f"Checkpoint policy:    ONLY best.pth & latest.pth (Storage-Safe)")
    print(f"Results Directory:    {results_dir}")
    print("=" * 70)

    torch.manual_seed(seed)
    if device.type == "cuda":
        torch.cuda.manual_seed(seed)

    # 1. Dataloaders
    train_loader, _ = create_dataloaders(
        root_dir=root_dir,
        patch_size=patch_size,
        batch_size=batch_size,
        num_workers=num_workers,
        seed=seed,
        train_split_file=ds_cfg.get("train_split", "data/splits/train.txt"),
        val_split_file=ds_cfg.get("val_split", "data/splits/val.txt"),
    )

    val_loader = create_validation_loader(
        root_dir=root_dir,
        batch_size=1,
        num_workers=0,
        val_split_file=ds_cfg.get("val_split", "data/splits/val.txt"),
    )

    # 2. Models
    student = UNETRBaseline(in_channels=4, out_channels=4).to(device)
    teacher = copy.deepcopy(student).to(device)
    teacher.eval()
    for p in teacher.parameters():
        p.requires_grad = False

    student_tokens = UNETRTokenExtractor(student)
    teacher_tokens = UNETRTokenExtractor(teacher)

    dense_predictor = DensePredictor(
        hidden_size=768, in_channels=4, patch_size=token_patch_size
    ).to(device)
    mask_generator = PatchMaskGenerator(
        image_size=patch_size, patch_size=token_patch_size, mask_ratio=mask_ratio
    )

    # 3. Losses
    seg_loss_fn = DiceFocalLoss(softmax=True, to_onehot_y=True)
    online_tokenizer_loss_fn = OnlineTokenizerLoss()
    dense_predictor_loss_fn = DensePredictorLoss(patch_size=token_patch_size)

    # 4. Optimizer & Scaler
    params = list(student.parameters()) + list(dense_predictor.parameters())
    optimizer = torch.optim.AdamW(params, lr=lr, weight_decay=weight_decay)
    scaler = torch.amp.GradScaler("cuda", enabled=(device.type == "cuda"))

    # Dynamic lambdas & EMA loss tracking
    lambda_ot = 1.0
    lambda_dp = 1.0
    epsilon = 1e-6

    l_seg_ema = None
    l_ot_ema = None
    l_dp_ema = None

    best_mean_dice = -1.0
    best_epoch = -1
    best_eval_res = None

    training_history = []
    validation_history = []
    total_start_time = time.time()

    for epoch in range(1, epochs + 1):
        epoch_start_time = time.time()
        student.train()
        dense_predictor.train()

        lambda_ot_before = float(lambda_ot)
        lambda_dp_before = float(lambda_dp)

        running_total_loss = 0.0
        running_seg_loss = 0.0
        running_ot_loss = 0.0
        running_dp_loss = 0.0
        running_mod_loss = 0.0

        pbar = tqdm(train_loader, desc=f"Epoch {epoch:02d}/{epochs:02d} [Train]")

        for step, batch in enumerate(pbar):
            images = batch["image"].to(device, non_blocking=True)
            labels = batch["label"].to(device, non_blocking=True)

            optimizer.zero_grad(set_to_none=True)
            mask = mask_generator(batch_size=images.shape[0], device=device)

            with torch.amp.autocast(device_type=device.type, dtype=torch.float16, enabled=(device.type == "cuda")):
                # Student forward
                seg_output = student(images)
                seg_loss = seg_loss_fn(seg_output, labels)

                s_tokens, _ = student_tokens(images, mask=mask)
                recon = dense_predictor(s_tokens, image_size=images.shape[2:])
                dp_loss = dense_predictor_loss_fn(recon, images, mask)

                # Teacher forward
                with torch.no_grad():
                    t_tokens, _ = teacher_tokens(images, mask=None)

                ot_loss = online_tokenizer_loss_fn(s_tokens, t_tokens, mask)

                # Adaptive combined loss using active lambdas
                mod_loss = lambda_ot_before * ot_loss + lambda_dp_before * dp_loss
                total_loss = seg_loss + mod_loss

            scaler.scale(total_loss).backward()
            scaler.step(optimizer)
            scaler.update()

            # Update teacher with EMA
            update_ema(student=student, teacher=teacher, momentum=ema_momentum)

            running_total_loss += total_loss.item()
            running_seg_loss += seg_loss.item()
            running_ot_loss += ot_loss.item()
            running_dp_loss += dp_loss.item()
            running_mod_loss += mod_loss.item()

            pbar.set_postfix(
                total=f"{total_loss.item():.4f}",
                seg=f"{seg_loss.item():.4f}",
                ot=f"{ot_loss.item():.4f}",
                dp=f"{dp_loss.item():.4f}",
                l_ot=f"{lambda_ot_before:.3f}",
                l_dp=f"{lambda_dp_before:.3f}",
            )

        epoch_train_time = time.time() - epoch_start_time
        gpu_peak_gb = torch.cuda.max_memory_allocated(device) / (1024**3) if device.type == "cuda" else 0.0

        epoch_total = running_total_loss / len(train_loader)
        epoch_seg = running_seg_loss / len(train_loader)
        epoch_ot = running_ot_loss / len(train_loader)
        epoch_dp = running_dp_loss / len(train_loader)
        epoch_mod = running_mod_loss / len(train_loader)

        # --- ADAPTIVE WEIGHT UPDATE RULE (for next epoch) ---
        if l_seg_ema is None:
            l_seg_ema = epoch_seg
            l_ot_ema = epoch_ot
            l_dp_ema = epoch_dp
        else:
            l_seg_ema = 0.90 * l_seg_ema + 0.10 * epoch_seg
            l_ot_ema = 0.90 * l_ot_ema + 0.10 * epoch_ot
            l_dp_ema = 0.90 * l_dp_ema + 0.10 * epoch_dp

        target_ot = l_seg_ema / (l_ot_ema + epsilon)
        target_dp = l_seg_ema / (l_dp_ema + epsilon)

        lambda_ot_after = float(np.clip(0.90 * lambda_ot_before + 0.10 * target_ot, 0.10, 2.00))
        lambda_dp_after = float(np.clip(0.90 * lambda_dp_before + 0.10 * target_dp, 0.10, 2.00))

        training_history.append({
            "epoch": epoch,
            "segmentation_loss": f"{epoch_seg:.6f}",
            "online_tokenizer_loss": f"{epoch_ot:.6f}",
            "dense_predictor_loss": f"{epoch_dp:.6f}",
            "mod_loss": f"{epoch_mod:.6f}",
            "total_loss": f"{epoch_total:.6f}",
            "lambda_ot_before": f"{lambda_ot_before:.6f}",
            "lambda_dp_before": f"{lambda_dp_before:.6f}",
            "lambda_ot_after": f"{lambda_ot_after:.6f}",
            "lambda_dp_after": f"{lambda_dp_after:.6f}",
            "training_time_seconds": f"{epoch_train_time:.2f}",
            "gpu_peak_memory_gb": f"{gpu_peak_gb:.2f}",
        })

        print(
            f"\nEpoch {epoch:02d} Train Loss -> "
            f"Total: {epoch_total:.4f} | Seg: {epoch_seg:.4f} | "
            f"OT: {epoch_ot:.4f} | DP: {epoch_dp:.4f} | MOD: {epoch_mod:.4f}\n"
            f"  Lambda OT: Before={lambda_ot_before:.4f} -> After={lambda_ot_after:.4f} (Target={target_ot:.4f})\n"
            f"  Lambda DP: Before={lambda_dp_before:.4f} -> After={lambda_dp_after:.4f} (Target={target_dp:.4f})"
        )

        # --- VALIDATION (Full Volume Sliding Window) ---
        print(f"Running validation for Epoch {epoch:02d} on {len(val_loader.dataset)} subjects...")
        val_summary, val_subjects = evaluate_model_full_volume(
            model=student,
            val_loader=val_loader,
            device=device,
            roi_size=roi_size,
            sw_batch_size=sw_batch_size,
            overlap=overlap,
        )

        validation_history.append({
            "epoch": epoch,
            "WT_Dice": f"{val_summary['WT_dice']:.4f}",
            "TC_Dice": f"{val_summary['TC_dice']:.4f}",
            "ET_Dice": f"{val_summary['ET_dice']:.4f}",
            "Mean_Dice": f"{val_summary['mean_dice']:.4f}",
            "WT_HD95": f"{val_summary['WT_hd95']:.4f}" if np.isfinite(val_summary['WT_hd95']) else "N/A",
            "TC_HD95": f"{val_summary['TC_hd95']:.4f}" if np.isfinite(val_summary['TC_hd95']) else "N/A",
            "ET_HD95": f"{val_summary['ET_hd95']:.4f}" if np.isfinite(val_summary['ET_hd95']) else "N/A",
            "Mean_HD95": f"{val_summary['mean_hd95']:.4f}" if np.isfinite(val_summary['mean_hd95']) else "N/A",
        })

        print(
            f"Epoch {epoch:02d} Val Results -> "
            f"Mean Dice: {val_summary['mean_dice']:.4f} | "
            f"WT: {val_summary['WT_dice']:.4f}, TC: {val_summary['TC_dice']:.4f}, ET: {val_summary['ET_dice']:.4f} | "
            f"Mean HD95: {val_summary['mean_hd95']:.4f}"
        )

        checkpoint_data = {
            "epoch": epoch,
            "student_state_dict": student.state_dict(),
            "teacher_state_dict": teacher.state_dict(),
            "dense_predictor_state_dict": dense_predictor.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "losses": {
                "segmentation_loss": epoch_seg,
                "online_tokenizer_loss": epoch_ot,
                "dense_predictor_loss": epoch_dp,
                "mod_loss": epoch_mod,
                "total_loss": epoch_total,
            },
            "segmentation_loss": epoch_seg,
            "online_tokenizer_loss": epoch_ot,
            "dense_predictor_loss": epoch_dp,
            "mod_loss": epoch_mod,
            "total_loss": epoch_total,
            "lambda_ot": lambda_ot_before,
            "lambda_dp": lambda_dp_before,
            "lambda_ot_before": lambda_ot_before,
            "lambda_dp_before": lambda_dp_before,
            "lambda_ot_after": lambda_ot_after,
            "lambda_dp_after": lambda_dp_after,
            "val_summary": val_summary,
            "configuration": config,
        }

        # 1. Overwrite latest.pth
        latest_file = ckpt_dir / "latest.pth"
        torch.save(checkpoint_data, latest_file)

        # 2. Check if this is the best model based on validation Mean Dice
        if val_summary["mean_dice"] > best_mean_dice:
            best_mean_dice = val_summary["mean_dice"]
            best_epoch = epoch
            best_eval_res = {
                "epoch": epoch,
                "summary": val_summary,
                "subjects": val_subjects,
            }
            best_file = ckpt_dir / "best.pth"
            checkpoint_data["is_best"] = True
            torch.save(checkpoint_data, best_file)
            print(f"==> NEW BEST MODEL saved to {best_file} (Mean Dice: {best_mean_dice:.4f} at Epoch {epoch})")

        # Update lambda for subsequent epoch
        lambda_ot = lambda_ot_after
        lambda_dp = lambda_dp_after

    total_training_time = time.time() - total_start_time
    print("\n" + "=" * 70)
    print(f"ADAPTIVE TRAINING COMPLETE in {total_training_time:.2f}s ({total_training_time/60:.2f} min)")
    print(f"Best Epoch: {best_epoch} with Mean Dice: {best_mean_dice:.4f}")
    print("=" * 70)

    # 1. Save training_history.csv
    train_history_csv = results_dir / "training_history.csv"
    with open(train_history_csv, "w", newline="", encoding="utf-8") as f:
        fieldnames = [
            "epoch", "segmentation_loss", "online_tokenizer_loss",
            "dense_predictor_loss", "mod_loss", "total_loss",
            "lambda_ot_before", "lambda_dp_before", "lambda_ot_after", "lambda_dp_after",
            "training_time_seconds", "gpu_peak_memory_gb"
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(training_history)
    print(f"Saved: {train_history_csv}")

    # 2. Save validation_history.csv
    val_history_csv = results_dir / "validation_history.csv"
    with open(val_history_csv, "w", newline="", encoding="utf-8") as f:
        fieldnames = [
            "epoch", "WT_Dice", "TC_Dice", "ET_Dice", "Mean_Dice",
            "WT_HD95", "TC_HD95", "ET_HD95", "Mean_HD95"
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(validation_history)
    print(f"Saved: {val_history_csv}")

    # 3. Save metrics.json, metrics.csv, summary.txt for the best model
    if best_eval_res is not None:
        best_sum = best_eval_res["summary"]
        best_sub = best_eval_res["subjects"]

        metrics_json = results_dir / "metrics.json"
        with open(metrics_json, "w", encoding="utf-8") as f:
            json.dump({
                "experiment": "adaptive",
                "best_epoch": best_epoch,
                "summary": best_sum,
                "subjects": best_sub,
                "epoch_evaluations": validation_history,
            }, f, indent=2)
        print(f"Saved: {metrics_json}")

        metrics_csv = results_dir / "metrics.csv"
        with open(metrics_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["Metric", "Value"])
            writer.writerow(["best_epoch", best_epoch])
            for k, v in best_sum.items():
                if isinstance(v, float):
                    writer.writerow([k, f"{v:.4f}"])
                else:
                    writer.writerow([k, v])
        print(f"Saved: {metrics_csv}")

        summary_txt = results_dir / "summary.txt"
        with open(summary_txt, "w", encoding="utf-8") as f:
            f.write("============================================================\n")
            f.write("EXPERIMENT EVALUATION SUMMARY: ADAPTIVE SELF-DISTILLATION\n")
            f.write("============================================================\n\n")
            f.write(f"Best Epoch: {best_epoch}\n")
            f.write(f"Mean Dice:  {best_sum.get('mean_dice', 0.0):.4f}\n")
            f.write(f"WT Dice:    {best_sum.get('WT_dice', 0.0):.4f}\n")
            f.write(f"TC Dice:    {best_sum.get('TC_dice', 0.0):.4f}\n")
            f.write(f"ET Dice:    {best_sum.get('ET_dice', 0.0):.4f}\n")
            m_hd = best_sum.get('mean_hd95')
            if m_hd is not None and np.isfinite(m_hd):
                f.write(f"Mean HD95:  {m_hd:.4f}\n")
            else:
                f.write("Mean HD95:  N/A\n")
        print(f"Saved: {summary_txt}")

    # 4. Generate Figures
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    # Figure 1: Adaptive lambda trajectory
    fig_lambda = figures_dir / "adaptive_lambda_trajectory.png"
    epochs_axis = [0] + [int(r["epoch"]) for r in training_history]
    ot_vals = [1.0] + [float(r["lambda_ot_after"]) for r in training_history]
    dp_vals = [1.0] + [float(r["lambda_dp_after"]) for r in training_history]

    plt.figure(figsize=(10, 6), dpi=300)
    plt.plot(epochs_axis, ot_vals, marker="o", linewidth=2.5, color="#10B981", label=r"$\lambda_{ot}$ (Online Tokenizer)")
    plt.plot(epochs_axis, dp_vals, marker="s", linewidth=2.5, color="#7C3AED", label=r"$\lambda_{dp}$ (Dense Predictor)")
    plt.axhline(0.10, color="gray", linestyle=":", label="Lower Bound (0.10)")
    plt.axhline(2.00, color="red", linestyle="--", alpha=0.7, label="Upper Bound (2.00)")
    plt.xlabel("Epoch Transition", fontsize=12, fontweight="bold")
    plt.ylabel(r"Effective Loss Weight ($\lambda$)", fontsize=12, fontweight="bold")
    plt.title("Adaptive Self-Distillation: Dynamic Weight Trajectory (10 Epochs)", fontsize=14, fontweight="bold")
    plt.xticks(epochs_axis, ["Init (0)"] + [f"Epoch {r['epoch']}" for r in training_history])
    plt.ylim(0.0, 2.2)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.legend(fontsize=11, loc="center right")
    plt.tight_layout()
    plt.savefig(fig_lambda, dpi=300)
    plt.close()
    print(f"Saved figure: {fig_lambda}")

    # Figure 2: Validation Dice Trajectory
    fig_dice = figures_dir / "adaptive_validation_dice.png"
    e_nums = [int(r["epoch"]) for r in validation_history]
    wt_d = [float(r["WT_Dice"]) for r in validation_history]
    tc_d = [float(r["TC_Dice"]) for r in validation_history]
    et_d = [float(r["ET_Dice"]) for r in validation_history]
    mean_d = [float(r["Mean_Dice"]) for r in validation_history]

    plt.figure(figsize=(10, 6), dpi=300)
    plt.plot(e_nums, mean_d, marker="*", linewidth=3.0, color="#1E3A8A", label="Mean Dice")
    plt.plot(e_nums, wt_d, marker="o", linewidth=2.0, color="#2563EB", label="WT Dice")
    plt.plot(e_nums, tc_d, marker="s", linewidth=2.0, color="#059669", label="TC Dice")
    plt.plot(e_nums, et_d, marker="^", linewidth=2.0, color="#D97706", label="ET Dice")
    plt.axhline(0.6887, color="gray", linestyle="--", alpha=0.8, label="Baseline UNETR (0.6887)")
    plt.xlabel("Epoch", fontsize=12, fontweight="bold")
    plt.ylabel("Validation Dice Score", fontsize=12, fontweight="bold")
    plt.title("Adaptive Self-Distillation: Validation Dice Trajectory", fontsize=14, fontweight="bold")
    plt.xticks(e_nums)
    plt.ylim(0.40, 1.00)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.legend(fontsize=11, loc="lower right")
    plt.tight_layout()
    plt.savefig(fig_dice, dpi=300)
    plt.close()
    print(f"Saved figure: {fig_dice}")

    # Figure 3: Validation HD95 Trajectory
    fig_hd = figures_dir / "adaptive_validation_hd95.png"
    valid_hd_epochs = []
    wt_h, tc_h, et_h, mean_h = [], [], [], []
    for r in validation_history:
        try:
            m = float(r["Mean_HD95"])
            valid_hd_epochs.append(int(r["epoch"]))
            mean_h.append(m)
            wt_h.append(float(r["WT_HD95"]))
            tc_h.append(float(r["TC_HD95"]))
            et_h.append(float(r["ET_HD95"]))
        except (ValueError, TypeError):
            pass

    if valid_hd_epochs:
        plt.figure(figsize=(10, 6), dpi=300)
        plt.plot(valid_hd_epochs, mean_h, marker="*", linewidth=3.0, color="#991B1B", label="Mean HD95")
        plt.plot(valid_hd_epochs, wt_h, marker="o", linewidth=2.0, color="#DC2626", label="WT HD95")
        plt.plot(valid_hd_epochs, tc_h, marker="s", linewidth=2.0, color="#EA580C", label="TC HD95")
        plt.plot(valid_hd_epochs, et_h, marker="^", linewidth=2.0, color="#F59E0B", label="ET HD95")
        plt.xlabel("Epoch", fontsize=12, fontweight="bold")
        plt.ylabel("Hausdorff Distance 95 (voxels)", fontsize=12, fontweight="bold")
        plt.title("Adaptive Self-Distillation: Validation HD95 Trajectory", fontsize=14, fontweight="bold")
        plt.xticks(valid_hd_epochs)
        plt.grid(True, linestyle="--", alpha=0.6)
        plt.legend(fontsize=11, loc="upper right")
        plt.tight_layout()
        plt.savefig(fig_hd, dpi=300)
        plt.close()
        print(f"Saved figure: {fig_hd}")

    # 5. Update Model Comparison Table
    update_model_comparisons(best_eval_res)


def update_model_comparisons(adaptive_best_res: Dict[str, Any]):
    """Updates results/model_comparison.csv, .json, and .md with actual Adaptive MOD metrics."""
    if not adaptive_best_res:
        return

    summary = adaptive_best_res["summary"]
    adaptive_metrics = {
        "mean_dice": summary["mean_dice"],
        "wt_dice": summary["WT_dice"],
        "tc_dice": summary["TC_dice"],
        "et_dice": summary["ET_dice"],
        "mean_hd95": summary["mean_hd95"],
    }

    # 1. Update JSON
    json_path = Path("results/model_comparison.json")
    if json_path.exists():
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {}

    data["adaptive_mod"] = {
        "display_name": "Adaptive Self-Distillation (Dynamic MOD)",
        "mean_dice": round(adaptive_metrics["mean_dice"], 4),
        "wt_dice": round(adaptive_metrics["wt_dice"], 4),
        "tc_dice": round(adaptive_metrics["tc_dice"], 4),
        "et_dice": round(adaptive_metrics["et_dice"], 4),
        "mean_hd95": round(adaptive_metrics["mean_hd95"], 4),
        "best_epoch": adaptive_best_res["epoch"],
    }

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"Updated: {json_path}")

    # 2. Update CSV
    csv_path = Path("results/model_comparison.csv")
    rows = [
        ["Model", "Mean_Dice", "WT_Dice", "TC_Dice", "ET_Dice", "Mean_HD95"],
        ["Baseline UNETR", "0.6887", "0.6276", "0.7423", "0.6961", "102.66"],
        ["Online Tokenizer", "0.6600", "0.5843", "0.7077", "0.6880", "116.51"],
        ["Dense Predictor", "0.6078", "0.4814", "0.6714", "0.6705", "81.64"],
        ["Full MOD (Equal Weights)", "0.5786", "0.4287", "0.6635", "0.6437", "88.62"],
        [
            "Adaptive MOD",
            f"{adaptive_metrics['mean_dice']:.4f}",
            f"{adaptive_metrics['wt_dice']:.4f}",
            f"{adaptive_metrics['tc_dice']:.4f}",
            f"{adaptive_metrics['et_dice']:.4f}",
            f"{adaptive_metrics['mean_hd95']:.4f}",
        ],
    ]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(rows)
    print(f"Updated: {csv_path}")

    # 3. Update Markdown
    md_path = Path("results/model_comparison.md")
    with open(md_path, "w", encoding="utf-8") as f:
        f.write("# Model Performance Comparison\n\n")
        f.write("| Model | Mean Dice | WT Dice | TC Dice | ET Dice | Mean HD95 |\n")
        f.write("| :--- | :---: | :---: | :---: | :---: | :---: |\n")
        for r in rows[1:]:
            f.write(f"| **{r[0]}** | {r[1]} | {r[2]} | {r[3]} | {r[4]} | {r[5]} |\n")
        f.write("\n*Evaluated under identical validation protocol (10 subjects, ROI 96^3, overlap 0.25).*\n")
    print(f"Updated: {md_path}")


if __name__ == "__main__":
    train_adaptive_storage_safe()
