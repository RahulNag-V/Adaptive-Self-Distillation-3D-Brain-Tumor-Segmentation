"""Generate deterministic train/val splits for BraTS2021 dataset.

Splits:
- Seed: 42
- 80% train (40 subjects)
- 20% validation (10 subjects)
Matches the exact split used in completed experiments.
"""

from pathlib import Path
import torch
from torch.utils.data import random_split


def create_splits(
    root_dir: str = "data/raw/BraTS2021/BraTS2021_Training_Data",
    output_dir: str = "data/splits",
    train_ratio: float = 0.8,
    seed: int = 42,
):
    raw_path = Path(root_dir)
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    patient_dirs = sorted([p for p in raw_path.iterdir() if p.is_dir()])
    total_subjects = len(patient_dirs)

    if total_subjects == 0:
        raise RuntimeError(f"No patient directories found in {root_dir}")

    train_size = int(train_ratio * total_subjects)
    val_size = total_subjects - train_size

    generator = torch.Generator().manual_seed(seed)
    train_subset, val_subset = random_split(
        range(total_subjects),
        [train_size, val_size],
        generator=generator,
    )

    train_ids = sorted([patient_dirs[i].name for i in train_subset.indices])
    val_ids = sorted([patient_dirs[i].name for i in val_subset.indices])

    train_file = out_path / "train.txt"
    val_file = out_path / "val.txt"

    with open(train_file, "w", encoding="utf-8") as f:
        for pid in train_ids:
            f.write(f"{pid}\n")

    with open(val_file, "w", encoding="utf-8") as f:
        for pid in val_ids:
            f.write(f"{pid}\n")

    print(f"Splits generated successfully in {out_path}:")
    print(f"  Train: {len(train_ids)} subjects -> {train_file}")
    print(f"  Val:   {len(val_ids)} subjects -> {val_file}")

    return train_ids, val_ids


if __name__ == "__main__":
    create_splits()
