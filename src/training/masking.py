import torch


class PatchMaskGenerator:
    """
    Generates random 3D patch masks for UNETR.

    For a 96x96x96 input and 16x16x16 ViT patches:

        96 / 16 = 6

    Therefore:

        6 x 6 x 6 = 216 tokens

    mask_ratio=0.6 means approximately 60% of
    the tokens are masked.
    """

    def __init__(
        self,
        image_size=(96, 96, 96),
        patch_size=(16, 16, 16),
        mask_ratio=0.6,
    ):
        self.image_size = image_size
        self.patch_size = patch_size
        self.mask_ratio = mask_ratio

        self.grid_size = tuple(
            image_size[i] // patch_size[i]
            for i in range(3)
        )

        self.num_patches = (
            self.grid_size[0]
            * self.grid_size[1]
            * self.grid_size[2]
        )

        self.num_masked = int(
            self.num_patches * mask_ratio
        )

    def __call__(self, batch_size, device=None):

        mask = torch.zeros(
            batch_size,
            self.num_patches,
            dtype=torch.bool,
            device=device,
        )

        for batch_index in range(batch_size):

            indices = torch.randperm(
                self.num_patches,
                device=device,
            )[:self.num_masked]

            mask[
                batch_index,
                indices
            ] = True

        return mask