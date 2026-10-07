import torch
from monai.losses import DiceFocalLoss

from src.data.dataloader import create_dataloaders
from src.models.unetr_baseline import UNETRBaseline
from src.training.trainer import Trainer


# ============================================================
# CONFIGURATION
# ============================================================

DATA_ROOT = (
    "data/raw/BraTS2021/"
    "BraTS2021_Training_Data"
)

PATCH_SIZE = (96, 96, 96)

BATCH_SIZE = 1

LEARNING_RATE = 1e-4

WEIGHT_DECAY = 5e-5

# Actual baseline experiment
EPOCHS = 10

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"


# ============================================================
# MAIN
# ============================================================

def main():

    print("=" * 60)
    print("BASELINE UNETR TRAINING")
    print("=" * 60)

    print(f"Device: {DEVICE}")

    if DEVICE == "cuda":
        print(
            f"GPU: "
            f"{torch.cuda.get_device_name(0)}"
        )

    print(f"Patch size: {PATCH_SIZE}")
    print(f"Batch size: {BATCH_SIZE}")
    print(f"Learning rate: {LEARNING_RATE}")
    print(f"Weight decay: {WEIGHT_DECAY}")
    print(f"Epochs: {EPOCHS}")

    # ========================================================
    # DATASET
    # ========================================================

    print()
    print("-" * 60)
    print("Loading dataset...")
    print("-" * 60)

    train_loader, val_loader = create_dataloaders(
        root_dir=DATA_ROOT,
        patch_size=PATCH_SIZE,
        batch_size=BATCH_SIZE,
        num_workers=0,
    )

    print(
        f"Training subjects: "
        f"{len(train_loader.dataset)}"
    )

    print(
        f"Validation subjects: "
        f"{len(val_loader.dataset)}"
    )

    # ========================================================
    # MODEL
    # ========================================================

    print()
    print("-" * 60)
    print("Creating UNETR model...")
    print("-" * 60)

    model = UNETRBaseline(
        in_channels=4,
        out_channels=4,
    )

    total_parameters = sum(
        p.numel()
        for p in model.parameters()
    )

    trainable_parameters = sum(
        p.numel()
        for p in model.parameters()
        if p.requires_grad
    )

    print(
        f"Total parameters: "
        f"{total_parameters:,}"
    )

    print(
        f"Trainable parameters: "
        f"{trainable_parameters:,}"
    )

    # ========================================================
    # LOSS
    # ========================================================

    print()
    print("-" * 60)
    print("Creating loss function...")
    print("-" * 60)

    loss_function = DiceFocalLoss(
        to_onehot_y=True,
        softmax=True,
    )

    print("Loss: Dice + Focal")

    # ========================================================
    # OPTIMIZER
    # ========================================================

    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=LEARNING_RATE,
        weight_decay=WEIGHT_DECAY,
    )

    print("Optimizer: AdamW")

    # ========================================================
    # TRAINER
    # ========================================================

    trainer = Trainer(
        model=model,
        train_loader=train_loader,
        val_loader=val_loader,
        optimizer=optimizer,
        loss_function=loss_function,
        device=DEVICE,
        output_dir="checkpoints/baseline",
        accumulation_steps=1,
    )

    # ========================================================
    # TRAINING
    # ========================================================

    print()
    print("=" * 60)
    print("STARTING BASELINE TRAINING")
    print("=" * 60)

    for epoch in range(1, EPOCHS + 1):

        print()
        print(
            f"################ EPOCH "
            f"{epoch}/{EPOCHS} ################"
        )

        # ----------------------------------------------------
        # Training
        # ----------------------------------------------------

        train_loss = trainer.train_one_epoch(
            epoch
        )

        # ----------------------------------------------------
        # Validation loss
        # ----------------------------------------------------

        val_loss = trainer.validate_one_epoch(
            epoch
        )

        # ----------------------------------------------------
        # Save epoch checkpoint
        # ----------------------------------------------------

        epoch_checkpoint = trainer.save_checkpoint(
            epoch=epoch,
            train_loss=train_loss,
            val_loss=val_loss,
            filename=f"epoch_{epoch:02d}.pth",
        )

        # ----------------------------------------------------
        # Save latest checkpoint
        # ----------------------------------------------------

        latest_checkpoint = trainer.save_checkpoint(
            epoch=epoch,
            train_loss=train_loss,
            val_loss=val_loss,
            filename="latest.pth",
        )

        # ----------------------------------------------------
        # Print results
        # ----------------------------------------------------

        print()
        print("-" * 60)
        print(f"Epoch {epoch}/{EPOCHS}")
        print(f"Train Loss: {train_loss:.4f}")
        print(f"Val Loss:   {val_loss:.4f}")
        print(
            f"Epoch Checkpoint: "
            f"{epoch_checkpoint}"
        )
        print(
            f"Latest Checkpoint: "
            f"{latest_checkpoint}"
        )
        print("-" * 60)

        # ----------------------------------------------------
        # GPU memory information
        # ----------------------------------------------------

        if DEVICE == "cuda":

            allocated = (
                torch.cuda.memory_allocated()
                / 1024**2
            )

            reserved = (
                torch.cuda.memory_reserved()
                / 1024**2
            )

            print(
                f"GPU Memory Allocated: "
                f"{allocated:.2f} MB"
            )

            print(
                f"GPU Memory Reserved: "
                f"{reserved:.2f} MB"
            )

    # ========================================================
    # COMPLETE
    # ========================================================

    print()
    print("=" * 60)
    print("BASELINE TRAINING COMPLETED")
    print("=" * 60)

    print()
    print("Checkpoints saved in:")
    print("checkpoints/baseline/")

    print()
    print("Available checkpoints:")

    for epoch in range(1, EPOCHS + 1):
        print(
            f"  epoch_{epoch:02d}.pth"
        )

    print()
    print("Latest checkpoint:")
    print("  latest.pth")


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()