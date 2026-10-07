import torch
import torch.nn as nn


class UNETRTokenExtractor(nn.Module):
    """
    Extract transformer tokens from the existing
    MONAI UNETR backbone.

    This uses the ViT encoder already present inside
    our UNETRBaseline model.
    """

    def __init__(self, unetr_model):
        super().__init__()

        self.unetr = unetr_model

        self.vit = self.unetr.model.vit

        self.hidden_size = (
            self.unetr.model.hidden_size
        )

    def forward(
        self,
        x,
        mask=None,
    ):
        """
        Returns final transformer tokens.

        x:
            [B, 4, 96, 96, 96]

        mask:
            [B, N]
            True = masked
        """

        # ----------------------------------------------
        # Patch embedding
        # ----------------------------------------------

        tokens = self.vit.patch_embedding(x)

        # MONAI ViT normally returns:
        #
        # [B, N, C]
        #
        # where N = 216 for 96³ with 16³ patches.

        if tokens.ndim != 3:
            raise RuntimeError(
                "Unexpected ViT patch embedding shape: "
                f"{tokens.shape}"
            )

        # ----------------------------------------------
        # Apply masking
        # ----------------------------------------------

        if mask is not None:

            if mask.shape[:2] != tokens.shape[:2]:

                raise ValueError(
                    "Mask shape does not match "
                    "number of transformer tokens. "
                    f"Mask: {mask.shape}, "
                    f"Tokens: {tokens.shape}"
                )

            # Replace masked token embeddings
            # with zero.
            #
            # This is our hardware-compatible
            # adaptation of masked token training.

            tokens = tokens.masked_fill(
                mask.unsqueeze(-1),
                0.0,
            )

        # ----------------------------------------------
        # Position embedding
        # ----------------------------------------------

        if hasattr(
            self.vit.patch_embedding,
            "position_embeddings",
        ):

            position_embeddings = (
                self.vit.patch_embedding
                .position_embeddings
            )

            tokens = tokens + position_embeddings

        # ----------------------------------------------
        # Transformer blocks
        # ----------------------------------------------

        hidden_states = []

        for block in self.vit.blocks:

            tokens = block(tokens)

            hidden_states.append(tokens)

        # ----------------------------------------------
        # Final normalization
        # ----------------------------------------------

        tokens = self.vit.norm(tokens)

        return tokens, hidden_states