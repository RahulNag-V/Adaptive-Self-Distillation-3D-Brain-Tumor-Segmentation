"""
Direct test runner for NeuroSeg 3D backend test suite.
Runs both API/inference tests and MPR/coordinates tests.
"""
import sys
from pathlib import Path

# Fix Windows console UTF-8 output
sys.stdout.reconfigure(encoding="utf-8")

# Add project root and backend dir to sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from tests.test_api_and_inference import (
    init_model,
    test_health_endpoint,
    test_invalid_file_rejection,
)
from tests.test_volume_mpr_and_coordinates import (
    test_patient_discovery,
    test_patient_metadata_and_dimensions,
    test_three_orthogonal_slice_extraction,
    test_coordinate_boundaries_and_clamping,
    test_active_sequence_switching,
    test_segmentation_label_mapping,
    test_canonical_ras_orientation,
    test_model_readiness,
)

if __name__ == "__main__":
    print("=" * 70)
    print("RUNNING NEUROSEG 3D BACKEND & MPR TEST SUITE")
    print("=" * 70)

    tests = [
        ("Model Initialization", init_model),
        ("Health Endpoint", test_health_endpoint),
        ("Invalid File Security Rejection", test_invalid_file_rejection),
        ("Model Readiness & Checkpoint Status", test_model_readiness),
        ("Patient Discovery (BraTS 50 Subjects)", test_patient_discovery),
        ("Patient Metadata, Dimensions & Volumetrics", test_patient_metadata_and_dimensions),
        ("Three Orthogonal Viewers (Axial, Coronal, Sagittal)", test_three_orthogonal_slice_extraction),
        ("Slice Coordinates Boundaries & Safe Clamping", test_coordinate_boundaries_and_clamping),
        ("Active Sequence Switching (FLAIR, T1, T1CE, T2)", test_active_sequence_switching),
        ("BraTS Segmentation Label Mapping (WT, TC, ET)", test_segmentation_label_mapping),
        ("Canonical RAS Affine & Orientation", test_canonical_ras_orientation),
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

    print("\n" + "=" * 70)
    print(f"RESULTS: {passed} PASSED, {failed} FAILED out of {len(tests)} tests")
    print("=" * 70)

    if failed > 0:
        sys.exit(1)
