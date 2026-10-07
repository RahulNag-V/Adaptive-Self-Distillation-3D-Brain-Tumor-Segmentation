import torch

from src.data.dataloader import create_dataloaders


def main():
    print("=" * 60)
    print("BRATS DATALOADER TEST")
    print("=" * 60)

    train_loader, val_loader = create_dataloaders(
        root_dir=(
            "data/raw/"
            "BraTS2021/"
            "BraTS2021_Training_Data"
        ),
        patch_size=(96, 96, 96),
        batch_size=1,
        num_workers=0,
        seed=42,
    )

    print(f"Training subjects   : {len(train_loader.dataset)}")
    print(f"Validation subjects : {len(val_loader.dataset)}")

    batch = next(iter(train_loader))

    image = batch["image"]
    label = batch["label"]

    print(f"\nImage shape : {image.shape}")
    print(f"Label shape : {label.shape}")
    print(f"Image device: {image.device}")
    print(f"Label device: {label.device}")

    print(
        "Label values:",
        torch.unique(label).numpy()
    )

    print("=" * 60)
    print("DATALOADER TEST PASSED")
    print("=" * 60)


if __name__ == "__main__":
    main()