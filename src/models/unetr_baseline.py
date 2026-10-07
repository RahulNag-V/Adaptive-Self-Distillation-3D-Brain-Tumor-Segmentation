import torch
import torch.nn as nn

from monai.networks.nets import UNETR


class UNETRBaseline(nn.Module):
    """
    Baseline 3D brain tumor segmentation model.

    This model is intentionally kept separate from the
    self-distillation components so that we can later
    compare:

        UNETR
        vs
        UNETR + Adaptive Self-Distillation
    """

    def __init__(
        self,
        in_channels: int = 4,
        out_channels: int = 4,
    ):
        super().__init__()

        self.model = UNETR(
            in_channels=in_channels,
            out_channels=out_channels,
            img_size=(96, 96, 96),
            feature_size=16,
            hidden_size=768,
            mlp_dim=3072,
            num_heads=12,
            proj_type="conv",
            norm_name="instance",
            res_block=True,
            dropout_rate=0.0,
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.model(x)