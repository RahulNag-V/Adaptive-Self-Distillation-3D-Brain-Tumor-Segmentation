"""
2D Brain Tumor Classification Service for dashboard backend.
Loads checkpoints/classifier/best.pth on demand or startup.
"""
import io
import time
from pathlib import Path
from typing import Dict, Any
from PIL import Image
import torch

from src.classifier.model import build_model
from src.classifier.dataset import get_val_transforms, CLASS_NAMES

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent
DEFAULT_CLASSIFIER_CHECKPOINT = PROJECT_ROOT / "checkpoints" / "classifier" / "best.pth"

class ClassificationService:
    _model = None
    _device = None

    @classmethod
    def get_model(cls):
        if cls._model is None:
            cls._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
            ckpt_path = DEFAULT_CLASSIFIER_CHECKPOINT
            if not ckpt_path.exists():
                # Fallback to local relative path if needed
                ckpt_path = Path("checkpoints/classifier/best.pth")
            if not ckpt_path.exists():
                raise FileNotFoundError(f"Classifier checkpoint not found at {DEFAULT_CLASSIFIER_CHECKPOINT}")
            model = build_model(num_classes=len(CLASS_NAMES), pretrained=False)
            checkpoint = torch.load(ckpt_path, map_location=cls._device)
            model.load_state_dict(checkpoint["model_state_dict"])
            model.to(cls._device)
            model.eval()
            cls._model = model
        return cls._model, cls._device

    @classmethod
    def classify_image_bytes(cls, image_bytes: bytes) -> Dict[str, Any]:
        model, device = cls.get_model()
        
        # Load image via PIL
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        transform = get_val_transforms(image_size=224)
        tensor_input = transform(img).unsqueeze(0).to(device)
        
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
        pred_conf = float(probs[pred_idx].item())
        
        prob_dict = {CLASS_NAMES[i]: float(probs[i].item()) for i in range(len(CLASS_NAMES))}
        
        return {
            "predicted_class": pred_class,
            "confidence": pred_conf,
            "probabilities": prob_dict,
            "inference_time_seconds": inference_time,
            "inference_time_ms": round(inference_time * 1000.0, 2),
            "model": "EfficientNet-B0",
            "device": "CUDA" if device.type == "cuda" else "CPU"
        }
