import torch


def get_brats_regions(label: torch.Tensor):
    """
    Convert a BraTS label map into WT, TC, and ET binary regions.

    Label mapping:
        0 = Background
        1 = NCR/NET
        2 = Edema
        3 = Enhancing Tumor (original BraTS label 4)
    """

    wt = (label == 1) | (label == 2) | (label == 3)
    tc = (label == 1) | (label == 3)
    et = label == 3

    return {
        "WT": wt,
        "TC": tc,
        "ET": et,
    }