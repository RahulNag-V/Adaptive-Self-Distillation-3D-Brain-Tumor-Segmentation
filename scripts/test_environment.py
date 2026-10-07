import torch
import monai


def main():
    print("=" * 60)
    print("ADAPTIVE SELF-DISTILLATION PROJECT")
    print("Environment Test")
    print("=" * 60)

    print(f"PyTorch : {torch.__version__}")
    print(f"MONAI   : {monai.__version__}")
    print(f"CUDA    : {torch.cuda.is_available()}")

    if not torch.cuda.is_available():
        print("ERROR: CUDA GPU is not available.")
        return

    device = torch.device("cuda")

    print(f"GPU     : {torch.cuda.get_device_name(0)}")
    print(f"CUDA    : {torch.version.cuda}")

    # Simple GPU tensor test
    x = torch.randn(2, 3, 4, device=device)
    y = torch.randn(2, 3, 4, device=device)

    z = x @ y.transpose(-1, -2)

    print(f"Tensor device : {z.device}")
    print(f"Tensor shape  : {z.shape}")

    # GPU memory
    allocated = torch.cuda.memory_allocated() / 1024**2
    reserved = torch.cuda.memory_reserved() / 1024**2

    print(f"GPU allocated : {allocated:.2f} MB")
    print(f"GPU reserved  : {reserved:.2f} MB")

    print("=" * 60)
    print("ENVIRONMENT TEST PASSED")
    print("=" * 60)


if __name__ == "__main__":
    main()