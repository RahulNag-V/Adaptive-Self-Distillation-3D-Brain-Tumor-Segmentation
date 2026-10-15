"""
Postprocessing service restoring full-volume prediction to original NIfTI space.
Preserves original affine, voxel zooms, and spatial dimensions, saving prediction.nii.gz.
"""
from pathlib import Path
from typing import Dict, Any, List, Tuple
import nibabel as nib
import numpy as np
import torch
from monai.transforms import Invertd, Compose


class PostprocessingService:
    @staticmethod
    def restore_and_save_nifti(
        processed_data: Dict[str, Any],
        transform_pipeline: Compose,
        output_path: Path,
        reference_nii_path: Path
    ) -> Tuple[np.ndarray, List[int], List[int]]:
        """
        Inverts transforms back to original space using MONAI Invertd.
        Saves prediction.nii.gz with the exact original NIfTI affine and header.
        """
        # Ensure 'pred' is in processed_data
        inverter = Invertd(
            keys="pred",
            transform=transform_pipeline,
            orig_keys="image",
            meta_keys="pred_meta_dict",
            orig_meta_keys="image_meta_dict",
            nearest_interp=True,
            to_tensor=True
        )

        inverted_dict = inverter(processed_data)
        inverted_tensor = inverted_dict["pred"]

        # If tensor has channel dimension, take [0]
        if inverted_tensor.ndim == 4:
            pred_arr = inverted_tensor[0].cpu().numpy().astype(np.uint8)
        else:
            pred_arr = inverted_tensor.cpu().numpy().astype(np.uint8)

        # Load reference NIfTI to copy original header/affine
        ref_nii = nib.load(str(reference_nii_path))
        affine = ref_nii.affine
        header = ref_nii.header.copy()

        # Update header data type to uint8
        header.set_data_dtype(np.uint8)

        # Ensure spatial shape matches reference
        if pred_arr.shape != ref_nii.shape:
            # Reshape or pad/crop if minor boundary discrepancy
            target_shape = ref_nii.shape
            aligned = np.zeros(target_shape, dtype=np.uint8)
            sx = min(pred_arr.shape[0], target_shape[0])
            sy = min(pred_arr.shape[1], target_shape[1])
            sz = min(pred_arr.shape[2], target_shape[2])
            aligned[:sx, :sy, :sz] = pred_arr[:sx, :sy, :sz]
            pred_arr = aligned

        pred_nii = nib.Nifti1Image(pred_arr, affine, header)
        nib.save(pred_nii, str(output_path))

        unique_labels = [int(x) for x in np.unique(pred_arr)]
        final_shape = list(pred_arr.shape)

        return pred_arr, unique_labels, final_shape
