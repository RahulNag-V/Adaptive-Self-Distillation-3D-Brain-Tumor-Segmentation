"""Standalone Dense Predictor Ablation Training Script.

Trains UNETR baseline with masked pixel reconstruction (Dense Predictor)
WITHOUT online self-distillation (Online Tokenizer).

Loss:
    Total Loss = Segmentation Loss + lambda_dp * Dense Predictor Loss

Conditions:
- 50-subject BraTS subset
- 40 train / 10 val deterministic split
- Seed: 42
- Input patch: 96x96x96
- Token patch: 16x16x16
- Mask ratio: 0.60
- Batch: 1
- Epochs: 10
- LR: 1e-4, WD: 5e-5
- FP16 AMP enabled
"""

from pathlib import Path
import csv
import os
import sys
import time

import torch
from monai.losses import DiceFocalLoss
from tqdm import tqdm

from src.data.dataloader import create_dataloaders
from src.losses.dense_predictor import DensePredictorLoss
from src.models.dense_predictor import DensePredictor
from src.models.unetr_baseline import UNETRBaseline
from src.models.unetr_tokens import UNETRTokenExtractor
from src.training.masking import PatchMaskGenerator
from src.utils.config import load_config


def train_dense_predictor(config_path: str = "configs/base.yaml"):
    config = load_config(config_path)

    # Configuration extraction
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
    lambda_dp = float(dp_cfg.get("lambda_dp", 1.0))

    ckpt_dir = Path(config.get("output", {}).get("checkpoint_dir", "checkpoints")) / "dense_predictor"
    ckpt_dir.mkdir(parents=True, exist_ok=True)

    results_dir = Path(config.get("output", {}).get("result_dir", "results")) / "dense_predictor"
    results_dir.mkdir(parents=True, exist_ok=True)

    device = torch.device(config.get("hardware", {}).get("device", "cuda") if torch.cuda.is_available() else "cpu")

    print("=" * 60)
    print("DENSE PREDICTOR ABLATION TRAINING")
    print("=" * 60)
    print(f"Device:       {device}")
    if device.type == "cuda":
        print(f"GPU:          {torch.cuda.get_device_name(0)}")
    print(f"Epochs:       {epochs}")
    print(f"Lambda DP:    {lambda_dp}")
    print(f"Mask Ratio:   {mask_ratio}")
    print(f"Checkpoints:  {ckpt_dir}")

    # Reproducibility seed
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
    print(f"Train subjects: {len(train_loader.dataset)} | Val subjects: {len(val_loader.dataset)}")

    # 2. Models
    student = UNETRBaseline(in_channels=4, out_channels=4).to(device)
    token_extractor = UNETRTokenExtractor(student)
    dense_predictor = DensePredictor(
        hidden_size=768,
        in_channels=4,
        patch_size=token_patch_size,
    ).to(device)

    mask_generator = PatchMaskGenerator(
        image_size=patch_size,
        patch_size=token_patch_size,
        mask_ratio=mask_ratio,
    )

    # 3. Losses
    seg_loss_fn = DiceFocalLoss(softmax=True, to_onehot_y=True)
    dense_predictor_loss_fn = DensePredictorLoss(patch_size=token_patch_size)

    # 4. Optimizer & Scaler
    params = list(student.parameters()) + list(dense_predictor.parameters())
    optimizer = torch.optim.AdamW(params, lr=lr, weight_decay=weight_decay)
    scaler = torch.amp.GradScaler("cuda", enabled=(device.type == "cuda"))

    best_loss = float("inf")
    history = []

    start_time = time.time()

    for epoch in range(1, epochs + 1):
        student.train()
        dense_predictor.train()

        running_total_loss = 0.0
        running_seg_loss = 0.0
        running_dp_loss = 0.0

        pbar = tqdm(train_loader, desc=f"Epoch {epoch:02d}/{epochs:02d} [Train]")

        for step, batch in enumerate(pbar):
            images = batch["image"].to(device, non_blocking=True)
            labels = batch["label"].to(device, non_blocking=True)

            optimizer.zero_grad(set_to_none=True)

            # Generate random 3D patch mask
            mask = mask_generator(batch_size=images.shape[0], device=device)

            with torch.amp.autocast(device_type=device.type, dtype=torch.float16, enabled=(device.type == "cuda")):
                # Segmentation forward
                seg_output = student(images)
                seg_loss = seg_loss_fn(seg_output, labels)

                # Masked token extraction
                tokens, _ = token_extractor(images, mask=mask)

                # Spatial dense reconstruction
                reconstruction = dense_predictor(tokens, image_size=images.shape[2:])
                dp_loss = dense_predictor_loss_fn(reconstruction, images, mask)

                # Combined loss for Dense Predictor ablation
                total_loss = seg_loss + lambda_dp * dp_loss

            scaler.scale(total_loss).backward()
            scaler.step(optimizer)
            scaler.update()

            running_total_loss += total_loss.item()
            running_seg_loss += seg_loss.item()
            running_dp_loss += dp_loss.item()

            pbar.set_postfix(
                total=f"{total_loss.item():.4f}",
                seg=f"{seg_loss.item():.4f}",
                dp=f"{dp_loss.item():.4f}",
            )

        epoch_total = running_total_loss / len(train_loader)
        epoch_seg = running_seg_loss / len(train_loader)
        epoch_dp = running_dp_loss / len(train_loader)

        print(
            f"Epoch {epoch:02d} Summary -> "
            f"Total Loss: {epoch_total:.4f} | "
            f"Seg Loss: {epoch_seg:.4f} | "
            f"DP Loss: {epoch_dp:.4f}"
        )

        history.append([epoch, epoch_total, epoch_seg, epoch_dp])

        checkpoint_data = {
            "epoch": epoch,
            "student_state_dict": student.state_dict(),
            "dense_predictor_state_dict": dense_predictor.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "total_loss": epoch_total,
            "segmentation_loss": epoch_seg,
            "dense_predictor_loss": epoch_dp,
            "lambda_dp": lambda_dp,
            "config": config,
        }

        # 1. Save epoch checkpoint
        epoch_path = ckpt_dir / f"epoch_{epoch:02d}.pth"
        torch.save(checkpoint_data, epoch_path)

        # 2. Save latest checkpoint
        latest_path = ckpt_dir / "latest.pth"
        torch.save(checkpoint_data, latest_path)

        # 3. Save best checkpoint
        if epoch_total < best_loss:
            best_loss = epoch_total
            best_path = ckpt_dir / "best.pth"
            checkpoint_data["best_loss"] = best_loss
            torch.save(checkpoint_data, best_path)

    total_time = time.time() - start_time
    print(f"\nTraining completed in {total_time:.2f}s ({total_time/60:.2f} min).")

    # Persist training history
    history_csv = results_dir / "training_history.csv"
    with open(history_csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["epoch", "total_loss", "segmentation_loss", "dense_predictor_loss"])
        writer.writerows(history)
    print(f"Training history saved: {history_csv}")


if __name__ == "__main__":
    train_dense_predictor()
