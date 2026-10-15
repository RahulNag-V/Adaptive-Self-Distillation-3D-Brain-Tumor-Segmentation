import argparse
import sys
import time
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from PIL import Image
import torch

from src.classifier.model import build_model
from src.classifier.dataset import get_val_transforms, CLASS_NAMES

def classify(image_path_str, checkpoint_path_str=None):
    image_path = Path(image_path_str)
    if not image_path.exists():
        print(f"Error: Image path does not exist: {image_path_str}", file=sys.stderr)
        sys.exit(1)
        
    if checkpoint_path_str is None:
        checkpoint_path = Path("checkpoints/classifier/best.pth")
    else:
        checkpoint_path = Path(checkpoint_path_str)
        
    if not checkpoint_path.exists():
        print(f"Error: Checkpoint path does not exist: {checkpoint_path}", file=sys.stderr)
        sys.exit(1)
        
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    # Load model
    model = build_model(num_classes=len(CLASS_NAMES), pretrained=False)
    ckpt = torch.load(checkpoint_path, map_location=device)
    model.load_state_dict(ckpt["model_state_dict"])
    model.to(device)
    model.eval()
    
    # Load & transform image
    transform = get_val_transforms(image_size=224)
    with Image.open(image_path) as img:
        img_rgb = img.convert("RGB")
    tensor_input = transform(img_rgb).unsqueeze(0).to(device)
    
    # Inference with timing
    if device.type == "cuda":
        torch.cuda.synchronize()
    t0 = time.time()
    with torch.no_grad():
        logits = model(tensor_input)
        probs = torch.softmax(logits, dim=1).squeeze(0)
    if device.type == "cuda":
        torch.cuda.synchronize()
    inference_time = time.time() - t0
    
    pred_idx = torch.argmax(probs).item()
    pred_class = CLASS_NAMES[pred_idx]
    pred_conf = probs[pred_idx].item()
    
    # Top-3 predictions
    topk_probs, topk_indices = torch.topk(probs, k=min(3, len(CLASS_NAMES)))
    top_3_list = [
        f"{CLASS_NAMES[idx]}: {prob * 100:.2f}%"
        for prob, idx in zip(topk_probs.cpu().tolist(), topk_indices.cpu().tolist())
    ]
    top_3_str = ", ".join(top_3_list)
    
    device_name = f"{device} ({torch.cuda.get_device_name(0)})" if device.type == "cuda" else "CPU"
    
    print(f"Predicted class:   {pred_class}")
    print(f"Confidence:        {pred_conf * 100:.2f}% ({pred_conf:.4f})")
    print(f"Top-3 predictions: {top_3_str}")
    print(f"Inference time:    {inference_time * 1000:.2f} ms ({inference_time:.4f} s)")
    print(f"Device:            {device_name}")
    
    return {
        "predicted_class": pred_class,
        "confidence": pred_conf,
        "probabilities": {CLASS_NAMES[i]: float(probs[i].item()) for i in range(len(CLASS_NAMES))},
        "inference_time_seconds": inference_time,
        "top3": top_3_list
    }

def main():
    parser = argparse.ArgumentParser(description="Classify a 2D brain MRI image into tumor categories.")
    parser.add_argument("--image", type=str, required=True, help="Path to brain MRI image (JPG/PNG).")
    parser.add_argument("--checkpoint", type=str, default=None, help="Path to model checkpoint (default: checkpoints/classifier/best.pth).")
    args = parser.parse_args()
    
    classify(args.image, args.checkpoint)

if __name__ == "__main__":
    main()
