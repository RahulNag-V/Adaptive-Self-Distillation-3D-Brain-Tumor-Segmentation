from pathlib import Path
from typing import Optional, Tuple

import torch
from torch.utils.data import DataLoader

from src.data.brats_dataset import BraTSDataset


def create_dataloaders(
    root_dir: str = "data/raw/BraTS2021/BraTS2021_Training_Data",
    patch_size: Tuple[int, int, int] = (96, 96, 96),
    batch_size: int = 1,
    num_workers: int = 0,
    seed: int = 42,
    train_split_file: str = "data/splits/train.txt",
    val_split_file: str = "data/splits/val.txt",
) -> Tuple[DataLoader, DataLoader]:
    """
    Creates reproducible training and validation data loaders.
    
    Loads split IDs from train_split_file and val_split_file.
    Fails clearly if split files do not exist.
    """
    train_path = Path(train_split_file)
    val_path = Path(val_split_file)

    if not train_path.exists() or not val_path.exists():
        raise FileNotFoundError(
            f"Reproducible split files missing: '{train_path}' or '{val_path}'.\n"
            "Please run 'python scripts/create_splits.py' first to generate deterministic splits."
        )

    with open(train_path, "r", encoding="utf-8") as f:
        train_ids = [line.strip() for line in f if line.strip()]

    with open(val_path, "r", encoding="utf-8") as f:
        val_ids = [line.strip() for line in f if line.strip()]

    train_dataset = BraTSDataset(
        root_dir=root_dir,
        patch_size=patch_size,
        patient_ids=train_ids,
    )

    val_dataset = BraTSDataset(
        root_dir=root_dir,
        patch_size=patch_size,
        patient_ids=val_ids,
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available(),
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available(),
    )

    return train_loader, val_loader