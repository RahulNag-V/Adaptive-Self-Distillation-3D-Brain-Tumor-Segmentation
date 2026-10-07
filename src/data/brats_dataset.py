from pathlib import Path
from typing import List, Optional

import numpy as np
from torch.utils.data import Dataset

from src.data.transforms import get_train_transforms


class BraTSDataset(Dataset):
    """
    BraTS 2021 dataset loader.

    Expected directory structure:

    BraTS2021_Training_Data/
        BraTS2021_XXXXX/
            BraTS2021_XXXXX_flair.nii.gz
            BraTS2021_XXXXX_t1.nii.gz
            BraTS2021_XXXXX_t1ce.nii.gz
            BraTS2021_XXXXX_t2.nii.gz
            BraTS2021_XXXXX_seg.nii.gz
    """

    def __init__(
        self,
        root_dir,
        patch_size=(96, 96, 96),
        transform=None,
        patient_ids: Optional[List[str]] = None,
    ):
        self.root_dir = Path(root_dir)

        if patient_ids is not None:
            self.patient_dirs = [self.root_dir / pid for pid in patient_ids]
        else:
            self.patient_dirs = sorted(
                [
                    p
                    for p in self.root_dir.iterdir()
                    if p.is_dir()
                ]
            )

        if not self.patient_dirs:
            raise RuntimeError(
                f"No patient directories found in {self.root_dir}"
            )

        self.transform = transform or get_train_transforms(
            patch_size=patch_size
        )

    def __len__(self):
        return len(self.patient_dirs)

    def __getitem__(self, index):
        patient_dir = self.patient_dirs[index]
        patient_id = patient_dir.name

        data = {
            "image": [
                str(patient_dir / f"{patient_id}_flair.nii.gz"),
                str(patient_dir / f"{patient_id}_t1.nii.gz"),
                str(patient_dir / f"{patient_id}_t1ce.nii.gz"),
                str(patient_dir / f"{patient_id}_t2.nii.gz"),
            ],
            "label": str(
                patient_dir / f"{patient_id}_seg.nii.gz"
            ),
        }

        sample = self.transform(data)

        # MONAI's RandCropByPosNegLabeld returns a list
        # when num_samples > 1. We use num_samples=1.
        if isinstance(sample, list):
            sample = sample[0]

        # BraTS labels:
        # 0 = background
        # 1 = tumor region (NCR/NET)
        # 2 = tumor region (Edema)
        # 4 = tumor region (Enhancing Tumor)
        #
        # Convert label 4 -> 3 so that labels become:
        # 0, 1, 2, 3
        label = sample["label"]
        label = label.clone()
        label[label == 4] = 3

        sample["label"] = label.long()
        sample["patient_id"] = patient_id

        return sample