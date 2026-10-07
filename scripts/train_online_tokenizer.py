import os
import copy
import random
import numpy as np

import torch
import torch.nn as nn
from torch.optim import AdamW
from torch.amp import autocast, GradScaler
from tqdm import tqdm
from monai.losses import DiceFocalLoss

from src.data.dataloader import create_dataloaders
from src.models.unetr_baseline import UNETRBaseline
from src.training.masking import PatchMaskGenerator


# ============================================================
# Configuration
# ============================================================

ROOT_DIR = "data/raw/BraTS2021/BraTS2021_Training_Data"
CHECKPOINT_DIR = "checkpoints/online_tokenizer"

EPOCHS = 10
BATCH_SIZE = 1
NUM_WORKERS = 0

PATCH_SIZE = (96, 96, 96)
TOKEN_PATCH_SIZE = (16, 16, 16)

LR = 1e-4
WEIGHT_DECAY = 5e-5

MASK_RATIO = 0.60
EMA_MOMENTUM = 0.996
LAMBDA_OT = 1.0

SEED = 42


# ============================================================
# Reproducibility
# ============================================================

def set_seed(seed=42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)


# ============================================================
# Token extractor
# ============================================================

class UNETRTokenExtractor(nn.Module):
    """
    Extracts final ViT tokens from the MONAI UNETR backbone.

    Student:
        Mask selected input tokens before transformer blocks.

    Teacher:
        Receives the unmasked image and provides detached targets.
    """

    def __init__(self, unetr_model):
        super().__init__()

        # UNETRBaseline contains:
        # self.model = MONAI UNETR
        self.vit = unetr_model.model.vit

    def forward(self, x, mask=None):
        """
        x:
            [B, 4, 96, 96, 96]

        mask:
            [B, N]
            True = masked token

        returns:
            [B, N, 768]
        """

        # Patch embedding
        tokens = self.vit.patch_embedding(x)

        # MONAI UNETR patch embedding should produce:
        # [B, N, hidden_size]

        if tokens.ndim != 3:
            raise RuntimeError(
                f"Expected patch tokens [B,N,C], got {tokens.shape}"
            )

        # Apply token masking only to the student.
        if mask is not None:
            if mask.shape[:2] != tokens.shape[:2]:
                raise RuntimeError(
                    f"Mask {mask.shape} incompatible with tokens {tokens.shape}"
                )

            tokens = tokens.clone()
            tokens[mask] = 0.0

        # Position embeddings
        if hasattr(self.vit, "position_embeddings"):
            tokens = tokens + self.vit.position_embeddings

        # Transformer blocks
        for block in self.vit.blocks:
            tokens = block(tokens)

        # Final transformer norm
        if hasattr(self.vit, "norm"):
            tokens = self.vit.norm(tokens)

        return tokens


# ============================================================
# Online Tokenizer loss
# ============================================================

def online_tokenizer_loss(student_tokens, teacher_tokens, mask):
    """
    Cosine-similarity self-distillation loss over masked tokens.
    Teacher is treated as the target.

    L = 1 - cosine(student, teacher)
    """

    if student_tokens.shape != teacher_tokens.shape:
        raise RuntimeError(
            f"Student tokens {student_tokens.shape} != "
            f"teacher tokens {teacher_tokens.shape}"
        )

    if mask.shape[:2] != student_tokens.shape[:2]:
        raise RuntimeError(
            f"Mask {mask.shape} incompatible with tokens {student_tokens.shape}"
        )

    student = torch.nn.functional.normalize(student_tokens, dim=-1)
    teacher = torch.nn.functional.normalize(
        teacher_tokens.detach(), dim=-1
    )

    similarity = (student * teacher).sum(dim=-1)

    masked_similarity = similarity[mask]

    if masked_similarity.numel() == 0:
        return similarity.new_tensor(0.0)

    return (1.0 - masked_similarity).mean()


# ============================================================
# EMA update
# ============================================================

@torch.no_grad()
def update_ema(student, teacher, momentum=0.996):

    student_state = student.state_dict()
    teacher_state = teacher.state_dict()

    for key in teacher_state.keys():
        teacher_state[key].mul_(momentum)
        teacher_state[key].add_(
            student_state[key],
            alpha=1.0 - momentum
        )


# ============================================================
# Main training
# ============================================================

def main():

    set_seed(SEED)

    os.makedirs(CHECKPOINT_DIR, exist_ok=True)

    device = torch.device(
        "cuda" if torch.cuda.is_available() else "cpu"
    )

    print("=" * 70)
    print("ONLINE TOKENIZER ONLY TRAINING")
    print("=" * 70)
    print(f"Device        : {device}")
    print(f"Dataset       : {ROOT_DIR}")
    print(f"Patch size    : {PATCH_SIZE}")
    print(f"Mask ratio    : {MASK_RATIO}")
    print(f"EMA momentum  : {EMA_MOMENTUM}")
    print(f"Lambda OT     : {LAMBDA_OT}")
    print("=" * 70)

    # --------------------------------------------------------
    # Dataloader
    # --------------------------------------------------------

    train_loader, val_loader = create_dataloaders(
        root_dir=ROOT_DIR,
        patch_size=PATCH_SIZE,
        batch_size=BATCH_SIZE,
        num_workers=NUM_WORKERS,
        seed=SEED,
    )

    print(f"Training batches: {len(train_loader)}")
    print(f"Validation batches: {len(val_loader)}")

    # --------------------------------------------------------
    # Student + Teacher
    # --------------------------------------------------------

    student = UNETRBaseline(
        in_channels=4,
        out_channels=4,
    ).to(device)

    teacher = copy.deepcopy(student).to(device)

    teacher.eval()

    for parameter in teacher.parameters():
        parameter.requires_grad = False

    student_tokens_model = UNETRTokenExtractor(student)
    teacher_tokens_model = UNETRTokenExtractor(teacher)

    # --------------------------------------------------------
    # Loss
    # --------------------------------------------------------

    segmentation_loss_fn = DiceFocalLoss(
        include_background=True,
        to_onehot_y=True,
        softmax=True,
    )

    # --------------------------------------------------------
    # Mask generator
    # --------------------------------------------------------

    mask_generator = PatchMaskGenerator(
        image_size=PATCH_SIZE,
        patch_size=TOKEN_PATCH_SIZE,
        mask_ratio=MASK_RATIO,
    )

    num_tokens = mask_generator.num_patches

    print(f"Number of ViT tokens: {num_tokens}")

    # --------------------------------------------------------
    # Optimizer
    # --------------------------------------------------------

    optimizer = AdamW(
        student.parameters(),
        lr=LR,
        weight_decay=WEIGHT_DECAY,
    )

    scaler = GradScaler("cuda", enabled=torch.cuda.is_available())

    best_loss = float("inf")

    # --------------------------------------------------------
    # Training
    # --------------------------------------------------------

    for epoch in range(1, EPOCHS + 1):

        student.train()

        epoch_total = 0.0
        epoch_seg = 0.0
        epoch_ot = 0.0

        progress = tqdm(
            train_loader,
            desc=f"Epoch {epoch}/{EPOCHS}",
        )

        for batch in progress:

            images = batch["image"].to(
                device,
                non_blocking=True,
            )

            labels = batch["label"].to(
                device,
                non_blocking=True,
            )

            optimizer.zero_grad(set_to_none=True)

            # -----------------------------------------------
            # Generate random mask
            # -----------------------------------------------

            mask = mask_generator(
                batch_size=images.shape[0],
                device=device,
            )

            # -----------------------------------------------
            # Forward
            # -----------------------------------------------

            with autocast(
                device_type="cuda",
                enabled=torch.cuda.is_available(),
            ):

                # Segmentation branch
                segmentation_output = student(images)

                segmentation_loss = segmentation_loss_fn(
                    segmentation_output,
                    labels,
                )

                # Student masked tokens
                student_tokens = student_tokens_model(
                    images,
                    mask=mask,
                )

                # Teacher unmasked tokens
                with torch.no_grad():
                    teacher_tokens = teacher_tokens_model(
                        images,
                        mask=None,
                    )

                # Online Tokenizer
                ot_loss = online_tokenizer_loss(
                    student_tokens,
                    teacher_tokens,
                    mask,
                )

                total_loss = (
                    segmentation_loss
                    + LAMBDA_OT * ot_loss
                )

            # -----------------------------------------------
            # Backward
            # -----------------------------------------------

            scaler.scale(total_loss).backward()

            scaler.step(optimizer)
            scaler.update()

            # -----------------------------------------------
            # EMA teacher update
            # -----------------------------------------------

            update_ema(
                student,
                teacher,
                momentum=EMA_MOMENTUM,
            )

            # -----------------------------------------------
            # Statistics
            # -----------------------------------------------

            epoch_total += total_loss.item()
            epoch_seg += segmentation_loss.item()
            epoch_ot += ot_loss.item()

            progress.set_postfix(
                total=f"{total_loss.item():.4f}",
                seg=f"{segmentation_loss.item():.4f}",
                ot=f"{ot_loss.item():.4f}",
            )

        # ----------------------------------------------------
        # Epoch average
        # ----------------------------------------------------

        epoch_total /= len(train_loader)
        epoch_seg /= len(train_loader)
        epoch_ot /= len(train_loader)

        print()
        print(
            f"Epoch {epoch:02d} | "
            f"Total: {epoch_total:.6f} | "
            f"Seg: {epoch_seg:.6f} | "
            f"OT: {epoch_ot:.6f}"
        )

        # ----------------------------------------------------
        # Save checkpoint
        # ----------------------------------------------------

        checkpoint = {
            "epoch": epoch,

            "student_state_dict":
                student.state_dict(),

            "teacher_state_dict":
                teacher.state_dict(),

            "optimizer_state_dict":
                optimizer.state_dict(),

            "total_loss": epoch_total,
            "segmentation_loss": epoch_seg,
            "online_tokenizer_loss": epoch_ot,

            "config": {
                "patch_size": PATCH_SIZE,
                "token_patch_size": TOKEN_PATCH_SIZE,
                "mask_ratio": MASK_RATIO,
                "ema_momentum": EMA_MOMENTUM,
                "lambda_ot": LAMBDA_OT,
                "lr": LR,
                "weight_decay": WEIGHT_DECAY,
            },
        }

        epoch_path = os.path.join(
            CHECKPOINT_DIR,
            f"epoch_{epoch:02d}.pth",
        )

        torch.save(checkpoint, epoch_path)

        latest_path = os.path.join(
            CHECKPOINT_DIR,
            "latest.pth",
        )

        torch.save(checkpoint, latest_path)

        if epoch_total < best_loss:

            best_loss = epoch_total

            best_path = os.path.join(
                CHECKPOINT_DIR,
                "best.pth",
            )

            torch.save(checkpoint, best_path)

            print(
                f"Best checkpoint updated: {best_path}"
            )

        if torch.cuda.is_available():
            allocated = (
                torch.cuda.memory_allocated() / 1024**3
            )

            reserved = (
                torch.cuda.memory_reserved() / 1024**3
            )

            print(
                f"GPU memory: "
                f"{allocated:.2f} GB allocated | "
                f"{reserved:.2f} GB reserved"
            )

    print()
    print("=" * 70)
    print("ONLINE TOKENIZER TRAINING COMPLETE")
    print("=" * 70)
    print(f"Best training loss: {best_loss:.6f}")
    print(f"Checkpoints: {CHECKPOINT_DIR}")


if __name__ == "__main__":
    main()
    