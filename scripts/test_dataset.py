import torch

from src.data.brats_dataset import BraTSDataset


def main():
    print("=" * 60)
    print("BRATS DATASET TEST")
    print("=" * 60)

    dataset = BraTSDataset(
        root_dir=(
            "data/raw/"
            "BraTS2021/"
            "BraTS2021_Training_Data"
        ),
        patch_size=(96, 96, 96),
    )

    print(f"Dataset size: {len(dataset)}")

    sample = dataset[0]

    image = sample["image"]
    label = sample["label"]

    print(f"Patient ID : {sample['patient_id']}")
    print(f"Image shape: {image.shape}")
    print(f"Label shape: {label.shape}")
    print(f"Image dtype: {image.dtype}")
    print(f"Label dtype: {label.dtype}")

    print(
        "Label values:",
        torch.unique(label).cpu().numpy()
    )

    print(
        "Image range:",
        float(image.min()),
        "to",
        float(image.max()),
    )

    assert image.shape[0] == 4
    assert tuple(image.shape[1:]) == (96, 96, 96)
    assert tuple(label.shape[1:]) == (96, 96, 96)

    print("=" * 60)
    print("DATASET TEST PASSED")
    print("=" * 60)


if __name__ == "__main__":
    main()