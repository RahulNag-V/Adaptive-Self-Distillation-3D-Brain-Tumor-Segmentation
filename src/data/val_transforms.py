from monai.transforms import (
    Compose,
    LoadImaged,
    EnsureChannelFirstd,
    Orientationd,
    Spacingd,
    NormalizeIntensityd,
    CropForegroundd,
)


def get_val_transforms():
    return Compose([
        LoadImaged(keys=["image", "label"]),

        EnsureChannelFirstd(
            keys=["image", "label"]
        ),

        Orientationd(
            keys=["image", "label"],
            axcodes="RAS"
        ),

        Spacingd(
            keys=["image", "label"],
            pixdim=(1.0, 1.0, 1.0),
            mode=("bilinear", "nearest")
        ),

        NormalizeIntensityd(
            keys="image",
            nonzero=True,
            channel_wise=True
        ),

        CropForegroundd(
            keys=["image", "label"],
            source_key="image"
        ),
    ])