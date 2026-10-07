import torch
from monai.losses import DiceFocalLoss

from src.data.dataloader import create_dataloaders
from src.models.unetr_baseline import UNETRBaseline


def main():
    print("=" * 60)
    print("FIRST UNETR TRAINING STEP")
    print("=" * 60)

    device = torch.device(
        "cuda" if torch.cuda.is_available() else "cpu"
    )

    print(f"Device: {device}")

    # --------------------------------------------------
    # Data
    # --------------------------------------------------

    train_loader, _ = create_dataloaders(
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

    batch = next(iter(train_loader))

    images = batch["image"].to(device)
    labels = batch["label"].to(device)

    print(f"Input shape : {images.shape}")
    print(f"Label shape : {labels.shape}")

    # --------------------------------------------------
    # Model
    # --------------------------------------------------

    model = UNETRBaseline(
        in_channels=4,
        out_channels=4,
    ).to(device)

    model.train()

    # --------------------------------------------------
    # Loss
    # --------------------------------------------------

    loss_function = DiceFocalLoss(
        include_background=True,
        to_onehot_y=True,
        softmax=True,
    )

    # --------------------------------------------------
    # Optimizer
    # --------------------------------------------------

    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=1e-4,
        weight_decay=5e-5,
    )

    # --------------------------------------------------
    # Forward pass
    # --------------------------------------------------

    optimizer.zero_grad(set_to_none=True)

    with torch.autocast(
        device_type="cuda",
        dtype=torch.float16,
    ):
        outputs = model(images)
        loss = loss_function(outputs, labels)

    print(f"Output shape: {outputs.shape}")
    print(f"Loss: {loss.item():.6f}")

    # --------------------------------------------------
    # Backward pass
    # --------------------------------------------------

    loss.backward()

    optimizer.step()

    print("Backward pass: OK")
    print("Optimizer step: OK")

    # --------------------------------------------------
    # GPU memory
    # --------------------------------------------------

    allocated = (
        torch.cuda.memory_allocated() / 1024**2
    )

    reserved = (
        torch.cuda.memory_reserved() / 1024**2
    )

    print(f"GPU allocated: {allocated:.2f} MB")
    print(f"GPU reserved : {reserved:.2f} MB")

    print("=" * 60)
    print("FIRST TRAINING STEP PASSED")
    print("=" * 60)


if __name__ == "__main__":
    main()