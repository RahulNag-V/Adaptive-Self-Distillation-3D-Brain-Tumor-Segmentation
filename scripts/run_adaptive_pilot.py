"""3-Epoch Pilot for Adaptive Self-Distillation (Adaptive MOD).

Runs a strictly controlled 3-epoch pilot to observe and verify the dynamic lambda trajectory
before full 10-epoch training.

Records per epoch:
- segmentation loss
- Online Tokenizer loss
- Dense Predictor loss
- MOD auxiliary loss
- total loss
- lambda_ot BEFORE update
- lambda_dp BEFORE update
- lambda_ot AFTER update
- lambda_dp AFTER update
- training time
- GPU memory (allocated & peak)
- checkpoint creation

Outputs:
- results/adaptive/pilot_lambda_history.csv
- results/figures/adaptive_lambda_trajectory.png
- checkpoints/adaptive/pilot/ (epoch_01.pth ... epoch_03.pth)
"""

from pathlib import Path
import copy
import csv
import os
import sys
import time

# Ensure project root in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import matplotlib.pyplot as plt
import numpy as np
import torch
from monai.losses import DiceFocalLoss
from tqdm import tqdm

from src.data.dataloader import create_dataloaders
from src.losses.dense_predictor import DensePredictorLoss
from src.losses.online_tokenizer import OnlineTokenizerLoss
from src.models.dense_predictor import DensePredictor
from src.models.ema import update_ema
from src.models.unetr_baseline import UNETRBaseline
from src.models.unetr_tokens import UNETRTokenExtractor
from src.training.masking import PatchMaskGenerator
from src.utils.config import load_config


def run_adaptive_pilot(config_path: str = "configs/base.yaml", num_epochs: int = 3):
    config = load_config(config_path)

    ds_cfg = config.get("dataset", {})
    root_dir = ds_cfg.get("root_dir", "data/raw/BraTS2021/BraTS2021_Training_Data")
    patch_size = tuple(ds_cfg.get("patch_size", [96, 96, 96]))
    batch_size = ds_cfg.get("batch_size", 1)
    num_workers = ds_cfg.get("num_workers", 0)
    seed = config.get("training", {}).get("seed", 42)

    lr = float(config.get("optimizer", {}).get("learning_rate", 1e-4))
    weight_decay = float(config.get("optimizer", {}).get("weight_decay", 5e-5))

    dp_cfg = config.get("dense_predictor", {})
    token_patch_size = tuple(dp_cfg.get("patch_size", [16, 16, 16]))
    mask_ratio = config.get("mod", {}).get("mask_ratio", 0.60)
    ema_momentum = float(config.get("mod", {}).get("ema_momentum", 0.996))

    ckpt_dir = Path("checkpoints/adaptive/pilot")
    ckpt_dir.mkdir(parents=True, exist_ok=True)

    results_dir = Path("results/adaptive")
    results_dir.mkdir(parents=True, exist_ok=True)

    figures_dir = Path("results/figures")
    figures_dir.mkdir(parents=True, exist_ok=True)

    device = torch.device(config.get("hardware", {}).get("device", "cuda") if torch.cuda.is_available() else "cpu")

    print("=" * 65)
    print("ADAPTIVE SELF-DISTILLATION: 3-EPOCH CONTROLLED PILOT")
    print("=" * 65)
    print(f"Device:          {device}")
    if device.type == "cuda":
        print(f"GPU:             {torch.cuda.get_device_name(0)}")
    print(f"Pilot Epochs:    {num_epochs}")
    print(f"Fixed Split:     40 train / 10 val (seed {seed})")
    print(f"Patch Size:      {patch_size} (Tokens: {token_patch_size})")
    print(f"Mask Ratio:      {mask_ratio}")
    print(f"EMA Momentum:    {ema_momentum}")
    print(f"Checkpoints:     {ckpt_dir}")
    print("=" * 65)

    torch.manual_seed(seed)
    if device.type == "cuda":
        torch.cuda.manual_seed(seed)
        torch.cuda.reset_peak_memory_stats(device)

    # 1. Dataloaders
    train_loader, val_loader = create_dataloaders(
        root_dir=root_dir,
        patch_size=patch_size,
        batch_size=batch_size,
        num_workers=num_workers,
        seed=seed,
        train_split_file=ds_cfg.get("train_split", "data/splits/train.txt"),
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

    # Initial lambdas
    lambda_ot = 1.0
    lambda_dp = 1.0
    epsilon = 1e-6

    l_seg_ema = None
    l_ot_ema = None
    l_dp_ema = None

    history_records = []
    pilot_trajectory = {
        "epochs": [],
        "lambda_ot_before": [],
        "lambda_dp_before": [],
        "lambda_ot_after": [],
        "lambda_dp_after": [],
        "target_ot": [],
        "target_dp": [],
    }

    total_pilot_start = time.time()

    for epoch in range(1, num_epochs + 1):
        epoch_start = time.time()
        student.train()
        dense_predictor.train()

        # Record lambdas BEFORE update (used during training of this epoch)
        lambda_ot_before = float(lambda_ot)
        lambda_dp_before = float(lambda_dp)

        running_total_loss = 0.0
        running_seg_loss = 0.0
        running_ot_loss = 0.0
        running_dp_loss = 0.0
        running_mod_loss = 0.0

        pbar = tqdm(train_loader, desc=f"Pilot Epoch {epoch:02d}/{num_epochs:02d}")

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

                # Auxiliary MOD loss with active lambdas
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

        epoch_time = time.time() - epoch_start
        epoch_total = running_total_loss / len(train_loader)
        epoch_seg = running_seg_loss / len(train_loader)
        epoch_ot = running_ot_loss / len(train_loader)
        epoch_dp = running_dp_loss / len(train_loader)
        epoch_mod = running_mod_loss / len(train_loader)

        gpu_alloc = torch.cuda.memory_allocated(device) / (1024**3) if device.type == "cuda" else 0.0
        gpu_peak = torch.cuda.max_memory_allocated(device) / (1024**3) if device.type == "cuda" else 0.0

        # --- ADAPTIVE UPDATE RULE ---
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

        lambda_ot_after = float(np.clip(0.90 * lambda_ot_before + 0.10 * target_ot, 0.10, 2.0))
        lambda_dp_after = float(np.clip(0.90 * lambda_dp_before + 0.10 * target_dp, 0.10, 2.0))

        # Save checkpoint
        ckpt_file = ckpt_dir / f"epoch_{epoch:02d}.pth"
        checkpoint_data = {
            "epoch": epoch,
            "student_state_dict": student.state_dict(),
            "teacher_state_dict": teacher.state_dict(),
            "dense_predictor_state_dict": dense_predictor.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "segmentation_loss": epoch_seg,
            "online_tokenizer_loss": epoch_ot,
            "dense_predictor_loss": epoch_dp,
            "mod_loss": epoch_mod,
            "total_loss": epoch_total,
            "lambda_ot_before": lambda_ot_before,
            "lambda_dp_before": lambda_dp_before,
            "lambda_ot_after": lambda_ot_after,
            "lambda_dp_after": lambda_dp_after,
            "target_ot": target_ot,
            "target_dp": target_dp,
            "training_time_sec": epoch_time,
            "gpu_peak_gb": gpu_peak,
        }
        torch.save(checkpoint_data, ckpt_file)
        torch.save(checkpoint_data, ckpt_dir / "latest.pth")

        # Record data
        history_records.append({
            "epoch": epoch,
            "segmentation_loss": f"{epoch_seg:.6f}",
            "online_tokenizer_loss": f"{epoch_ot:.6f}",
            "dense_predictor_loss": f"{epoch_dp:.6f}",
            "mod_auxiliary_loss": f"{epoch_mod:.6f}",
            "total_loss": f"{epoch_total:.6f}",
            "lambda_ot_before": f"{lambda_ot_before:.6f}",
            "lambda_dp_before": f"{lambda_dp_before:.6f}",
            "lambda_ot_after": f"{lambda_ot_after:.6f}",
            "lambda_dp_after": f"{lambda_dp_after:.6f}",
            "target_ot": f"{target_ot:.6f}",
            "target_dp": f"{target_dp:.6f}",
            "training_time_sec": f"{epoch_time:.2f}",
            "gpu_allocated_gb": f"{gpu_alloc:.2f}",
            "gpu_peak_gb": f"{gpu_peak:.2f}",
            "checkpoint_created": str(ckpt_file),
        })

        pilot_trajectory["epochs"].append(epoch)
        pilot_trajectory["lambda_ot_before"].append(lambda_ot_before)
        pilot_trajectory["lambda_dp_before"].append(lambda_dp_before)
        pilot_trajectory["lambda_ot_after"].append(lambda_ot_after)
        pilot_trajectory["lambda_dp_after"].append(lambda_dp_after)
        pilot_trajectory["target_ot"].append(target_ot)
        pilot_trajectory["target_dp"].append(target_dp)

        print(
            f"\n--- Epoch {epoch:02d} Summary ---\n"
            f"  Losses:      Total={epoch_total:.4f} | Seg={epoch_seg:.4f} | OT={epoch_ot:.4f} | DP={epoch_dp:.4f} | MOD={epoch_mod:.4f}\n"
            f"  Lambda OT:   Before={lambda_ot_before:.4f} -> Target={target_ot:.4f} -> After={lambda_ot_after:.4f}\n"
            f"  Lambda DP:   Before={lambda_dp_before:.4f} -> Target={target_dp:.4f} -> After={lambda_dp_after:.4f}\n"
            f"  Compute:     Time={epoch_time:.2f}s | GPU Alloc={gpu_alloc:.2f}GB | GPU Peak={gpu_peak:.2f}GB\n"
            f"  Checkpoint:  {ckpt_file}\n"
        )

        # Set for next epoch
        lambda_ot = lambda_ot_after
        lambda_dp = lambda_dp_after

    total_pilot_time = time.time() - total_pilot_start
    print(f"Pilot execution completed in {total_pilot_time:.2f}s ({total_pilot_time/60:.2f} min).")

    # 1. Save results/adaptive/pilot_lambda_history.csv
    csv_path = results_dir / "pilot_lambda_history.csv"
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        fieldnames = [
            "epoch",
            "segmentation_loss",
            "online_tokenizer_loss",
            "dense_predictor_loss",
            "mod_auxiliary_loss",
            "total_loss",
            "lambda_ot_before",
            "lambda_dp_before",
            "lambda_ot_after",
            "lambda_dp_after",
            "target_ot",
            "target_dp",
            "training_time_sec",
            "gpu_allocated_gb",
            "gpu_peak_gb",
            "checkpoint_created",
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(history_records)
    print(f"Saved pilot CSV: {csv_path}")

    # 2. Plot results/figures/adaptive_lambda_trajectory.png
    fig_path = figures_dir / "adaptive_lambda_trajectory.png"
    plt.figure(figsize=(10, 6), dpi=300)

    # Plot lambda_ot and lambda_dp transitions
    epochs_axis = [0] + pilot_trajectory["epochs"]
    ot_vals = [1.0] + pilot_trajectory["lambda_ot_after"]
    dp_vals = [1.0] + pilot_trajectory["lambda_dp_after"]

    plt.plot(epochs_axis, ot_vals, marker="o", linewidth=2.5, color="#10B981", label=r"$\lambda_{ot}$ (Online Tokenizer)")
    plt.plot(epochs_axis, dp_vals, marker="s", linewidth=2.5, color="#7C3AED", label=r"$\lambda_{dp}$ (Dense Predictor)")

    # Threshold markers
    plt.axhline(0.10, color="gray", linestyle=":", label="Lower Bound (0.10)")
    plt.axhline(2.00, color="red", linestyle="--", alpha=0.7, label="Upper Bound (2.00)")

    plt.xlabel("Epoch Transition (End of Epoch)", fontsize=12, fontweight="bold")
    plt.ylabel(r"Effective Loss Weight ($\lambda$)", fontsize=12, fontweight="bold")
    plt.title("Adaptive Self-Distillation: Dynamic Weight Trajectory (3-Epoch Pilot)", fontsize=14, fontweight="bold")
    plt.xticks(epochs_axis, ["Init (0)"] + [f"Epoch {e}" for e in pilot_trajectory["epochs"]])
    plt.ylim(0.0, 2.2)
    plt.grid(True, linestyle="--", alpha=0.6)
    plt.legend(fontsize=11, loc="center right")
    plt.tight_layout()
    plt.savefig(fig_path, dpi=300)
    plt.close()
    print(f"Saved pilot plot: {fig_path}")

    # Print clean summary table
    print("\n" + "=" * 80)
    print("PILOT ADAPTIVE LAMBDA TRAJECTORY SUMMARY")
    print("=" * 80)
    print(f"{'Epoch':<6} | {'Seg Loss':<10} | {'OT Loss':<10} | {'DP Loss':<10} | {'lambda_ot (B)':<13} | {'lambda_ot (A)':<13} | {'lambda_dp (B)':<13} | {'lambda_dp (A)':<13}")
    print("-" * 80)
    for r in history_records:
        print(f"{r['epoch']:<6} | {float(r['segmentation_loss']):<10.4f} | {float(r['online_tokenizer_loss']):<10.4f} | {float(r['dense_predictor_loss']):<10.4f} | {float(r['lambda_ot_before']):<13.4f} | {float(r['lambda_ot_after']):<13.4f} | {float(r['lambda_dp_before']):<13.4f} | {float(r['lambda_dp_after']):<13.4f}")
    print("=" * 80 + "\n")

    return history_records


if __name__ == "__main__":
    run_adaptive_pilot()
