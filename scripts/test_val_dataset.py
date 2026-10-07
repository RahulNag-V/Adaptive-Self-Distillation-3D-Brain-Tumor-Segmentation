import torch

from src.data.val_dataloader import create_validation_loader


DATA_ROOT = (
    "data/raw/BraTS2021/"
    "BraTS2021_Training_Data"
)


def main():

    loader = create_validation_loader(
        root_dir=DATA_ROOT,
        batch_size=1,
        num_workers=0,
    )

    print("Validation subjects:", len(loader.dataset))

    batch = next(iter(loader))

    image = batch["image"]
    label = batch["label"]

    print("Patient:", batch["patient_id"][0])
    print("Image shape:", image.shape)
    print("Label shape:", label.shape)
    print(
        "Label values:",
        torch.unique(label).tolist()
    )

    print()
    print("FULL-VOLUME VALIDATION TEST PASSED")


if __name__ == "__main__":
    main()