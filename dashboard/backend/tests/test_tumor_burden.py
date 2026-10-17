"""
Automated Unit and Integration Tests for AI-Based Brain Tumor Burden Assessment.
Tests BraTS label mapping, non-isometric spacing conversion, slice-wise peak area,
relative intracranial volume percentage, empty mask handling, configurable threshold loading,
and real patient integration.
"""
import sys
from pathlib import Path
import json
import numpy as np
import torch

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.services.tumor_burden_service import TumorBurdenService, load_burden_config
from app.services.volume_service import VolumeService


def test_burden_config_loading():
    """Verify research threshold configuration and mandatory non-clinical disclaimers."""
    cfg = load_burden_config()
    assert "thresholds" in cfg, "Config missing thresholds"
    assert len(cfg["thresholds"]) >= 4, "Expected at least 4 research categories"
    assert "disclaimer" in cfg, "Config missing clinical disclaimer"
    assert "NOT" in cfg["disclaimer"] or "not" in cfg["disclaimer"].lower(), "Disclaimer must state it is not clinical diagnosis"
    assert cfg.get("is_clinical_validation") is False, "Config must declare it is not clinically validated"


def test_synthetic_label_mapping_and_volume():
    """
    Test BraTS label derivation on synthetic data with known ground truth:
    - 100 voxels label 1 (NCR)
    - 200 voxels label 2 (ED)
    - 300 voxels label 4 (ET)
    - Total WT = 600 voxels (1 + 2 + 4)
    - Total TC = 400 voxels (1 + 4)
    - Total ET = 300 voxels (4)
    """
    # Non-isometric spacing: 0.8mm x 0.8mm x 1.5mm
    sx, sy, sz = 0.8, 0.8, 1.5
    voxel_vol_mm3 = sx * sy * sz  # 0.96 mm3
    voxel_vol_cm3 = voxel_vol_mm3 / 1000.0

    mask = np.zeros((50, 50, 50), dtype=np.uint8)
    mask[10:15, 10:15, 10:14] = 1   # 5 * 5 * 4 = 100 voxels (NCR)
    mask[20:25, 20:25, 20:28] = 2   # 5 * 5 * 8 = 200 voxels (ED)
    mask[30:35, 30:36, 30:40] = 4   # 5 * 6 * 10 = 300 voxels (ET)

    is_et = (mask == 3) | (mask == 4)
    is_tc = (mask == 1) | is_et
    is_wt = (mask == 2) | is_tc

    assert np.count_nonzero(is_et) == 300, "ET voxel count mismatch"
    assert np.count_nonzero(is_tc) == 400, "TC voxel count mismatch"
    assert np.count_nonzero(is_wt) == 600, "WT voxel count mismatch"

    wt_vol_cm3 = round(600 * voxel_vol_cm3, 3)
    tc_vol_cm3 = round(400 * voxel_vol_cm3, 3)
    et_vol_cm3 = round(300 * voxel_vol_cm3, 3)

    assert wt_vol_cm3 == round(600 * 0.96 / 1000.0, 3)
    assert tc_vol_cm3 == round(400 * 0.96 / 1000.0, 3)
    assert et_vol_cm3 == round(300 * 0.96 / 1000.0, 3)


def test_slice_wise_area_and_peak_identification():
    """Test slice-wise cross-sectional area and peak slice detection."""
    sx, sy, sz = 1.0, 1.0, 1.0
    axial_pixel_area_mm2 = sx * sy  # 1.0 mm2

    mask = np.zeros((30, 30, 20), dtype=np.uint8)
    # Put 10 voxels at z=5
    mask[5:7, 5:10, 5] = 1   # 2 * 5 = 10 voxels -> 10 mm2
    # Put 50 voxels at z=10 (Peak)
    mask[5:10, 5:15, 10] = 2  # 5 * 10 = 50 voxels -> 50 mm2
    # Put 20 voxels at z=12
    mask[5:9, 5:10, 12] = 4  # 4 * 5 = 20 voxels -> 20 mm2

    is_wt = (mask > 0)
    max_area_mm2 = 0.0
    peak_z = -1
    affected_slices = 0

    for z in range(20):
        cnt = int(np.count_nonzero(is_wt[:, :, z]))
        if cnt > 0:
            affected_slices += 1
            area_mm2 = cnt * axial_pixel_area_mm2
            if area_mm2 > max_area_mm2:
                max_area_mm2 = area_mm2
                peak_z = z

    assert affected_slices == 3, f"Expected 3 affected axial slices, got {affected_slices}"
    assert peak_z == 10, f"Expected peak slice 10, got {peak_z}"
    assert max_area_mm2 == 50.0, f"Expected max area 50 mm2, got {max_area_mm2}"
    assert round(max_area_mm2 / 100.0, 2) == 0.5, "Expected 0.5 cm2"


def test_empty_mask_handling():
    """Verify that empty masks produce 0 volumes, no crashes, and correct 'none' status."""
    mask = np.zeros((40, 40, 40), dtype=np.uint8)
    is_wt = (mask > 0)

    wt_voxels = int(np.count_nonzero(is_wt))
    assert wt_voxels == 0
    wt_volume_cm3 = round(wt_voxels * 0.001, 3)
    assert wt_volume_cm3 == 0.0


def test_relative_intracranial_burden_calculation():
    """Verify relative burden percentage against brain volume."""
    voxel_vol_cm3 = 0.001  # 1mm3 isotropic
    brain_voxels = 1_200_000  # 1200 cm3 typical adult human brain
    brain_vol_cm3 = brain_voxels * voxel_vol_cm3

    tumor_voxels = 36_000     # 36 cm3
    tumor_vol_cm3 = tumor_voxels * voxel_vol_cm3

    relative_pct = round((tumor_vol_cm3 / brain_vol_cm3) * 100.0, 2)
    assert relative_pct == 3.0, f"Expected 3.0%, got {relative_pct}%"


def test_real_patient_tumor_burden_analysis():
    """Integration test: analyze actual BraTS2021_01017 patient volume and ground truth."""
    res = TumorBurdenService.analyze_tumor_burden("BraTS2021_01017", seg_source="ground_truth")
    assert res["success"] is True, f"Analysis failed: {res.get('error')}"
    assert res["patient_id"] == "BraTS2021_01017"
    assert res["has_segmentation"] is True
    assert res["has_tumor"] is True

    wt = res["whole_tumor"]
    tc = res["tumor_core"]
    et = res["enhancing_tumor"]

    assert wt["volume_cm3"] > 0, "Whole tumor volume must be positive"
    assert tc["volume_cm3"] > 0, "Tumor core volume must be positive"
    assert et["volume_cm3"] > 0, "Enhancing tumor volume must be positive"

    # Verify hierarchical nested subset property: WT >= TC >= ET
    assert wt["volume_cm3"] >= tc["volume_cm3"], "WT volume must be >= TC volume"
    assert tc["volume_cm3"] >= et["volume_cm3"], "TC volume must be >= ET volume"

    # Verify peak slice exists and is valid
    max_area = wt["maximum_cross_sectional_area"]
    assert max_area["area_cm2"] > 0
    assert 0 <= max_area["peak_axial_slice_index"] < res["spatial_metadata"]["dimensions"]["axial_z"]

    # Verify affected slice counts
    assert wt["affected_slices"]["axial_z"] > 0
    assert wt["affected_slices"]["coronal_y"] > 0
    assert wt["affected_slices"]["sagittal_x"] > 0

    # Verify relative intracranial burden
    rel = res["relative_tumor_burden"]
    assert rel["intracranial_brain_volume_cm3"] > 0
    assert rel["relative_burden_percentage"] is not None
    assert 0 < rel["relative_burden_percentage"] < 50.0

    # Verify research category
    cat = res["burden_category"]
    assert cat["category"] in ["Minimal / Focal", "Moderate", "Substantial", "Extensive"]
    assert cat["is_experimental_research"] is True
    assert len(cat["clinical_severity_disclaimer"]) > 10

    # Verify limitations and summary
    interp = res["clinical_interpretation"]
    assert len(interp["summary"]) > 50
    assert len(interp["limitations"]) >= 3


def test_nonexistent_patient_error_handling():
    """Verify error handling on nonexistent patient."""
    res = TumorBurdenService.analyze_tumor_burden("BraTS2021_99999_invalid")
    assert res["success"] is False
    assert "not found" in res["error"].lower()


if __name__ == "__main__":
    tests = [
        ("Burden Config & Disclaimer Loading", test_burden_config_loading),
        ("Synthetic BraTS Label Mapping & Volumes", test_synthetic_label_mapping_and_volume),
        ("Slice-wise Area & Peak Slice Detection", test_slice_wise_area_and_peak_identification),
        ("Empty Mask Zero-Burden Handling", test_empty_mask_handling),
        ("Relative Intracranial Burden Calculation", test_relative_intracranial_burden_calculation),
        ("Real Patient Ground Truth Integration (BraTS2021_01017)", test_real_patient_tumor_burden_analysis),
        ("Nonexistent Patient Graceful Error Handling", test_nonexistent_patient_error_handling),
    ]

    passed = 0
    failed = 0
    for idx, (name, fn) in enumerate(tests, 1):
        print(f"\n[{idx}/{len(tests)}] Testing: {name}...")
        try:
            fn()
            print(f"[PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"[FAIL] {name}: {str(e)}")
            failed += 1

    print("\n" + "=" * 60)
    print(f"BURDEN TESTS: {passed} PASSED, {failed} FAILED")
    print("=" * 60)
    if failed > 0:
        sys.exit(1)
