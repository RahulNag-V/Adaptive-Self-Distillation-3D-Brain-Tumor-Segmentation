"""Adaptive Self-Distillation (Adaptive MOD) Training Script for 3D Brain Tumor Segmentation.

Formulation:
    L_total = L_seg + lambda_ot(t) * L_OT + lambda_dp(t) * L_DP

Adaptive update rule (once per epoch):
    target_ot = L_seg_ema / (L_OT_ema + epsilon)
    target_dp = L_seg_ema / (L_DP_ema + epsilon)
    lambda_ot = clip(0.90 * lambda_ot + 0.10 * target_ot, 0.10, 2.0)
    lambda_dp = clip(0.90 * lambda_dp + 0.10 * target_dp, 0.10, 2.0)

Hardware & Environment:
- 50 subjects (40 train / 10 val deterministic split)
- Input patch: 96x96x96, Token patch: 16x16x16
- Batch size: 1, Epochs: 10
- AdamW (lr=1e-4, wd=5e-5)
- Mask ratio: 0.60
- EMA teacher momentum: 0.996
- FP16 AMP
"""

from pathlib import Path
import copy
import csv
import os
import sys
import time
from typing import Dict, Tuple

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

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


def run_sanity_check(config_path: str = "configs/base.yaml") -> Dict[str, any]:
    """Runs a 1-step sanity test before full training and reports diagnostics."""
    config = load_config(config_path)
    ds_cfg = config.get("dataset", {})
    root_dir = ds_cfg.get("root_dir", "data/raw/BraTS2021/BraTS2021_Training_Data")
    patch_size = tuple(ds_cfg.get("patch_size", [96, 96, 96]))
    dp_cfg = config.get("dense_predictor", {})
    token_patch_size = tuple(dp_cfg.get("patch_size", [16, 16, 16]))
    mask_ratio = config.get("mod", {}).get("mask_ratio", 0.60)
    seed = config.get("training", {}).get("seed", 42)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    print("\n" + "=" * 60)
    print("ADAPTIVE SELF-DISTILLATION: 1-STEP SANITY CHECK")
    print("=" * 60)
    print(f"Device: {device}")
    if device.type == "cuda":
        torch.cuda.reset_peak_memory_stats(device)
        print(f"GPU:    {torch.cuda.get_device_name(0)}")

    torch.manual_seed(seed)
    if device.type == "cuda":
        torch.cuda.manual_seed(seed)

    # 1. Loader
    train_loader, _ = create_dataloaders(
        root_dir=root_dir,
        patch_size=patch_size,
        batch_size=1,
        num_workers=0,
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

    # 4. Parameters & Optimizer
    params = list(student.parameters()) + list(dense_predictor.parameters())
    optimizer = torch.optim.AdamW(params, lr=1e-4, weight_decay=5e-5)
    scaler = torch.amp.GradScaler("cuda", enabled=(device.type == "cuda"))

    # Initial lambdas
    lambda_ot = 1.0
    lambda_dp = 1.0

    # 5. Fetch single batch
    batch = next(iter(train_loader))
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

        mod_loss = lambda_ot * ot_loss + lambda_dp * dp_loss
        total_loss = seg_loss + mod_loss

    # 6. Backward
    scaler.scale(total_loss).backward()
    scaler.step(optimizer)
    scaler.update()

    update_ema(student=student, teacher=teacher, momentum=0.996)

    gpu_mem_alloc = (
        torch.cuda.memory_allocated(device) / (1024**3) if device.type == "cuda" else 0.0
    )
    gpu_mem_max = (
        torch.cuda.max_memory_allocated(device) / (1024**3) if device.type == "cuda" else 0.0
    )

    sanity_info = {
        "images_shape": tuple(images.shape),
        "labels_shape": tuple(labels.shape),
        "mask_shape": tuple(mask.shape),
        "student_tokens_shape": tuple(s_tokens.shape),
        "teacher_tokens_shape": tuple(t_tokens.shape),
        "reconstruction_shape": tuple(recon.shape),
        "segmentation_loss": float(seg_loss.item()),
        "ot_loss": float(ot_loss.item()),
        "dp_loss": float(dp_loss.item()),
        "mod_loss": float(mod_loss.item()),
        "total_loss": float(total_loss.item()),
        "lambda_ot": lambda_ot,
        "lambda_dp": lambda_dp,
        "backward_success": True,
        "gpu_memory_allocated_gb": gpu_mem_alloc,
        "gpu_memory_peak_gb": gpu_mem_max,
    }

    print("\n--- SANITY CHECK RESULTS ---")
    print(f"Input Shape:        {sanity_info['images_shape']}")
    print(f"Labels Shape:       {sanity_info['labels_shape']}")
    print(f"Mask Shape:         {sanity_info['mask_shape']}")
    print(f"Student Tokens:     {sanity_info['student_tokens_shape']}")
    print(f"Teacher Tokens:     {sanity_info['teacher_tokens_shape']}")
    print(f"Reconstruction:     {sanity_info['reconstruction_shape']}")
    print(f"Segmentation Loss:  {sanity_info['segmentation_loss']:.4f}")
    print(f"Online Tokenizer:   {sanity_info['ot_loss']:.4f}")
    print(f"Dense Predictor:    {sanity_info['dp_loss']:.4f}")
    print(f"MOD Loss:           {sanity_info['mod_loss']:.4f}")
    print(f"Total Loss:         {sanity_info['total_loss']:.4f}")
    print(f"Lambda OT:          {sanity_info['lambda_ot']:.4f}")
    print(f"Lambda DP:          {sanity_info['lambda_dp']:.4f}")
    print(f"Backward Pass:      SUCCESS ({sanity_info['backward_success']})")
    if device.type == "cuda":
        print(f"GPU Allocated:      {sanity_info['gpu_memory_allocated_gb']:.2f} GB")
        print(f"GPU Peak:           {sanity_info['gpu_memory_peak_gb']:.2f} GB")
    print("=" * 60 + "\n")

    return sanity_info


def train_adaptive(config_path: str = "configs/base.yaml", run_full: bool = True):
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

    ckpt_dir = Path("checkpoints/adaptive")
    ckpt_dir.mkdir(parents=True, exist_ok=True)

    results_dir = Path("results/adaptive")
    results_dir.mkdir(parents=True, exist_ok=True)

    device = torch.device(config.get("hardware", {}).get("device", "cuda") if torch.cuda.is_available() else "cpu")

    print("=" * 60)
    print("ADAPTIVE SELF-DISTILLATION TRAINING")
    print("=" * 60)
    print(f"Device:       {device}")
    if device.type == "cuda":
        print(f"GPU:          {torch.cuda.get_device_name(0)}")
    print(f"Epochs:       {epochs}")
    print(f"Checkpoints:  {ckpt_dir}")
    print(f"Results:      {results_dir}")

    torch.manual_seed(seed)
    if device.type == "cuda":
        torch.cuda.manual_seed(seed)

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

    # Dynamic lambdas & EMA loss tracking
    lambda_ot = 1.0
    lambda_dp = 1.0
    epsilon = 1e-6

    l_seg_ema = None
    l_ot_ema = None
    l_dp_ema = None

    best_loss = float("inf")
    history = []
    start_time = time.time()

    for epoch in range(1, epochs + 1):
        student.train()
        dense_predictor.train()

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

                # Adaptive combined loss
                mod_loss = lambda_ot * ot_loss + lambda_dp * dp_loss
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
                l_ot=f"{lambda_ot:.3f}",
                l_dp=f"{lambda_dp:.3f}",
            )

        epoch_total = running_total_loss / len(train_loader)
        epoch_seg = running_seg_loss / len(train_loader)
        epoch_ot = running_ot_loss / len(train_loader)
        epoch_dp = running_dp_loss / len(train_loader)
        epoch_mod = running_mod_loss / len(train_loader)

        # Record metrics with current lambdas used during the epoch
        history.append([
            epoch, epoch_total, epoch_seg, epoch_ot, epoch_dp, epoch_mod, lambda_ot, lambda_dp
        ])

        print(
            f"Epoch {epoch:02d} Summary -> "
            f"Total: {epoch_total:.4f} | Seg: {epoch_seg:.4f} | "
            f"OT: {epoch_ot:.4f} | DP: {epoch_dp:.4f} | MOD: {epoch_mod:.4f} | "
            f"Lambda OT: {lambda_ot:.4f} | Lambda DP: {lambda_dp:.4f}"
        )

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
            "lambda_ot": lambda_ot,
            "lambda_dp": lambda_dp,
            "config": config,
        }

        # Save epoch checkpoint
        torch.save(checkpoint_data, ckpt_dir / f"epoch_{epoch:02d}.pth")
        torch.save(checkpoint_data, ckpt_dir / "latest.pth")

        if epoch_total < best_loss:
            best_loss = epoch_total
            checkpoint_data["best_loss"] = best_loss
            torch.save(checkpoint_data, ckpt_dir / "best.pth")

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

        lambda_ot = float(np.clip(0.90 * lambda_ot + 0.10 * target_ot, 0.10, 2.0))
        lambda_dp = float(np.clip(0.90 * lambda_dp + 0.10 * target_dp, 0.10, 2.0))

        print(f"Updated weights for Epoch {epoch+1:02d}: Lambda OT = {lambda_ot:.4f}, Lambda DP = {lambda_dp:.4f}")

    total_time = time.time() - start_time
    print(f"\nAdaptive Training completed in {total_time:.2f}s ({total_time/60:.2f} min).")

    # Save training history
    history_csv = results_dir / "training_history.csv"
    with open(history_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "epoch", "total_loss", "segmentation_loss", "online_tokenizer_loss",
            "dense_predictor_loss", "mod_loss", "lambda_ot", "lambda_dp"
        ])
        writer.writerows(history)
    print(f"Training history saved: {history_csv}")


if __name__ == "__main__":
    if "--sanity-only" in sys.argv:
        run_sanity_check()
    else:
        # Default behavior: run sanity check first, then proceed to train
        run_sanity_check()
        train_adaptive()
