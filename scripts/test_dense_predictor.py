import torch

from src.data.dataloader import create_dataloaders
from src.models.unetr_baseline import UNETRBaseline
from src.models.unetr_tokens import UNETRTokenExtractor
from src.models.dense_predictor import DensePredictor
from src.training.masking import PatchMaskGenerator
from src.losses.dense_predictor import DensePredictorLoss


DATA_ROOT = (
    "data/raw/BraTS2021/"
    "BraTS2021_Training_Data"
)

PATCH_SIZE = (96, 96, 96)

DEVICE = (
    "cuda"
    if torch.cuda.is_available()
    else "cpu"
)


def main():

    print("=" * 60)
    print("DENSE PREDICTOR TEST")
    print("=" * 60)

    print("Device:", DEVICE)

    if DEVICE == "cuda":
        print(
            "GPU:",
            torch.cuda.get_device_name(0)
        )

    # --------------------------------------------------
    # Data
    # --------------------------------------------------

    train_loader, _ = create_dataloaders(
        root_dir=DATA_ROOT,
        patch_size=PATCH_SIZE,
        batch_size=1,
        num_workers=0,
    )

    batch = next(iter(train_loader))

    images = batch["image"].to(
        DEVICE
    )

    print(
        "Input shape:",
        images.shape
    )

    # --------------------------------------------------
    # Student backbone
    # --------------------------------------------------

    student = UNETRBaseline(
        in_channels=4,
        out_channels=4,
    ).to(DEVICE)

    extractor = UNETRTokenExtractor(
        student
    )

    # --------------------------------------------------
    # Mask
    # --------------------------------------------------

    mask_generator = PatchMaskGenerator(
        image_size=PATCH_SIZE,
        patch_size=(16, 16, 16),
        mask_ratio=0.6,
    )

    mask = mask_generator(
        batch_size=images.shape[0],
        device=DEVICE,
    )

    print(
        "Token count:",
        mask.shape[1]
    )

    print(
        "Masked tokens:",
        mask.sum().item()
    )

    print(
        "Mask ratio:",
        f"{mask.float().mean().item():.4f}"
    )

    # --------------------------------------------------
    # Extract masked tokens
    # --------------------------------------------------

    tokens, _ = extractor(
        images,
        mask=mask,
    )

    print(
        "Token shape:",
        tokens.shape
    )

    # --------------------------------------------------
    # Dense Predictor
    # --------------------------------------------------

    predictor = DensePredictor(
        hidden_size=768,
        in_channels=4,
        patch_size=(16, 16, 16),
    ).to(DEVICE)

    reconstruction = predictor(
        tokens,
        image_size=PATCH_SIZE,
    )

    print(
        "Reconstruction shape:",
        reconstruction.shape
    )

    # --------------------------------------------------
    # Loss
    # --------------------------------------------------

    loss_function = DensePredictorLoss(
        patch_size=(16, 16, 16)
    )

    loss = loss_function(
        reconstruction,
        images,
        mask,
    )

    print(
        "Dense Predictor loss:",
        f"{loss.item():.6f}"
    )

    # --------------------------------------------------
    # Backward
    # --------------------------------------------------

    loss.backward()

    print(
        "Backward pass: OK"
    )

    # --------------------------------------------------
    # GPU memory
    # --------------------------------------------------

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
            f"GPU allocated: "
            f"{allocated:.2f} MB"
        )

        print(
            f"GPU reserved: "
            f"{reserved:.2f} MB"
        )

    print()
    print(
        "DENSE PREDICTOR TEST PASSED"
    )


if __name__ == "__main__":
    main()