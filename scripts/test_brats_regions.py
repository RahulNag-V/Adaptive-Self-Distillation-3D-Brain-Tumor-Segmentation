import torch

from src.data.brats_dataset import BraTSDataset
from src.evaluation.brats_regions import get_brats_regions


DATA_ROOT = "data/raw/BraTS2021/BraTS2021_Training_Data"


def main():
    dataset = BraTSDataset(
        root_dir=DATA_ROOT,
        patch_size=(96, 96, 96),
    )

    sample = dataset[0]

    label = sample["label"]

    print("Patient:", sample["patient_id"])
    print("Label shape:", label.shape)
    print("Label values:", torch.unique(label).tolist())

    regions = get_brats_regions(label)

    wt = regions["WT"]
    tc = regions["TC"]
    et = regions["ET"]

    print("\nRegion voxel counts:")
    print("WT:", wt.sum().item())
    print("TC:", tc.sum().item())
    print("ET:", et.sum().item())

    # Check hierarchical relationship:
    # ET ⊆ TC ⊆ WT
    assert torch.all(~et | tc), "ERROR: ET is not a subset of TC"
    assert torch.all(~tc | wt), "ERROR: TC is not a subset of WT"

    print("\nET ⊆ TC:", True)
    print("TC ⊆ WT:", True)

    print("\nBRATS REGION TEST PASSED")


if __name__ == "__main__":
    main()