import copy
import os

import torch
from monai.losses import DiceFocalLoss

from src.data.dataloader import create_dataloaders
from src.models.unetr_baseline import UNETRBaseline
from src.models.unetr_tokens import UNETRTokenExtractor
from src.models.dense_predictor import DensePredictor
from src.models.ema import update_ema

from src.training.masking import PatchMaskGenerator

from src.losses.online_tokenizer import OnlineTokenizerLoss
from src.losses.dense_predictor import DensePredictorLoss
from src.losses.mod_loss import MODLoss


def main():

    print("=" * 60)
    print("FULL MOD TRAINING STEP TEST")
    print("=" * 60)

    # ---------------------------------------------------------
    # Device
    # ---------------------------------------------------------

    device = torch.device(
        "cuda" if torch.cuda.is_available() else "cpu"
    )

    print(f"Device: {device}")

    if torch.cuda.is_available():
        print(
            f"GPU: {torch.cuda.get_device_name(0)}"
        )
        torch.cuda.empty_cache()
        torch.cuda.reset_peak_memory_stats()

    # ---------------------------------------------------------
    # Dataset
    # ---------------------------------------------------------

    root_dir = os.path.join(
        "data",
        "raw",
        "BraTS2021",
        "BraTS2021_Training_Data",
    )

    print(f"Dataset: {root_dir}")

    train_loader, _ = create_dataloaders(
        root_dir=root_dir,
        patch_size=(96, 96, 96),
        batch_size=1,
        num_workers=0,
        seed=42,
    )

    # ---------------------------------------------------------
    # Get one training batch
    # ---------------------------------------------------------

    batch = next(iter(train_loader))

    images = batch["image"].to(device)
    labels = batch["label"].to(device).long()

    print(f"Input shape: {images.shape}")
    print(f"Label shape: {labels.shape}")

    # ---------------------------------------------------------
    # Student
    # ---------------------------------------------------------

    print("\nCreating student...")

    student = UNETRBaseline(
        in_channels=4,
        out_channels=4,
    ).to(device)

    # ---------------------------------------------------------
    # Teacher
    # ---------------------------------------------------------

    print("Creating EMA teacher...")

    teacher = copy.deepcopy(student).to(device)

    teacher.eval()

    for parameter in teacher.parameters():
        parameter.requires_grad = False

    # ---------------------------------------------------------
    # Token Extractors
    # ---------------------------------------------------------

    print("Creating token extractors...")

    student_token_extractor = UNETRTokenExtractor(
        student
    )

    teacher_token_extractor = UNETRTokenExtractor(
        teacher
    )

    # ---------------------------------------------------------
    # Mask Generator
    # ---------------------------------------------------------

    mask_generator = PatchMaskGenerator(
        image_size=(96, 96, 96),
        patch_size=(16, 16, 16),
        mask_ratio=0.6,
    )

    mask = mask_generator(
        batch_size=images.shape[0],
        device=device,
    )

    print(f"\nToken count: {mask.shape[1]}")
    print(
        f"Masked tokens: {mask.sum().item()}"
    )
    print(
        f"Mask ratio: {mask.float().mean().item():.4f}"
    )

    # ---------------------------------------------------------
    # Dense Predictor
    # ---------------------------------------------------------

    dense_predictor = DensePredictor(
        hidden_size=768,
        in_channels=4,
        patch_size=(16, 16, 16),
    ).to(device)

    # ---------------------------------------------------------
    # Loss functions
    # ---------------------------------------------------------

    segmentation_loss_fn = DiceFocalLoss(
        to_onehot_y=True,
        softmax=True,
    )

    online_tokenizer_loss_fn = OnlineTokenizerLoss()

    dense_predictor_loss_fn = DensePredictorLoss(
        patch_size=(16, 16, 16)
    )

    mod_loss_fn = MODLoss(
        lambda_ot=1.0,
        lambda_dp=1.0,
    )

    # ---------------------------------------------------------
    # Optimizer
    # ---------------------------------------------------------

    optimizer = torch.optim.AdamW(
        list(student.parameters())
        + list(dense_predictor.parameters()),
        lr=1e-4,
        weight_decay=5e-5,
    )

    optimizer.zero_grad(set_to_none=True)

    # =========================================================
    # 1. SEGMENTATION
    # =========================================================

    print("\n[1/6] Segmentation forward...")

    with torch.autocast(
        device_type="cuda",
        dtype=torch.float16,
        enabled=torch.cuda.is_available(),
    ):

        segmentation_output = student(images)

        segmentation_loss = segmentation_loss_fn(
            segmentation_output,
            labels,
        )

    print(
        f"Segmentation output: "
        f"{segmentation_output.shape}"
    )

    print(
        f"Segmentation loss: "
        f"{segmentation_loss.item():.6f}"
    )

    # =========================================================
    # 2. STUDENT TOKENS
    # =========================================================

    print("\n[2/6] Student token extraction...")

    with torch.autocast(
        device_type="cuda",
        dtype=torch.float16,
        enabled=torch.cuda.is_available(),
    ):

        student_tokens, _ = student_token_extractor(
            images,
            mask=mask,
        )

    print(
        f"Student token shape: "
        f"{student_tokens.shape}"
    )

    # =========================================================
    # 3. TEACHER TOKENS
    # =========================================================

    print("\n[3/6] Teacher token extraction...")

    with torch.no_grad():

        with torch.autocast(
            device_type="cuda",
            dtype=torch.float16,
            enabled=torch.cuda.is_available(),
        ):

            teacher_tokens, _ = teacher_token_extractor(
                images,
                mask=None,
            )

    print(
        f"Teacher token shape: "
        f"{teacher_tokens.shape}"
    )

    # =========================================================
    # 4. ONLINE TOKENIZER
    # =========================================================

    print("\n[4/6] Online Tokenizer loss...")

    online_tokenizer_loss = (
        online_tokenizer_loss_fn(
            student_tokens,
            teacher_tokens,
            mask,
        )
    )

    print(
        f"Online Tokenizer loss: "
        f"{online_tokenizer_loss.item():.6f}"
    )

    # =========================================================
    # 5. DENSE PREDICTOR
    # =========================================================

    print("\n[5/6] Dense Predictor...")

    with torch.autocast(
        device_type="cuda",
        dtype=torch.float16,
        enabled=torch.cuda.is_available(),
    ):

        reconstruction = dense_predictor(
            student_tokens,
            image_size=images.shape[2:],
        )

        dense_predictor_loss = (
            dense_predictor_loss_fn(
                reconstruction,
                images,
                mask,
            )
        )

    print(
        f"Reconstruction shape: "
        f"{reconstruction.shape}"
    )

    print(
        f"Dense Predictor loss: "
        f"{dense_predictor_loss.item():.6f}"
    )

    # =========================================================
    # 6. COMBINED MOD LOSS
    # =========================================================

    print("\n[6/6] Combining losses...")

    mod_loss = mod_loss_fn(
        online_tokenizer_loss,
        dense_predictor_loss,
    )

    total_loss = (
        segmentation_loss
        + mod_loss
    )

    print(
        f"MOD loss: "
        f"{mod_loss.item():.6f}"
    )

    print(
        f"Total loss: "
        f"{total_loss.item():.6f}"
    )

    # =========================================================
    # BACKWARD
    # =========================================================

    print("\nRunning backward pass...")

    total_loss.backward()

    print("Backward pass: OK")

    # =========================================================
    # OPTIMIZER
    # =========================================================

    print("Running optimizer step...")

    optimizer.step()

    print("Optimizer step: OK")

    # =========================================================
    # EMA
    # =========================================================

    print("Updating teacher EMA...")

    update_ema(
        student=student,
        teacher=teacher,
        momentum=0.996,
    )

    print("Teacher EMA update: OK")

    # =========================================================
    # MEMORY
    # =========================================================

    if torch.cuda.is_available():

        allocated = (
            torch.cuda.memory_allocated()
            / 1024**2
        )

        reserved = (
            torch.cuda.memory_reserved()
            / 1024**2
        )

        peak = (
            torch.cuda.max_memory_allocated()
            / 1024**2
        )

        print("\nGPU MEMORY")
        print("-" * 40)
        print(
            f"GPU allocated: "
            f"{allocated:.2f} MB"
        )
        print(
            f"GPU reserved: "
            f"{reserved:.2f} MB"
        )
        print(
            f"Peak GPU allocated: "
            f"{peak:.2f} MB"
        )

    # =========================================================
    # FINAL
    # =========================================================

    print()
    print("=" * 60)
    print("FULL MOD TRAINING STEP TEST PASSED")
    print("=" * 60)


if __name__ == "__main__":
    main()