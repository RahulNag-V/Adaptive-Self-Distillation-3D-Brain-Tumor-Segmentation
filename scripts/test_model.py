import torch

from src.models.unetr_baseline import UNETRBaseline


def main():
    print("=" * 60)
    print("UNETR BASELINE TEST")
    print("=" * 60)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    print(f"Device: {device}")

    model = UNETRBaseline(
        in_channels=4,
        out_channels=4,
    ).to(device)

    model.eval()

    # Simulate one 3D MRI patch.
    # Shape:
    # batch = 1
    # channels = 4 MRI modalities
    # depth/height/width = 96
    x = torch.randn(
        1,
        4,
        96,
        96,
        96,
        device=device,
    )

    print(f"Input shape : {x.shape}")

    with torch.no_grad():
        with torch.autocast(
            device_type="cuda",
            dtype=torch.float16,
        ):
            output = model(x)

    print(f"Output shape: {output.shape}")

    allocated = torch.cuda.memory_allocated() / 1024**2
    reserved = torch.cuda.memory_reserved() / 1024**2

    print(f"GPU allocated: {allocated:.2f} MB")
    print(f"GPU reserved : {reserved:.2f} MB")

    assert output.shape == (1, 4, 96, 96, 96)

    print("=" * 60)
    print("UNETR BASELINE TEST PASSED")
    print("=" * 60)


if __name__ == "__main__":
    main()