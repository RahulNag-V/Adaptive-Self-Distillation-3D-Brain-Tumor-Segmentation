import torch
import torch.nn as nn


class DensePredictorLoss(nn.Module):
    """
    Masked L1 reconstruction loss.

    Only masked patches contribute to the loss.
    """

    def __init__(
        self,
        patch_size=(16, 16, 16),
    ):
        super().__init__()

        self.patch_size = patch_size

    def forward(
        self,
        reconstruction,
        target,
        mask,
    ):
        """
        reconstruction:
            [B, C, H, W, D]

        target:
            [B, C, H, W, D]

        mask:
            [B, N]

        True indicates a masked patch.
        """

        if reconstruction.shape != target.shape:
            raise ValueError(
                "Reconstruction and target shapes "
                "must match. "
                f"Reconstruction: "
                f"{reconstruction.shape}, "
                f"Target: {target.shape}"
            )

        batch_size, channels, h, w, d = (
            reconstruction.shape
        )

        ph, pw, pd = self.patch_size

        grid_h = h // ph
        grid_w = w // pw
        grid_d = d // pd

        expected_tokens = (
            grid_h
            * grid_w
            * grid_d
        )

        if mask.shape[1] != expected_tokens:
            raise ValueError(
                "Mask token count does not match "
                "image dimensions. "
                f"Expected {expected_tokens}, "
                f"got {mask.shape[1]}"
            )

        # --------------------------------------------------
        # Convert images into patches
        # --------------------------------------------------

        recon_patches = reconstruction.reshape(
            batch_size,
            channels,
            grid_h,
            ph,
            grid_w,
            pw,
            grid_d,
            pd,
        )

        target_patches = target.reshape(
            batch_size,
            channels,
            grid_h,
            ph,
            grid_w,
            pw,
            grid_d,
            pd,
        )

        # [B, Gh, Gw, Gd, C, Ph, Pw, Pd]

        recon_patches = recon_patches.permute(
            0,
            2,
            4,
            6,
            1,
            3,
            5,
            7,
        )

        target_patches = target_patches.permute(
            0,
            2,
            4,
            6,
            1,
            3,
            5,
            7,
        )

        # [B, N, C, Ph, Pw, Pd]

        recon_patches = recon_patches.reshape(
            batch_size,
            expected_tokens,
            -1,
        )

        target_patches = target_patches.reshape(
            batch_size,
            expected_tokens,
            -1,
        )

        # --------------------------------------------------
        # Select masked patches
        # --------------------------------------------------

        masked_reconstruction = (
            recon_patches[mask]
        )

        masked_target = (
            target_patches[mask]
        )

        if masked_reconstruction.numel() == 0:
            return reconstruction.new_tensor(
                0.0,
                requires_grad=True,
            )

        # --------------------------------------------------
        # L1 loss
        # --------------------------------------------------

        loss = torch.abs(
            masked_reconstruction
            - masked_target
        ).mean()

        return loss