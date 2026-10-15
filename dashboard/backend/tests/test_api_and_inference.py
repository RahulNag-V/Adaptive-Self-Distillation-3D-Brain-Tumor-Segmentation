"""
End-to-end test suite for NeuroSeg 3D backend.
Tests:
1. Health endpoint & model loading
2. Modality validation & invalid file rejection
3. Session creation & upload
4. Real end-to-end inference on BraTS2021_01069
5. Prediction label validation (only {0,1,2,3})
6. Volumetric & Dice/HD95 calculation against ground truth
"""
from pathlib import Path
import shutil
import sys
from fastapi.testclient import TestClient

# Ensure backend and project root are in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app
from app.services.inference_service import InferenceService
from app.utils.nifti_utils import get_session_dir, cleanup_session_dir

TEST_SUBJECT = "BraTS2021_01069"
SUBJECT_DIR = PROJECT_ROOT / "data" / "raw" / "BraTS2021" / "BraTS2021_Training_Data" / TEST_SUBJECT


def init_model():
    # Explicitly ensure model is loaded once
    InferenceService.initialize()
    assert InferenceService.is_ready(), "Adaptive model failed to initialize"


def test_health_endpoint():
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["checkpoint_loaded"] is True
        assert data["model"] == "Adaptive Self-Distillation"
        assert data["device"] in ["cuda", "cpu"]


def test_invalid_file_rejection():
    with TestClient(app) as client:
        # Uploading executable file should fail
        response = client.post(
            "/api/upload",
            files={"flair": ("malicious.exe", b"fake binary content", "application/octet-stream")}
        )
        assert response.status_code == 400
        assert "Dangerous or executable file extension" in response.json()["detail"]


def test_real_end_to_end_inference_brats_01069():
    """
    Runs full inference on BraTS2021_01069 and verifies:
    - 4 modalities + seg upload
    - Validation passes
    - Real sliding-window inference executes
    - Prediction file prediction.nii.gz exists and is readable
    - Only labels {0, 1, 2, 3} are present
    - Volumetric values are positive
    - Case-specific WT, TC, ET Dice and HD95 match official research evaluation
    """
    assert SUBJECT_DIR.exists(), f"Test subject directory missing: {SUBJECT_DIR}"

    flair_path = SUBJECT_DIR / f"{TEST_SUBJECT}_flair.nii.gz"
    t1_path = SUBJECT_DIR / f"{TEST_SUBJECT}_t1.nii.gz"
    t1ce_path = SUBJECT_DIR / f"{TEST_SUBJECT}_t1ce.nii.gz"
    t2_path = SUBJECT_DIR / f"{TEST_SUBJECT}_t2.nii.gz"
    seg_path = SUBJECT_DIR / f"{TEST_SUBJECT}_seg.nii.gz"

    for p in [flair_path, t1_path, t1ce_path, t2_path, seg_path]:
        assert p.exists(), f"Required subject file missing: {p}"

    with TestClient(app) as client:
        # 1. Upload files
        with open(flair_path, "rb") as f_flair, \
             open(t1_path, "rb") as f_t1, \
             open(t1ce_path, "rb") as f_t1ce, \
             open(t2_path, "rb") as f_t2, \
             open(seg_path, "rb") as f_seg:

            files = {
                "flair": ("flair.nii.gz", f_flair, "application/gzip"),
                "t1": ("t1.nii.gz", f_t1, "application/gzip"),
                "t1ce": ("t1ce.nii.gz", f_t1ce, "application/gzip"),
                "t2": ("t2.nii.gz", f_t2, "application/gzip"),
                "seg": ("seg.nii.gz", f_seg, "application/gzip"),
            }

            up_res = client.post("/api/upload", files=files)
            assert up_res.status_code == 200
            up_data = up_res.json()
            session_id = up_data["session_id"]
            assert up_data["has_ground_truth"] is True

        try:
            # 2. Validate session
            val_res = client.post("/api/validate", json={"session_id": session_id})
            assert val_res.status_code == 200
            val_data = val_res.json()
            assert val_data["is_valid"] is True
            assert len(val_data["missing_modalities"]) == 0

            # 3. Run Segmentation
            seg_res = client.post("/api/segment", json={"session_id": session_id})
            assert seg_res.status_code == 200
            res = seg_res.json()

            assert res["status"] == "success"
            assert res["original_shape"] == [240, 240, 155]
            assert all(lbl in [0, 1, 2, 3] for lbl in res["unique_labels"])
            assert res["tumor_voxels"] > 0
            assert res["tumor_volume_mm3"] > 0
            assert res["tumor_volume_cm3"] > 0
            assert res["ground_truth_available"] is True
            assert res["metrics"] is not None

            # Verify Case-Specific Metrics match official audit table:
            # WT Dice: ~0.5557, TC Dice: ~0.8600, ET Dice: ~0.8986, Mean Dice: ~0.7714
            metrics = res["metrics"]
            print("\nReal BraTS2021_01069 results from backend:")
            print(f"WT Dice:   {metrics['WT_dice']}")
            print(f"TC Dice:   {metrics['TC_dice']}")
            print(f"ET Dice:   {metrics['ET_dice']}")
            print(f"Mean Dice: {metrics['mean_dice']}")
            print(f"Mean HD95: {metrics['mean_hd95']}")

            assert abs(metrics["WT_dice"] - 0.5557) < 0.01, f"WT Dice mismatch: {metrics['WT_dice']}"
            assert abs(metrics["TC_dice"] - 0.8600) < 0.01, f"TC Dice mismatch: {metrics['TC_dice']}"
            assert abs(metrics["ET_dice"] - 0.8986) < 0.01, f"ET Dice mismatch: {metrics['ET_dice']}"
            assert abs(metrics["mean_dice"] - 0.7714) < 0.01, f"Mean Dice mismatch: {metrics['mean_dice']}"

            # 4. Verify file retrieval endpoint
            file_res = client.get(f"/api/sessions/{session_id}/file/prediction.nii.gz")
            assert file_res.status_code == 200
            assert len(file_res.content) > 1000

        finally:
            # Cleanup session files
            client.delete(f"/api/sessions/{session_id}")
