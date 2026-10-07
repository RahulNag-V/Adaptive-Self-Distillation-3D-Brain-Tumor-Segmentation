from pathlib import Path
from typing import List, Optional

from torch.utils.data import Dataset

from src.data.val_transforms import get_val_transforms


class BraTSValidationDataset(Dataset):

    def __init__(
        self,
        root_dir,
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

        self.transform = (
            transform
            if transform is not None
            else get_val_transforms()
        )

    def __len__(self):
        return len(self.patient_dirs)

    def __getitem__(self, index):
        patient_dir = self.patient_dirs[index]
        patient_id = patient_dir.name

        data = {
            "image": [
                str(
                    patient_dir
                    / f"{patient_id}_flair.nii.gz"
                ),
                str(
                    patient_dir
                    / f"{patient_id}_t1.nii.gz"
                ),
                str(
                    patient_dir
                    / f"{patient_id}_t1ce.nii.gz"
                ),
                str(
                    patient_dir
                    / f"{patient_id}_t2.nii.gz"
                ),
            ],
            "label": str(
                patient_dir
                / f"{patient_id}_seg.nii.gz"
            ),
        }

        sample = self.transform(data)
        label = sample["label"].clone()

        # Original BraTS label 4 = Enhancing Tumor.
        # Internally we remap label 4 -> 3.
        label[label == 4] = 3

        sample["label"] = label.long()
        sample["patient_id"] = patient_id

        return sample