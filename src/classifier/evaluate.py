import os
import sys
import json
import time
from pathlib import Path

import numpy as np
import matplotlib.pyplot as plt
from PIL import Image
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from src.classifier.dataset import BrainTumorDataset, get_val_transforms, CLASS_NAMES
from src.classifier.model import build_model
from src.classifier.metrics import compute_classification_metrics

DISPLAY_LABELS = ["Glioma", "Meningioma", "No Tumor", "Pituitary"]

def plot_confusion_matrices(cm_raw, output_path):
    cm = np.array(cm_raw, dtype=np.float64)
    row_sums = cm.sum(axis=1, keepdims=True)
    cm_norm = np.zeros_like(cm)
    np.divide(cm, row_sums, out=cm_norm, where=(row_sums > 0))
    
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 6))
    
    # 1. Raw counts
    im1 = ax1.imshow(cm, interpolation="nearest", cmap=plt.cm.Blues)
    ax1.set_title("Confusion Matrix (Counts)", fontsize=13, fontweight="bold")
    plt.colorbar(im1, ax=ax1, fraction=0.046, pad=0.04)
    tick_marks = np.arange(len(DISPLAY_LABELS))
    ax1.set_xticks(tick_marks)
    ax1.set_xticklabels(DISPLAY_LABELS, rotation=25, fontsize=10)
    ax1.set_yticks(tick_marks)
    ax1.set_yticklabels(DISPLAY_LABELS, fontsize=10)
    ax1.set_ylabel("True Label", fontsize=11, fontweight="bold")
    ax1.set_xlabel("Predicted Label", fontsize=11, fontweight="bold")
    
    thresh = cm.max() / 2.0
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax1.text(j, i, f"{int(cm[i, j])}",
                     ha="center", va="center",
                     color="white" if cm[i, j] > thresh else "black",
                     fontsize=11, fontweight="bold")
                     
    # 2. Normalized percentages
    im2 = ax2.imshow(cm_norm, interpolation="nearest", cmap=plt.cm.Greens, vmin=0, vmax=1)
    ax2.set_title("Normalized Confusion Matrix (Recall %)", fontsize=13, fontweight="bold")
    plt.colorbar(im2, ax=ax2, fraction=0.046, pad=0.04)
    ax2.set_xticks(tick_marks)
    ax2.set_xticklabels(DISPLAY_LABELS, rotation=25, fontsize=10)
    ax2.set_yticks(tick_marks)
    ax2.set_yticklabels(DISPLAY_LABELS, fontsize=10)
    ax2.set_ylabel("True Label", fontsize=11, fontweight="bold")
    ax2.set_xlabel("Predicted Label", fontsize=11, fontweight="bold")
    
    thresh2 = cm_norm.max() / 2.0
    for i in range(cm_norm.shape[0]):
        for j in range(cm_norm.shape[1]):
            ax2.text(j, i, f"{cm_norm[i, j]*100:.1f}%",
                     ha="center", va="center",
                     color="white" if cm_norm[i, j] > thresh2 else "black",
                     fontsize=11, fontweight="bold")
                     
    plt.tight_layout()
    plt.savefig(output_path, dpi=200)
    plt.close()
    print(f"Confusion matrices saved to {output_path}")

def plot_qualitative_predictions(model, test_dataset, device, output_path):
    model.eval()
    loader = DataLoader(test_dataset, batch_size=64, shuffle=False)
    
    correct_samples = []
    incorrect_samples = []
    
    with torch.no_grad():
        for images, targets, paths in loader:
            images = images.to(device)
            outputs = model(images)
            probs = torch.softmax(outputs, dim=1)
            confs, preds = torch.max(probs, dim=1)
            
            for img_p, target, pred, conf in zip(paths, targets.cpu().numpy(), preds.cpu().numpy(), confs.cpu().numpy()):
                sample = {
                    "path": img_p,
                    "target": int(target),
                    "pred": int(pred),
                    "conf": float(conf)
                }
                if target == pred:
                    correct_samples.append(sample)
                else:
                    incorrect_samples.append(sample)
                    
    # Select 6 correct (at least 1 per class if possible) and up to 6 incorrect
    selected_correct = []
    for c in range(4):
        for s in correct_samples:
            if s["target"] == c and s not in selected_correct:
                selected_correct.append(s)
                break
    while len(selected_correct) < 6 and len(correct_samples) > len(selected_correct):
        for s in correct_samples:
            if s not in selected_correct:
                selected_correct.append(s)
                break
                
    selected_incorrect = incorrect_samples[:6] if incorrect_samples else []
    
    total_to_display = selected_correct + selected_incorrect
    n_display = len(total_to_display)
    
    cols = 4
    rows = (n_display + cols - 1) // cols
    fig, axes = plt.subplots(rows, cols, figsize=(16, 4 * rows))
    axes = axes.flatten()
    
    for idx, sample in enumerate(total_to_display):
        ax = axes[idx]
        with Image.open(sample["path"]) as img:
            img_rgb = img.convert("RGB")
            ax.imshow(img_rgb)
            
        true_name = DISPLAY_LABELS[sample["target"]]
        pred_name = DISPLAY_LABELS[sample["pred"]]
        conf_pct = sample["conf"] * 100
        
        is_correct = (sample["target"] == sample["pred"])
        color = "#27ae60" if is_correct else "#c0392b"
        status = "CORRECT" if is_correct else "INCORRECT"
        
        title = f"True: {true_name}\nPred: {pred_name} ({conf_pct:.1f}%)\n[{status}]"
        ax.set_title(title, fontsize=10, color=color, fontweight="bold")
        ax.axis("off")
        
    for idx in range(n_display, len(axes)):
        axes[idx].axis("off")
        
    plt.tight_layout()
    plt.savefig(output_path, dpi=200)
    plt.close()
    print(f"Sample qualitative predictions saved to {output_path}")

def measure_inference_speed(model, test_dataset, device):
    model.eval()
    single_img, _, _ = test_dataset[0]
    single_input = single_img.unsqueeze(0).to(device)
    batch_input = torch.stack([test_dataset[i][0] for i in range(16)]).to(device)
    
    # Warmup
    with torch.no_grad():
        for _ in range(10):
            _ = model(single_input)
            if device.type == "cuda":
                torch.cuda.synchronize()
                
    # Single image timing (100 runs)
    runs = 100
    if device.type == "cuda":
        torch.cuda.synchronize()
    t0 = time.time()
    with torch.no_grad():
        for _ in range(runs):
            _ = model(single_input)
            if device.type == "cuda":
                torch.cuda.synchronize()
    single_time = (time.time() - t0) / runs
    
    # Batch of 16 timing (50 runs)
    batch_runs = 50
    if device.type == "cuda":
        torch.cuda.synchronize()
    t0 = time.time()
    with torch.no_grad():
        for _ in range(batch_runs):
            _ = model(batch_input)
            if device.type == "cuda":
                torch.cuda.synchronize()
    batch_time = (time.time() - t0) / batch_runs
    per_item_batch_time = batch_time / 16.0
    
    return {
        "single_image_seconds": single_time,
        "single_image_ms": single_time * 1000.0,
        "batch_16_total_seconds": batch_time,
        "batch_16_per_item_ms": per_item_batch_time * 1000.0
    }

def run_evaluation():
    splits_path = Path("data/classifier/splits.json")
    ckpt_path = Path("checkpoints/classifier/best.pth")
    results_dir = Path("results/classifier")
    
    with open(splits_path, "r") as f:
        splits = json.load(f)
    test_items = splits["test"]
    
    device_gpu = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Loading best checkpoint from {ckpt_path}...")
    
    checkpoint = torch.load(ckpt_path, map_location="cpu")
    model = build_model(num_classes=4, pretrained=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.to(device_gpu)
    model.eval()
    
    image_size = 224
    test_dataset = BrainTumorDataset(test_items, transform=get_val_transforms(image_size))
    test_loader = DataLoader(test_dataset, batch_size=64, shuffle=False)
    
    print(f"Evaluating on untouched Testing set ({len(test_dataset)} samples)...")
    
    all_targets = []
    all_preds = []
    all_confs = []
    
    with torch.no_grad():
        for images, targets, _ in test_loader:
            images = images.to(device_gpu)
            outputs = model(images)
            probs = torch.softmax(outputs, dim=1)
            confs, preds = torch.max(probs, dim=1)
            
            all_targets.extend(targets.numpy())
            all_preds.extend(preds.cpu().numpy())
            all_confs.extend(confs.cpu().numpy())
            
    metrics = compute_classification_metrics(all_targets, all_preds, CLASS_NAMES)
    
    print("\n=================== FINAL TEST EVALUATION RESULTS ===================")
    print(f"Test Accuracy:         {metrics['accuracy']*100:.2f}% ({metrics['accuracy']:.4f})")
    print(f"Macro Precision:       {metrics['macro_precision']*100:.2f}% ({metrics['macro_precision']:.4f})")
    print(f"Macro Recall:          {metrics['macro_recall']*100:.2f}% ({metrics['macro_recall']:.4f})")
    print(f"Macro F1-Score:        {metrics['macro_f1']*100:.2f}% ({metrics['macro_f1']:.4f})")
    print(f"Weighted Precision:    {metrics['weighted_precision']*100:.2f}% ({metrics['weighted_precision']:.4f})")
    print(f"Weighted Recall:       {metrics['weighted_recall']*100:.2f}% ({metrics['weighted_recall']:.4f})")
    print(f"Weighted F1-Score:      {metrics['weighted_f1']*100:.2f}% ({metrics['weighted_f1']:.4f})")
    
    print("\nPer-Class Performance:")
    print(f"{'Class':<14} | {'Precision':<10} | {'Recall':<10} | {'F1-Score':<10} | {'Support':<8}")
    print("-" * 62)
    for cls in CLASS_NAMES:
        c_m = metrics["per_class"][cls]
        print(f"{cls:<14} | {c_m['precision']:<10.4f} | {c_m['recall']:<10.4f} | {c_m['f1']:<10.4f} | {c_m['support']:<8}")
        
    # Plot confusion matrix
    plot_confusion_matrices(metrics["confusion_matrix"], results_dir / "confusion_matrix.png")
    
    # Plot qualitative predictions
    plot_qualitative_predictions(model, test_dataset, device_gpu, results_dir / "sample_predictions.png")
    
    # Model parameters & size
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    ckpt_size_bytes = ckpt_path.stat().st_size
    ckpt_size_mb = ckpt_size_bytes / (1024 * 1024)
    
    print("\nModel Details:")
    print(f"Total Parameters:      {total_params:,}")
    print(f"Trainable Parameters:  {trainable_params:,}")
    print(f"Checkpoint File Size:  {ckpt_size_mb:.2f} MB")
    
    # Inference benchmarks (GPU and CPU)
    print("\nBenchmarking Inference Latency...")
    gpu_speed = measure_inference_speed(model, test_dataset, device_gpu) if torch.cuda.is_available() else None
    
    model_cpu = model.to("cpu")
    cpu_speed = measure_inference_speed(model_cpu, test_dataset, torch.device("cpu"))
    
    print(f"CPU Single Image Latency:  {cpu_speed['single_image_ms']:.2f} ms ({cpu_speed['single_image_seconds']:.4f} s)")
    print(f"CPU Batch (16) Per-Item:   {cpu_speed['batch_16_per_item_ms']:.2f} ms")
    if gpu_speed:
        print(f"GPU Single Image Latency:  {gpu_speed['single_image_ms']:.2f} ms ({gpu_speed['single_image_seconds']:.4f} s)")
        print(f"GPU Batch (16) Per-Item:   {gpu_speed['batch_16_per_item_ms']:.2f} ms")
        
    full_results = {
        "best_epoch": checkpoint.get("epoch", None),
        "test_metrics": metrics,
        "model_parameters": {
            "total": total_params,
            "trainable": trainable_params,
            "checkpoint_size_mb": ckpt_size_mb
        },
        "latency_benchmarks": {
            "cpu": cpu_speed,
            "gpu": gpu_speed
        }
    }
    
    with open(results_dir / "test_metrics.json", "w") as f:
        json.dump(full_results, f, indent=4)
        
    print(f"\nAll test evaluation artifacts written to {results_dir}")

if __name__ == "__main__":
    run_evaluation()
