"""
Tumor Burden & Volumetric Severity Assessment Service.
Calculates rigorous physical volume metrics, anatomical extent, slice-wise cross-sectional areas,
and relative intracranial tumor burden from real multimodal MRI and BraTS segmentation masks.
"""
from pathlib import Path
import json
import logging
from typing import Dict, Any, Optional, List, Tuple
import numpy as np
import nibabel as nib

from app.services.volume_service import VolumeService

logger = logging.getLogger("neuroseg3d.burden")

CONFIG_PATH = Path(__file__).resolve().parent.parent / "config" / "tumor_burden_config.json"


def load_burden_config() -> Dict[str, Any]:
    """Loads configurable research burden thresholds and citations."""
    if CONFIG_PATH.exists():
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning(f"Failed to load burden config from {CONFIG_PATH}: {e}")
    # Built-in research fallback thresholds
    return {
        "version": "1.0.0",
        "name": "Experimental Research Volumetric Burden Categorization",
        "citation": "Research volumetric stratification derived from neuro-oncology volumetrics literature. NOT clinically validated.",
        "is_clinical_validation": False,
        "disclaimer": "Experimental research categorization based purely on segmented volumetric spatial extent (cm³). This does NOT constitute a clinical diagnosis, WHO tumor grade (Grade 1-4), cancer staging, or prognostic severity assessment.",
        "thresholds": [
            {"category": "Minimal / Focal", "min_cm3": 0.0, "max_cm3": 5.0, "color": "#10B981", "description": "Segmented whole-tumor volume under 5.0 cm³"},
            {"category": "Moderate", "min_cm3": 5.0, "max_cm3": 25.0, "color": "#06B6D4", "description": "Segmented whole-tumor volume between 5.0 and 25.0 cm³"},
            {"category": "Substantial", "min_cm3": 25.0, "max_cm3": 60.0, "color": "#F59E0B", "description": "Segmented whole-tumor volume between 25.0 and 60.0 cm³"},
            {"category": "Extensive", "min_cm3": 60.0, "max_cm3": 10000.0, "color": "#EF4444", "description": "Segmented whole-tumor volume exceeding 60.0 cm³"}
        ]
    }


class TumorBurdenService:
    @classmethod
    def get_patient_voxel_spacing(cls, subject_id: str) -> Tuple[float, float, float]:
        """
        Retrieves real physical voxel spacing (zooms in mm) from canonical NIfTI volume.
        Does not assume 1 mm³ isotropic spacing.
        """
        subj_dir = VolumeService._find_subject_dir(subject_id)
        if not subj_dir:
            return (1.0, 1.0, 1.0)

        for mod in ["flair", "t1", "t1ce", "t2"]:
            p = subj_dir / f"{subject_id}_{mod}.nii.gz"
            if not p.exists():
                p = subj_dir / f"{mod}.nii.gz"
            if p.exists():
                try:
                    nii = nib.load(str(p))
                    canonical = nib.as_closest_canonical(nii)
                    zooms = canonical.header.get_zooms()[:3]
                    # Validate zooms
                    if all(z > 0 and np.isfinite(z) for z in zooms):
                        return (float(zooms[0]), float(zooms[1]), float(zooms[2]))
                except Exception as e:
                    logger.warning(f"Error reading spacing from {p}: {e}")
        return (1.0, 1.0, 1.0)

    @classmethod
    def analyze_tumor_burden(
        cls,
        subject_id: str,
        seg_source: str = "ground_truth"
    ) -> Dict[str, Any]:
        """
        Analyzes actual patient MRI volume and corresponding segmentation mask.
        Computes physical volume, slice-wise peak area, anatomical extent,
        relative intracranial volume burden, and research classification.
        """
        # 1. Retrieve canonical MRI volume
        mri_vol = VolumeService.get_volume_array(subject_id, "flair")
        if mri_vol is None:
            for m in ["t1", "t1ce", "t2"]:
                mri_vol = VolumeService.get_volume_array(subject_id, m)
                if mri_vol is not None:
                    break

        if mri_vol is None:
            return {
                "success": False,
                "error": f"Patient '{subject_id}' not found or has no readable MRI modalities.",
                "patient_id": subject_id,
            }

        shape_x, shape_y, shape_z = mri_vol.shape
        voxel_spacing = cls.get_patient_voxel_spacing(subject_id)
        sx, sy, sz = voxel_spacing
        voxel_vol_mm3 = float(sx * sy * sz)
        voxel_vol_cm3 = voxel_vol_mm3 / 1000.0

        # In-plane pixel areas for slicing
        axial_pixel_area_mm2 = float(sx * sy)
        coronal_pixel_area_mm2 = float(sx * sz)
        sagittal_pixel_area_mm2 = float(sy * sz)

        # 2. Retrieve segmentation mask based on requested source
        is_ground_truth = seg_source.lower() in ["ground_truth", "gt"]
        seg_kind = "seg" if is_ground_truth else "pred"
        seg_vol = VolumeService.get_volume_array(subject_id, seg_kind)

        assessment_source_name = (
            "Ground Truth (Manual Expert Annotation)"
            if is_ground_truth
            else "Model Prediction (Adaptive UNETR + Self-Distillation)"
        )

        has_mask = seg_vol is not None
        if not has_mask:
            # Check why prediction is missing if requested
            pred_note = ""
            if not is_ground_truth:
                pred_note = "Model prediction has not been generated for this case yet. Click 'Run Prediction' to execute sliding-window inference."

            return {
                "success": False,
                "patient_id": subject_id,
                "assessment_source": "prediction" if not is_ground_truth else "ground_truth",
                "assessment_source_label": assessment_source_name,
                "has_segmentation": False,
                "error": f"Segmentation mask ({seg_kind}) not available for patient '{subject_id}'. {pred_note}".strip(),
                "dimensions": {"sagittal": shape_x, "coronal": shape_y, "axial": shape_z},
                "voxel_spacing_mm": [round(sx, 3), round(sy, 3), round(sz, 3)],
            }

        # 3. Label Extraction & Nested Region Masks
        # Standard BraTS: 1=NCR (Necrotic), 2=ED (Edema), 4=ET (Enhancing)
        # Remapped/Model: 1=NCR, 2=ED, 3=ET
        is_et = (seg_vol == 3) | (seg_vol == 4)
        is_tc = (seg_vol == 1) | is_et
        is_wt = (seg_vol == 2) | is_tc
        is_ed = (seg_vol == 2)
        is_ncr = (seg_vol == 1)

        wt_voxels = int(np.count_nonzero(is_wt))
        tc_voxels = int(np.count_nonzero(is_tc))
        et_voxels = int(np.count_nonzero(is_et))
        ed_voxels = int(np.count_nonzero(is_ed))
        ncr_voxels = int(np.count_nonzero(is_ncr))

        has_tumor = wt_voxels > 0

        # Physical volumes in cm³
        wt_volume_cm3 = round(wt_voxels * voxel_vol_cm3, 3)
        tc_volume_cm3 = round(tc_voxels * voxel_vol_cm3, 3)
        et_volume_cm3 = round(et_voxels * voxel_vol_cm3, 3)
        ed_volume_cm3 = round(ed_voxels * voxel_vol_cm3, 3)
        ncr_volume_cm3 = round(ncr_voxels * voxel_vol_cm3, 3)

        # 4. Slice-wise Cross-Sectional Analysis & Peak Slice
        # Axial (Z) slice-wise area
        axial_slice_counts = []
        max_axial_area_mm2 = 0.0
        peak_axial_slice = -1

        for z in range(shape_z):
            slice_mask = is_wt[:, :, z]
            cnt = int(np.count_nonzero(slice_mask))
            area_mm2 = round(cnt * axial_pixel_area_mm2, 2)
            axial_slice_counts.append(cnt)
            if area_mm2 > max_axial_area_mm2:
                max_axial_area_mm2 = area_mm2
                peak_axial_slice = z

        max_axial_area_cm2 = round(max_axial_area_mm2 / 100.0, 3)

        # Affected slice counts across 3 orthogonal axes
        affected_slices_axial = int(sum(1 for c in axial_slice_counts if c > 0))

        coronal_slice_counts = [int(np.count_nonzero(is_wt[:, y, :])) for y in range(shape_y)]
        affected_slices_coronal = int(sum(1 for c in coronal_slice_counts if c > 0))

        sagittal_slice_counts = [int(np.count_nonzero(is_wt[x, :, :])) for x in range(shape_x)]
        affected_slices_sagittal = int(sum(1 for c in sagittal_slice_counts if c > 0))

        # Core and Enhancing affected slice counts along axial plane
        tc_affected_axial = int(sum(1 for z in range(shape_z) if np.count_nonzero(is_tc[:, :, z]) > 0))
        et_affected_axial = int(sum(1 for z in range(shape_z) if np.count_nonzero(is_et[:, :, z]) > 0))

        # 5. Anatomical Extents & 3D Bounding Box (in mm)
        extents_mm = {"sagittal_x": 0.0, "coronal_y": 0.0, "axial_z": 0.0}
        bbox_slices = {
            "x_min": -1, "x_max": -1,
            "y_min": -1, "y_max": -1,
            "z_min": -1, "z_max": -1
        }

        if has_tumor:
            nonzero_coords = np.nonzero(is_wt)
            x_min, x_max = int(np.min(nonzero_coords[0])), int(np.max(nonzero_coords[0]))
            y_min, y_max = int(np.min(nonzero_coords[1])), int(np.max(nonzero_coords[1]))
            z_min, z_max = int(np.min(nonzero_coords[2])), int(np.max(nonzero_coords[2]))

            bbox_slices = {
                "x_min": x_min, "x_max": x_max,
                "y_min": y_min, "y_max": y_max,
                "z_min": z_min, "z_max": z_max,
            }

            extents_mm = {
                "sagittal_x": round((x_max - x_min + 1) * sx, 1),
                "coronal_y": round((y_max - y_min + 1) * sy, 1),
                "axial_z": round((z_max - z_min + 1) * sz, 1),
            }

        # 6. Intracranial / Brain Volume Denominator
        # Skull-stripped BraTS brain foreground voxels (> 0)
        brain_mask = mri_vol > 0
        brain_voxels = int(np.count_nonzero(brain_mask))
        brain_volume_cm3 = round(brain_voxels * voxel_vol_cm3, 2)

        relative_burden_pct: Optional[float] = None
        relative_burden_status = "Available"
        if brain_voxels > 0:
            relative_burden_pct = round((wt_volume_cm3 / brain_volume_cm3) * 100.0, 3)
        else:
            relative_burden_status = "Unavailable: valid brain mask required"

        # 7. Configurable Research Tumor Burden Category
        config = load_burden_config()
        assigned_category = "Unknown"
        category_color = "#94A3B8"
        category_description = "Uncategorized"
        severity_level = "unassigned"

        if has_tumor:
            for item in config.get("thresholds", []):
                min_v = item.get("min_cm3", 0.0)
                max_v = item.get("max_cm3", float("inf"))
                if min_v <= wt_volume_cm3 < max_v:
                    assigned_category = item.get("category", "Unspecified")
                    category_color = item.get("color", "#10B981")
                    category_description = item.get("description", "")
                    severity_level = item.get("severity_level", "unassigned")
                    break
        else:
            assigned_category = "No Tumor Detected"
            category_color = "#10B981"
            category_description = "Zero tumor voxels detected in segmentation mask."
            severity_level = "none"

        # 8. Concise, Factual Clinical Interpretation
        if has_tumor:
            et_ratio = round((et_volume_cm3 / wt_volume_cm3) * 100.0, 1) if wt_volume_cm3 > 0 else 0.0
            interpretation_text = (
                f"The segmented whole-tumor (WT) region occupies {wt_volume_cm3:.2f} cm³ across {affected_slices_axial} axial slices, "
                f"with a maximum cross-sectional area of {max_axial_area_cm2:.2f} cm² on axial slice {peak_axial_slice}. "
                f"The active enhancing component (ET) comprises {et_volume_cm3:.2f} cm³ ({et_ratio}% of whole tumor), "
                f"and the non-enhancing/necrotic core (TC) occupies {tc_volume_cm3:.2f} cm³. "
                f"Relative to the skull-stripped intracranial brain volume ({brain_volume_cm3:.1f} cm³), the tumor occupies {relative_burden_pct:.2f}% of brain parenchyma. "
                "These quantitative measurements describe volumetric spatial extent only and do not independently establish histological malignancy, WHO tumor grade (1-4), or clinical prognosis."
            )
        else:
            interpretation_text = (
                "No tumor tissue voxels (WT = 0.00 cm³) were detected in the selected segmentation mask. "
                "This quantitative assessment indicates complete absence of segmented lesion volume for this case."
            )

        # 9. Model Agreement / Validation Metrics (if Prediction evaluated against Ground Truth)
        model_validation_metrics = None
        if not is_ground_truth:
            gt_vol = VolumeService.get_volume_array(subject_id, "seg")
            if gt_vol is not None:
                # Compute Dice scores
                gt_wt = (gt_vol == 1) | (gt_vol == 2) | (gt_vol == 3) | (gt_vol == 4)
                gt_tc = (gt_vol == 1) | (gt_vol == 3) | (gt_vol == 4)
                gt_et = (gt_vol == 3) | (gt_vol == 4)

                def dice(m1, m2):
                    inter = np.count_nonzero(m1 & m2)
                    total = np.count_nonzero(m1) + np.count_nonzero(m2)
                    return round(float(2.0 * inter / total), 4) if total > 0 else 1.0

                wt_dice = dice(is_wt, gt_wt)
                tc_dice = dice(is_tc, gt_tc)
                et_dice = dice(is_et, gt_et)

                gt_wt_vol = round(np.count_nonzero(gt_wt) * voxel_vol_cm3, 3)
                vol_diff_cm3 = round(abs(wt_volume_cm3 - gt_wt_vol), 3)

                model_validation_metrics = {
                    "has_ground_truth_comparison": True,
                    "wt_dice": wt_dice,
                    "tc_dice": tc_dice,
                    "et_dice": et_dice,
                    "mean_dice": round((wt_dice + tc_dice + et_dice) / 3.0, 4),
                    "volume_difference_cm3": vol_diff_cm3,
                    "gt_wt_volume_cm3": gt_wt_vol,
                }

        # 10. Assemble Complete Response Payload
        return {
            "success": True,
            "patient_id": subject_id,
            "assessment_source": "ground_truth" if is_ground_truth else "prediction",
            "assessment_source_label": assessment_source_name,
            "checkpoint_identifier": "checkpoints/adaptive/best.pth (MONAI Adaptive UNETR)" if not is_ground_truth else "Manual Radiological Delineation",
            "has_segmentation": True,
            "has_tumor": has_tumor,
            "spatial_metadata": {
                "dimensions": {
                    "sagittal_x": shape_x,
                    "coronal_y": shape_y,
                    "axial_z": shape_z,
                },
                "voxel_spacing_mm": [round(sx, 3), round(sy, 3), round(sz, 3)],
                "voxel_volume_mm3": round(voxel_vol_mm3, 4),
                "is_isotropic_1mm": bool(np.allclose(voxel_spacing, (1.0, 1.0, 1.0), atol=1e-2)),
            },
            "whole_tumor": {
                "label_name": "Whole Tumor (WT)",
                "label_description": "Necrotic core + peritumoral edema + enhancing tumor (labels 1, 2, 4)",
                "volume_cm3": wt_volume_cm3,
                "volume_mm3": round(wt_voxels * voxel_vol_mm3, 1),
                "voxel_count": wt_voxels,
                "color": "#10B981",
                "affected_slices": {
                    "axial_z": affected_slices_axial,
                    "coronal_y": affected_slices_coronal,
                    "sagittal_x": affected_slices_sagittal,
                    "total_axial_slices": shape_z,
                },
                "maximum_cross_sectional_area": {
                    "area_cm2": max_axial_area_cm2,
                    "area_mm2": max_axial_area_mm2,
                    "peak_axial_slice_index": peak_axial_slice,
                },
                "extent_mm": extents_mm,
                "bounding_box_slices": bbox_slices,
            },
            "tumor_core": {
                "label_name": "Tumor Core (TC)",
                "label_description": "Necrotic / non-enhancing core + active enhancing tumor (labels 1, 4)",
                "volume_cm3": tc_volume_cm3,
                "volume_mm3": round(tc_voxels * voxel_vol_mm3, 1),
                "voxel_count": tc_voxels,
                "color": "#F59E0B",
                "affected_axial_slices": tc_affected_axial,
            },
            "enhancing_tumor": {
                "label_name": "Enhancing Tumor (ET)",
                "label_description": "Active gadolinium-enhancing hyperintense tumor tissue (label 4)",
                "volume_cm3": et_volume_cm3,
                "volume_mm3": round(et_voxels * voxel_vol_mm3, 1),
                "voxel_count": et_voxels,
                "color": "#EF4444",
                "affected_axial_slices": et_affected_axial,
            },
            "subcomponents": {
                "edema": {
                    "volume_cm3": ed_volume_cm3,
                    "voxel_count": ed_voxels,
                    "label": "Peritumoral Edema (ED, label 2)"
                },
                "necrosis": {
                    "volume_cm3": ncr_volume_cm3,
                    "voxel_count": ncr_voxels,
                    "label": "Necrotic / Non-Enhancing Core (NCR/NET, label 1)"
                }
            },
            "relative_tumor_burden": {
                "relative_burden_percentage": relative_burden_pct,
                "intracranial_brain_volume_cm3": brain_volume_cm3,
                "brain_voxels": brain_voxels,
                "status": relative_burden_status,
                "denominator_description": "Skull-stripped intracranial parenchyma volume (foreground voxels > 0)",
            },
            "burden_category": {
                "category": assigned_category,
                "severity_level": severity_level,
                "color": category_color,
                "description": category_description,
                "is_experimental_research": True,
                "clinical_severity_disclaimer": config.get("disclaimer", ""),
                "citation": config.get("citation", ""),
            },
            "clinical_interpretation": {
                "summary": interpretation_text,
                "limitations": [
                    "A tumor burden category is based strictly on segmented spatial volume and is NOT a clinical diagnosis.",
                    "WHO tumor grade (Grade 1 to 4) requires histopathological tissue analysis and molecular biomarker profiling (IDH1/2, 1p/19q codeletion, MGMT methylation, TERT promoter).",
                    "A larger segmented volume does not automatically equate to higher malignancy (e.g., large benign meningiomas vs. small infiltrative glioblastomas).",
                    "All volume calculations depend on MRI acquisition quality, slice spacing, and segmentation mask boundaries."
                ]
            },
            "model_validation": model_validation_metrics,
        }
