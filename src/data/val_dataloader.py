from pathlib import Path
from typing import Optional

import torch
from torch.utils.data import DataLoader

from src.data.brats_val_dataset import BraTSValidationDataset


def create_validation_loader(
    root_dir: str = "data/raw/BraTS2021/BraTS2021_Training_Data",
    batch_size: int = 1,
    num_workers: int = 0,
    seed: int = 42,
    val_split_file: str = "data/splits/val.txt",
) -> DataLoader:
    """
    Creates full-volume validation DataLoader using explicit split IDs.
    Fails clearly if the split file does not exist.
    """
    val_path = Path(val_split_file)

    if not val_path.exists():
        raise FileNotFoundError(
            f"Validation split file missing: '{val_path}'.\n"
            "Please run 'python scripts/create_splits.py' first to generate deterministic splits."
        )

    with open(val_path, "r", encoding="utf-8") as f:
        val_ids = [line.strip() for line in f if line.strip()]

    dataset = BraTSValidationDataset(
        root_dir=root_dir,
        patient_ids=val_ids,
    )

    loader = DataLoader(
        dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available(),
    )

    return loader