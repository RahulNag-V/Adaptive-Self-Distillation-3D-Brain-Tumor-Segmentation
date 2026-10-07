import torch

from src.data.dataloader import create_dataloaders
from src.models.unetr_baseline import UNETRBaseline
from src.models.unetr_tokens import UNETRTokenExtractor
from src.training.masking import PatchMaskGenerator
from src.losses.online_tokenizer import OnlineTokenizerLoss
from src.models.ema import update_ema


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
    print("ONLINE TOKENIZER TEST")
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
    # Student
    # --------------------------------------------------

    student = UNETRBaseline(
        in_channels=4,
        out_channels=4,
    ).to(DEVICE)

    # --------------------------------------------------
    # Teacher
    # --------------------------------------------------

    teacher = UNETRBaseline(
        in_channels=4,
        out_channels=4,
    ).to(DEVICE)

    teacher.load_state_dict(
        student.state_dict()
    )

    teacher.eval()

    for parameter in teacher.parameters():

        parameter.requires_grad = False

    # --------------------------------------------------
    # Token extractors
    # --------------------------------------------------

    student_extractor = (
        UNETRTokenExtractor(student)
    )

    teacher_extractor = (
        UNETRTokenExtractor(teacher)
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
        mask.float().mean().item()
    )

    # --------------------------------------------------
    # Student
    # --------------------------------------------------

    student_tokens, _ = (
        student_extractor(
            images,
            mask=mask,
        )
    )

    # --------------------------------------------------
    # Teacher
    # --------------------------------------------------

    with torch.no_grad():

        teacher_tokens, _ = (
            teacher_extractor(
                images,
                mask=None,
            )
        )

    print(
        "Student token shape:",
        student_tokens.shape,
    )

    print(
        "Teacher token shape:",
        teacher_tokens.shape,
    )

    # --------------------------------------------------
    # Loss
    # --------------------------------------------------

    tokenizer_loss = (
        OnlineTokenizerLoss()
    )

    loss = tokenizer_loss(
        student_tokens,
        teacher_tokens,
        mask,
    )

    print(
        "Online Tokenizer loss:",
        f"{loss.item():.6f}",
    )

    # --------------------------------------------------
    # Backward test
    # --------------------------------------------------

    loss.backward()

    print(
        "Student backward: OK"
    )

    # --------------------------------------------------
    # EMA test
    # --------------------------------------------------

    update_ema(
        student,
        teacher,
        momentum=0.996,
    )

    print(
        "Teacher EMA update: OK"
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
        "ONLINE TOKENIZER TEST PASSED"
    )


if __name__ == "__main__":
    main()