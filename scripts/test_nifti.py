from pathlib import Path

import nibabel as nib
import numpy as np


DATA_ROOT = Path(
    "data/raw/BraTS2021/BraTS2021_Training_Data"
)


def main():
    patients = sorted(
        [p for p in DATA_ROOT.iterdir() if p.is_dir()]
    )

    patient = patients[0]

    print("=" * 60)
    print("NIFTI DATASET TEST")
    print("=" * 60)

    print(f"Patient: {patient.name}")

    modalities = {
        "FLAIR": patient / f"{patient.name}_flair.nii.gz",
        "T1": patient / f"{patient.name}_t1.nii.gz",
        "T1CE": patient / f"{patient.name}_t1ce.nii.gz",
        "T2": patient / f"{patient.name}_t2.nii.gz",
        "SEG": patient / f"{patient.name}_seg.nii.gz",
    }

    for name, path in modalities.items():
        if not path.exists():
            raise FileNotFoundError(f"Missing {name}: {path}")

        nii = nib.load(str(path))
        data = nii.get_fdata()

        print(f"\n{name}")
        print(f"  Shape : {data.shape}")
        print(f"  Dtype : {data.dtype}")
        print(f"  Min   : {data.min():.3f}")
        print(f"  Max   : {data.max():.3f}")

    # Check segmentation labels
    seg = nib.load(str(modalities["SEG"])).get_fdata()

    labels = np.unique(seg)

    print("\nSegmentation labels:")
    print(labels.astype(int))

    print("=" * 60)
    print("NIFTI TEST PASSED")
    print("=" * 60)


if __name__ == "__main__":
    main()