import torch
import torch.nn as nn


class DensePredictor(nn.Module):
    """
    Dense Predictor for masked image reconstruction.

    Each 768-dimensional transformer token is projected
    back into its corresponding 16x16x16 image patch.

    For 4 MRI modalities:

        4 x 16 x 16 x 16 = 16384 values per patch
    """

    def __init__(
        self,
        hidden_size=768,
        in_channels=4,
        patch_size=(16, 16, 16),
    ):
        super().__init__()

        self.hidden_size = hidden_size
        self.in_channels = in_channels
        self.patch_size = patch_size

        patch_volume = (
            patch_size[0]
            * patch_size[1]
            * patch_size[2]
        )

        self.patch_volume = patch_volume

        self.reconstruction_head = nn.Sequential(
            nn.Linear(
                hidden_size,
                hidden_size,
            ),
            nn.GELU(),
            nn.Linear(
                hidden_size,
                in_channels * patch_volume,
            ),
        )

    def forward(
        self,
        tokens,
        image_size,
    ):
        """
        tokens:
            [B, N, hidden_size]

        image_size:
            (H, W, D)

        Returns:
            reconstructed image:
            [B, C, H, W, D]
        """

        batch_size = tokens.shape[0]

        h, w, d = image_size

        ph, pw, pd = self.patch_size

        if h % ph != 0:
            raise ValueError(
                f"Height {h} is not divisible "
                f"by patch size {ph}"
            )

        if w % pw != 0:
            raise ValueError(
                f"Width {w} is not divisible "
                f"by patch size {pw}"
            )

        if d % pd != 0:
            raise ValueError(
                f"Depth {d} is not divisible "
                f"by patch size {pd}"
            )

        grid_h = h // ph
        grid_w = w // pw
        grid_d = d // pd

        expected_tokens = (
            grid_h
            * grid_w
            * grid_d
        )

        if tokens.shape[1] != expected_tokens:
            raise ValueError(
                "Unexpected number of tokens. "
                f"Expected {expected_tokens}, "
                f"got {tokens.shape[1]}"
            )

        # --------------------------------------------------
        # Predict pixels for every patch
        # --------------------------------------------------

        patches = self.reconstruction_head(
            tokens
        )

        # [B, N, C * ph * pw * pd]
        patches = patches.reshape(
            batch_size,
            grid_h,
            grid_w,
            grid_d,
            self.in_channels,
            ph,
            pw,
            pd,
        )

        # Rearrange patches back into image space.
        #
        # Current:
        # [B, Gh, Gw, Gd, C, Ph, Pw, Pd]
        #
        # Desired:
        # [B, C, Gh, Ph, Gw, Pw, Gd, Pd]

        patches = patches.permute(
            0,
            4,
            1,
            5,
            2,
            6,
            3,
            7,
        )

        reconstruction = patches.reshape(
            batch_size,
            self.in_channels,
            h,
            w,
            d,
        )

        return reconstruction