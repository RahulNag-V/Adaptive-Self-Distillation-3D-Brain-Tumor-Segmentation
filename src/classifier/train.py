import os
import sys
import json
import time
import platform
import random
from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torch.optim import AdamW
from torch.optim.lr_scheduler import CosineAnnealingLR

from src.classifier.dataset import BrainTumorDataset, get_train_transforms, get_val_transforms, CLASS_NAMES
from src.classifier.model import build_model
from src.classifier.metrics import compute_classification_metrics

def set_seed(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False

def plot_history(history_df, output_path):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    
    # Loss plot
    ax1.plot(history_df["epoch"], history_df["train_loss"], label="Train Loss", color="#e74c3c", lw=2)
    ax1.plot(history_df["epoch"], history_df["val_loss"], label="Val Loss", color="#3498db", lw=2)
    ax1.set_title("Training & Validation Loss", fontsize=12, fontweight="bold")
    ax1.set_xlabel("Epoch", fontsize=10)
    ax1.set_ylabel("Cross Entropy Loss", fontsize=10)
    ax1.grid(True, linestyle="--", alpha=0.5)
    ax1.legend(fontsize=10)
    
    # Metrics plot
    ax2.plot(history_df["epoch"], history_df["train_accuracy"], label="Train Accuracy", color="#95a5a6", linestyle="--", lw=1.5)
    ax2.plot(history_df["epoch"], history_df["val_accuracy"], label="Val Accuracy", color="#2ecc71", lw=2)
    ax2.plot(history_df["epoch"], history_df["val_f1"], label="Val Macro F1", color="#9b59b6", lw=2)
    ax2.plot(history_df["epoch"], history_df["val_precision"], label="Val Macro Precision", color="#f39c12", lw=1.5)
    ax2.plot(history_df["epoch"], history_df["val_recall"], label="Val Macro Recall", color="#1abc9c", lw=1.5)
    ax2.set_title("Validation Classification Metrics", fontsize=12, fontweight="bold")
    ax2.set_xlabel("Epoch", fontsize=10)
    ax2.set_ylabel("Score", fontsize=10)
    ax2.set_ylim(0.5, 1.02)
    ax2.grid(True, linestyle="--", alpha=0.5)
    ax2.legend(fontsize=9, loc="lower right")
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=200)
    plt.close()

def run_training():
    set_seed(42)
    
    # Paths
    splits_path = Path("data/classifier/splits.json")
    ckpt_dir = Path("checkpoints/classifier")
    results_dir = Path("results/classifier")
    ckpt_dir.mkdir(parents=True, exist_ok=True)
    results_dir.mkdir(parents=True, exist_ok=True)
    
    # Save class_names.json as requested
    with open(ckpt_dir / "class_names.json", "w") as f:
        json.dump(CLASS_NAMES, f, indent=4)
        
    # Load splits
    with open(splits_path, "r") as f:
        splits = json.load(f)
        
    train_items = splits["train"]
    val_items = splits["val"]
    
    # Calculate class distribution & class weights
    train_counts = [splits["counts"]["training"][c] for c in CLASS_NAMES]
    total_train = sum(train_counts)
    num_classes = len(CLASS_NAMES)
    
    # Balanced weights: total / (num_classes * count)
    class_weights_val = [total_train / (num_classes * c) for c in train_counts]
    print(f"Class counts in training: {dict(zip(CLASS_NAMES, train_counts))}")
    print(f"Computed class weights: {dict(zip(CLASS_NAMES, [round(w, 4) for w in class_weights_val]))}")
    
    # Setup Device
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device} ({torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'})")
    
    # Transforms & Datasets
    image_size = 224
    train_dataset = BrainTumorDataset(train_items, transform=get_train_transforms(image_size))
    val_dataset = BrainTumorDataset(val_items, transform=get_val_transforms(image_size))
    
    batch_size = 64
    num_workers = 0  # 0 on Windows ensures stable and fast execution without multiprocessing overhead
    
    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=(device.type == "cuda")
    )
    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=(device.type == "cuda")
    )
    
    # Model
    model = build_model(num_classes=num_classes, pretrained=True, dropout=0.2)
    model = model.to(device)
    
    # Loss, Optimizer, Scheduler, AMP Scaler
    class_weights_tensor = torch.tensor(class_weights_val, dtype=torch.float32, device=device)
    criterion = nn.CrossEntropyLoss(weight=class_weights_tensor)
    
    optimizer = AdamW(model.parameters(), lr=5e-4, weight_decay=1e-2)
    epochs = 30
    scheduler = CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)
    scaler = torch.amp.GradScaler('cuda', enabled=(device.type == "cuda"))
    
    # Tracking
    history = []
    best_val_f1 = -1.0
    best_epoch = -1
    patience = 6
    epochs_no_improve = 0
    
    print("\nStarting Training (Max 30 epochs, early stopping patience 6)...")
    start_time = time.time()
    
    for epoch in range(1, epochs + 1):
        epoch_start = time.time()
        
        # --- TRAIN ---
        model.train()
        train_loss_total = 0.0
        train_correct = 0
        train_total_samples = 0
        
        for images, targets, _ in train_loader:
            images = images.to(device, non_blocking=True)
            targets = targets.to(device, non_blocking=True)
            
            optimizer.zero_grad()
            with torch.amp.autocast('cuda', enabled=(device.type == "cuda")):
                outputs = model(images)
                loss = criterion(outputs, targets)
                
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            
            train_loss_total += loss.item() * len(targets)
            preds = torch.argmax(outputs, dim=1)
            train_correct += (preds == targets).sum().item()
            train_total_samples += len(targets)
            
        train_loss = train_loss_total / train_total_samples
        train_acc = train_correct / train_total_samples
        
        # --- VALIDATION ---
        model.eval()
        val_loss_total = 0.0
        val_targets_all = []
        val_preds_all = []
        
        with torch.no_grad():
            for images, targets, _ in val_loader:
                images = images.to(device, non_blocking=True)
                targets = targets.to(device, non_blocking=True)
                
                with torch.amp.autocast('cuda', enabled=(device.type == "cuda")):
                    outputs = model(images)
                    loss = criterion(outputs, targets)
                    
                val_loss_total += loss.item() * len(targets)
                preds = torch.argmax(outputs, dim=1)
                
                val_targets_all.extend(targets.cpu().numpy())
                val_preds_all.extend(preds.cpu().numpy())
                
        val_loss = val_loss_total / len(val_targets_all)
        val_metrics = compute_classification_metrics(val_targets_all, val_preds_all, CLASS_NAMES)
        
        val_acc = val_metrics["accuracy"]
        val_prec = val_metrics["macro_precision"]
        val_rec = val_metrics["macro_recall"]
        val_f1 = val_metrics["macro_f1"]
        
        scheduler.step()
        epoch_duration = time.time() - epoch_start
        
        print(f"Epoch [{epoch:02d}/{epochs:02d}] ({epoch_duration:.1f}s) - "
              f"Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.4f} | "
              f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.4f}, "
              f"Val Macro F1: {val_f1:.4f} (P: {val_prec:.4f}, R: {val_rec:.4f})", flush=True)
        
        epoch_record = {
            "epoch": epoch,
            "train_loss": train_loss,
            "val_loss": val_loss,
            "train_accuracy": train_acc,
            "val_accuracy": val_acc,
            "val_precision": val_prec,
            "val_recall": val_rec,
            "val_f1": val_f1
        }
        history.append(epoch_record)
        
        # Save latest.pth
        torch.save({
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "val_metrics": val_metrics,
            "class_names": CLASS_NAMES
        }, ckpt_dir / "latest.pth")
        
        # Check Best model
        if val_f1 > best_val_f1:
            best_val_f1 = val_f1
            best_epoch = epoch
            epochs_no_improve = 0
            torch.save({
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "val_metrics": val_metrics,
                "class_names": CLASS_NAMES
            }, ckpt_dir / "best.pth")
            print(f"  --> Saved new best model to {ckpt_dir / 'best.pth'} (Val Macro F1: {best_val_f1:.4f})", flush=True)
        else:
            epochs_no_improve += 1
            if epochs_no_improve >= patience:
                print(f"\n[Early Stopping] No improvement in validation macro F1 for {patience} consecutive epochs.", flush=True)
                break
                
    total_training_time = time.time() - start_time
    print(f"\nTraining completed in {total_training_time / 60:.2f} minutes.")
    print(f"Best Epoch: {best_epoch} with Val Macro F1: {best_val_f1:.4f}")
    
    # Save training history CSV & Plot
    history_df = pd.DataFrame(history)
    history_df.to_csv(results_dir / "training_history.csv", index=False)
    plot_history(history_df, results_dir / "training_history.png")
    print(f"Training history saved to {results_dir / 'training_history.csv'} and {results_dir / 'training_history.png'}")
    
    # Save training_config.json
    training_config = {
        "python_version": platform.python_version(),
        "pytorch_version": torch.__version__,
        "torchvision_version": "0.26.0+cu128",
        "cuda_version": torch.version.cuda if torch.cuda.is_available() else None,
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "None",
        "random_seed": 42,
        "image_size": image_size,
        "batch_size": batch_size,
        "learning_rate": 5e-4,
        "optimizer": "AdamW",
        "scheduler": "CosineAnnealingLR",
        "class_weights": class_weights_val,
        "number_of_epochs_run": len(history),
        "best_epoch": best_epoch,
        "best_val_macro_f1": best_val_f1,
        "total_training_time_seconds": total_training_time
    }
    with open(results_dir / "training_config.json", "w") as f:
        json.dump(training_config, f, indent=4)
    print(f"Training configuration saved to {results_dir / 'training_config.json'}")

if __name__ == "__main__":
    run_training()
