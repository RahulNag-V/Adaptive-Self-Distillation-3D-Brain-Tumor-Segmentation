import copy
import os
import time

import torch
from monai.losses import DiceFocalLoss
from tqdm import tqdm

from src.data.dataloader import create_dataloaders
from src.models.unetr_baseline import UNETRBaseline
from src.models.unetr_tokens import UNETRTokenExtractor
from src.models.dense_predictor import DensePredictor
from src.models.ema import update_ema

from src.training.masking import PatchMaskGenerator

from src.losses.online_tokenizer import OnlineTokenizerLoss
from src.losses.dense_predictor import DensePredictorLoss
from src.losses.mod_loss import MODLoss


# ============================================================
# CONFIGURATION
# ============================================================

ROOT_DIR = os.path.join(
    "data",
    "raw",
    "BraTS2021",
    "BraTS2021_Training_Data",
)

CHECKPOINT_DIR = os.path.join(
    "checkpoints",
    "mod",
)

EPOCHS = 10

PATCH_SIZE = (96, 96, 96)

TOKEN_PATCH_SIZE = (16, 16, 16)

MASK_RATIO = 0.60

BATCH_SIZE = 1

NUM_WORKERS = 0

LEARNING_RATE = 1e-4

WEIGHT_DECAY = 5e-5

EMA_MOMENTUM = 0.996

LAMBDA_OT = 1.0

LAMBDA_DP = 1.0


# ============================================================
# CHECKPOINT
# ============================================================

def save_checkpoint(
    epoch,
    student,
    teacher,
    dense_predictor,
    optimizer,
    best_loss,
    path,
):

    checkpoint = {
        "epoch": epoch,

        "student_state_dict":
            student.state_dict(),

        "teacher_state_dict":
            teacher.state_dict(),

        "dense_predictor_state_dict":
            dense_predictor.state_dict(),

        "optimizer_state_dict":
            optimizer.state_dict(),

        "best_loss": best_loss,
    }

    torch.save(
        checkpoint,
        path,
    )


# ============================================================
# TRAINING
# ============================================================

def main():

    print("=" * 70)
    print("ADAPTIVE SELF-DISTILLATION — MOD TRAINING")
    print("=" * 70)

    # --------------------------------------------------------
    # Device
    # --------------------------------------------------------

    device = torch.device(
        "cuda"
        if torch.cuda.is_available()
        else "cpu"
    )

    print(f"Device: {device}")

    if torch.cuda.is_available():

        print(
            f"GPU: "
            f"{torch.cuda.get_device_name(0)}"
        )

        total_memory = (
            torch.cuda.get_device_properties(0)
            .total_memory
            / 1024**3
        )

        print(
            f"GPU Memory: "
            f"{total_memory:.2f} GB"
        )

    # --------------------------------------------------------
    # Directories
    # --------------------------------------------------------

    os.makedirs(
        CHECKPOINT_DIR,
        exist_ok=True,
    )

    # --------------------------------------------------------
    # Dataset
    # --------------------------------------------------------

    print("\nLoading dataset...")

    train_loader, val_loader = create_dataloaders(
        root_dir=ROOT_DIR,
        patch_size=PATCH_SIZE,
        batch_size=BATCH_SIZE,
        num_workers=NUM_WORKERS,
        seed=42,
    )

    print(
        f"Training samples: "
        f"{len(train_loader.dataset)}"
    )

    print(
        f"Validation samples: "
        f"{len(val_loader.dataset)}"
    )

    # --------------------------------------------------------
    # Student
    # --------------------------------------------------------

    print("\nCreating student UNETR...")

    student = UNETRBaseline(
        in_channels=4,
        out_channels=4,
    ).to(device)

    # --------------------------------------------------------
    # Teacher
    # --------------------------------------------------------

    print("Creating EMA teacher...")

    teacher = copy.deepcopy(
        student
    ).to(device)

    teacher.eval()

    for parameter in teacher.parameters():

        parameter.requires_grad = False

    # --------------------------------------------------------
    # Token extractors
    # --------------------------------------------------------

    student_token_extractor = (
        UNETRTokenExtractor(student)
    )

    teacher_token_extractor = (
        UNETRTokenExtractor(teacher)
    )

    # --------------------------------------------------------
    # Dense Predictor
    # --------------------------------------------------------

    print("Creating Dense Predictor...")

    dense_predictor = DensePredictor(
        hidden_size=768,
        in_channels=4,
        patch_size=TOKEN_PATCH_SIZE,
    ).to(device)

    # --------------------------------------------------------
    # Mask generator
    # --------------------------------------------------------

    mask_generator = PatchMaskGenerator(
        image_size=PATCH_SIZE,
        patch_size=TOKEN_PATCH_SIZE,
        mask_ratio=MASK_RATIO,
    )

    # --------------------------------------------------------
    # Losses
    # --------------------------------------------------------

    segmentation_loss_fn = DiceFocalLoss(
        to_onehot_y=True,
        softmax=True,
    )

    online_tokenizer_loss_fn = (
        OnlineTokenizerLoss()
    )

    dense_predictor_loss_fn = (
        DensePredictorLoss(
            patch_size=TOKEN_PATCH_SIZE
        )
    )

    mod_loss_fn = MODLoss(
        lambda_ot=LAMBDA_OT,
        lambda_dp=LAMBDA_DP,
    )

    # --------------------------------------------------------
    # Optimizer
    # --------------------------------------------------------

    optimizer = torch.optim.AdamW(
        list(student.parameters())
        + list(dense_predictor.parameters()),

        lr=LEARNING_RATE,

        weight_decay=WEIGHT_DECAY,
    )

    # --------------------------------------------------------
    # AMP scaler
    # --------------------------------------------------------

    scaler = torch.amp.GradScaler(
        "cuda",
        enabled=torch.cuda.is_available(),
    )

    # --------------------------------------------------------
    # Training history
    # --------------------------------------------------------

    history = []

    best_loss = float("inf")

    # ========================================================
    # EPOCH LOOP
    # ========================================================

    for epoch in range(1, EPOCHS + 1):

        epoch_start = time.time()

        student.train()

        dense_predictor.train()

        teacher.eval()

        running_total = 0.0

        running_seg = 0.0

        running_ot = 0.0

        running_dp = 0.0

        running_mod = 0.0

        # ----------------------------------------------------
        # Training batches
        # ----------------------------------------------------

        progress = tqdm(
            train_loader,
            desc=f"Epoch {epoch}/{EPOCHS}",
            leave=True,
        )

        for batch in progress:

            images = batch["image"].to(
                device,
                non_blocking=True,
            )

            labels = batch["label"].to(
                device,
                non_blocking=True,
            ).long()

            # ------------------------------------------------
            # Generate mask
            # ------------------------------------------------

            mask = mask_generator(
                batch_size=images.shape[0],
                device=device,
            )

            optimizer.zero_grad(
                set_to_none=True
            )

            # ------------------------------------------------
            # Forward pass
            # ------------------------------------------------

            with torch.autocast(
                device_type="cuda",
                dtype=torch.float16,
                enabled=torch.cuda.is_available(),
            ):

                # ============================================
                # Segmentation
                # ============================================

                segmentation_output = student(
                    images
                )

                segmentation_loss = (
                    segmentation_loss_fn(
                        segmentation_output,
                        labels,
                    )
                )

                # ============================================
                # Student tokens
                # ============================================

                student_tokens, _ = (
                    student_token_extractor(
                        images,
                        mask=mask,
                    )
                )

                # ============================================
                # Dense Predictor
                # ============================================

                reconstruction = (
                    dense_predictor(
                        student_tokens,
                        image_size=images.shape[2:],
                    )
                )

                dense_predictor_loss = (
                    dense_predictor_loss_fn(
                        reconstruction,
                        images,
                        mask,
                    )
                )

            # ------------------------------------------------
            # Teacher forward
            # ------------------------------------------------

            with torch.no_grad():

                with torch.autocast(
                    device_type="cuda",
                    dtype=torch.float16,
                    enabled=torch.cuda.is_available(),
                ):

                    teacher_tokens, _ = (
                        teacher_token_extractor(
                            images,
                            mask=None,
                        )
                    )

            # ------------------------------------------------
            # Online Tokenizer
            # ------------------------------------------------

            online_tokenizer_loss = (
                online_tokenizer_loss_fn(
                    student_tokens,
                    teacher_tokens,
                    mask,
                )
            )

            # ------------------------------------------------
            # MOD loss
            # ------------------------------------------------

            mod_loss = mod_loss_fn(
                online_tokenizer_loss,
                dense_predictor_loss,
            )

            # ------------------------------------------------
            # Total loss
            # ------------------------------------------------

            total_loss = (
                segmentation_loss
                + mod_loss
            )

            # ------------------------------------------------
            # Backward
            # ------------------------------------------------

            scaler.scale(
                total_loss
            ).backward()

            scaler.step(
                optimizer
            )

            scaler.update()

            # ------------------------------------------------
            # EMA teacher
            # ------------------------------------------------

            update_ema(
                student=student,
                teacher=teacher,
                momentum=EMA_MOMENTUM,
            )

            # ------------------------------------------------
            # Accumulate
            # ------------------------------------------------

            running_total += (
                total_loss.item()
            )

            running_seg += (
                segmentation_loss.item()
            )

            running_ot += (
                online_tokenizer_loss.item()
            )

            running_dp += (
                dense_predictor_loss.item()
            )

            running_mod += (
                mod_loss.item()
            )

            # ------------------------------------------------
            # Progress display
            # ------------------------------------------------

            progress.set_postfix(
                loss=f"{total_loss.item():.4f}",
                seg=f"{segmentation_loss.item():.4f}",
                mod=f"{mod_loss.item():.4f}",
            )

        # ====================================================
        # Epoch averages
        # ====================================================

        num_batches = len(train_loader)

        avg_total = (
            running_total / num_batches
        )

        avg_seg = (
            running_seg / num_batches
        )

        avg_ot = (
            running_ot / num_batches
        )

        avg_dp = (
            running_dp / num_batches
        )

        avg_mod = (
            running_mod / num_batches
        )

        epoch_time = (
            time.time()
            - epoch_start
        )

        # ====================================================
        # Epoch summary
        # ====================================================

        print("\n" + "-" * 70)

        print(
            f"Epoch {epoch}/{EPOCHS} completed"
        )

        print(
            f"Total Loss: "
            f"{avg_total:.6f}"
        )

        print(
            f"Segmentation Loss: "
            f"{avg_seg:.6f}"
        )

        print(
            f"Online Tokenizer Loss: "
            f"{avg_ot:.6f}"
        )

        print(
            f"Dense Predictor Loss: "
            f"{avg_dp:.6f}"
        )

        print(
            f"MOD Loss: "
            f"{avg_mod:.6f}"
        )

        print(
            f"Time: "
            f"{epoch_time / 60:.2f} minutes"
        )

        # ----------------------------------------------------
        # GPU memory
        # ----------------------------------------------------

        if torch.cuda.is_available():

            peak_memory = (
                torch.cuda.max_memory_allocated()
                / 1024**3
            )

            print(
                f"Peak GPU Memory: "
                f"{peak_memory:.2f} GB"
            )

            torch.cuda.reset_peak_memory_stats()

        print("-" * 70)

        # ====================================================
        # History
        # ====================================================

        history.append(
            {
                "epoch": epoch,
                "total_loss": avg_total,
                "segmentation_loss": avg_seg,
                "online_tokenizer_loss": avg_ot,
                "dense_predictor_loss": avg_dp,
                "mod_loss": avg_mod,
                "time_minutes": epoch_time / 60,
            }
        )

        # ====================================================
        # Save epoch checkpoint
        # ====================================================

        epoch_path = os.path.join(
            CHECKPOINT_DIR,
            f"epoch_{epoch:02d}.pth",
        )

        save_checkpoint(
            epoch=epoch,
            student=student,
            teacher=teacher,
            dense_predictor=dense_predictor,
            optimizer=optimizer,
            best_loss=best_loss,
            path=epoch_path,
        )

        print(
            f"Saved: {epoch_path}"
        )

        # ====================================================
        # Best checkpoint
        # ====================================================

        if avg_total < best_loss:

            best_loss = avg_total

            best_path = os.path.join(
                CHECKPOINT_DIR,
                "best.pth",
            )

            save_checkpoint(
                epoch=epoch,
                student=student,
                teacher=teacher,
                dense_predictor=dense_predictor,
                optimizer=optimizer,
                best_loss=best_loss,
                path=best_path,
            )

            print(
                f"New best checkpoint: "
                f"{best_path}"
            )

        # ====================================================
        # Latest checkpoint
        # ====================================================

        latest_path = os.path.join(
            CHECKPOINT_DIR,
            "latest.pth",
        )

        save_checkpoint(
            epoch=epoch,
            student=student,
            teacher=teacher,
            dense_predictor=dense_predictor,
            optimizer=optimizer,
            best_loss=best_loss,
            path=latest_path,
        )

    # ========================================================
    # TRAINING COMPLETE
    # ========================================================

    print("\n")
    print("=" * 70)
    print("MOD TRAINING COMPLETE")
    print("=" * 70)

    print(
        f"Epochs completed: {EPOCHS}"
    )

    print(
        f"Best training loss: "
        f"{best_loss:.6f}"
    )

    print(
        f"Checkpoints: "
        f"{CHECKPOINT_DIR}"
    )

    print("=" * 70)


if __name__ == "__main__":
    main()