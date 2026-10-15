from pathlib import Path
from PIL import Image
import torch
from torch.utils.data import Dataset
from torchvision import transforms

CLASS_NAMES = ["glioma", "meningioma", "notumor", "pituitary"]
CLASS_TO_IDX = {name: i for i, name in enumerate(CLASS_NAMES)}

def get_train_transforms(image_size=224):
    """
    Standard classification training transforms:
    Mild spatial and intensity augmentations preserving tumor morphology.
    """
    return transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.RandomCrop(image_size),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=10),
        transforms.RandomAffine(degrees=0, translate=(0.05, 0.05)),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])

def get_val_transforms(image_size=224):
    """
    Deterministic validation and test transforms.
    """
    return transforms.Compose([
        transforms.Resize((256, 256)),
        transforms.CenterCrop(image_size),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])

class BrainTumorDataset(Dataset):
    def __init__(self, items, transform=None):
        """
        items: list of dicts with keys 'path', 'label', 'class'
        """
        self.items = items
        self.transform = transform

    def __len__(self):
        return len(self.items)

    def __getitem__(self, idx):
        item = self.items[idx]
        img_path = item["path"]
        label = item["label"]
        
        # Load image and ensure 3 channels RGB
        with Image.open(img_path) as img:
            img = img.convert("RGB")
            
        if self.transform is not None:
            img = self.transform(img)
            
        return img, torch.tensor(label, dtype=torch.long), img_path
