from monai.transforms import (
    Compose,
    LoadImaged,
    EnsureChannelFirstd,
    Orientationd,
    Spacingd,
    NormalizeIntensityd,
    CropForegroundd,
    RandCropByPosNegLabeld,
    RandFlipd,
    RandRotate90d,
    RandScaleIntensityd,
    RandShiftIntensityd,
)


def get_train_transforms(
    patch_size=(96, 96, 96),
):
    return Compose([
        LoadImaged(
            keys=["image", "label"]
        ),

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

        RandCropByPosNegLabeld(
            keys=["image", "label"],
            label_key="label",
            spatial_size=patch_size,
            pos=1,
            neg=1,
            num_samples=1,
            image_key="image",
            image_threshold=0
        ),

        RandFlipd(
            keys=["image", "label"],
            spatial_axis=0,
            prob=0.5
        ),

        RandFlipd(
            keys=["image", "label"],
            spatial_axis=1,
            prob=0.5
        ),

        RandFlipd(
            keys=["image", "label"],
            spatial_axis=2,
            prob=0.5
        ),

        RandRotate90d(
            keys=["image", "label"],
            prob=0.5,
            max_k=3
        ),

        RandScaleIntensityd(
            keys="image",
            factors=0.1,
            prob=0.5
        ),

        RandShiftIntensityd(
            keys="image",
            offsets=0.1,
            prob=0.5
        ),
    ])