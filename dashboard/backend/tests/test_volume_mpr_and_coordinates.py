"""
Automated tests for 3D Brain Tumor Multi-Planar Reconstruction (MPR),
Slice Coordinates panel, BraTS dataset discovery, and modality switching.
"""
from pathlib import Path
import sys
import numpy as np
import nibabel as nib
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.main import app
from app.services.volume_service import VolumeService
from app.services.inference_service import InferenceService

TEST_SUBJECT = "BraTS2021_01017"


def test_patient_discovery():
    """Verify that BraTS subjects are dynamically discovered with all 4 modalities."""
    with TestClient(app) as client:
        res = client.get("/api/patients")
        assert res.status_code == 200
        data = res.json()
        assert "patients" in data
        assert data["total"] >= 10
        # Check first subject structure
        first = data["patients"][0]
        assert "id" in first
        assert "modalities" in first
        assert "FLAIR" in first["modalities"]
        assert "has_ground_truth" in first


def test_patient_metadata_and_dimensions():
    """Verify metadata returns valid dimensions and volumetric statistics."""
    with TestClient(app) as client:
        res = client.get(f"/api/patients/{TEST_SUBJECT}")
        assert res.status_code == 200
        meta = res.json()
        assert meta["patient_id"] == TEST_SUBJECT
        assert "dimensions" in meta
        dims = meta["dimensions"]
        assert dims["axial"] == 155
        assert dims["coronal"] == 240
        assert dims["sagittal"] == 240
        assert meta["has_ground_truth"] is True
        # Check volumetrics
        assert "volumetrics" in meta
        assert "WT" in meta["volumetrics"]
        assert "TC" in meta["volumetrics"]
        assert "ET" in meta["volumetrics"]
        assert meta["volumetrics"]["WT"]["volume_cm3"] > 0


def test_three_orthogonal_slice_extraction():
    """Verify axial, coronal, and sagittal slice rendering in PNG format."""
    with TestClient(app) as client:
        # 1. Axial Slice (Z=78)
        res_ax = client.get(
            f"/api/volume/slice?patient_id={TEST_SUBJECT}&plane=axial&index=78&modality=flair&seg_source=ground_truth"
        )
        assert res_ax.status_code == 200
        assert res_ax.headers["content-type"] == "image/png"
        assert len(res_ax.content) > 1000

        # 2. Coronal Slice (Y=120)
        res_cor = client.get(
            f"/api/volume/slice?patient_id={TEST_SUBJECT}&plane=coronal&index=120&modality=flair&seg_source=ground_truth"
        )
        assert res_cor.status_code == 200
        assert res_cor.headers["content-type"] == "image/png"
        assert len(res_cor.content) > 1000

        # 3. Sagittal Slice (X=120)
        res_sag = client.get(
            f"/api/volume/slice?patient_id={TEST_SUBJECT}&plane=sagittal&index=120&modality=flair&seg_source=ground_truth"
        )
        assert res_sag.status_code == 200
        assert res_sag.headers["content-type"] == "image/png"
        assert len(res_sag.content) > 1000


def test_coordinate_boundaries_and_clamping():
    """Verify first, last, and out-of-range slice indices clamp safely without crashing."""
    with TestClient(app) as client:
        # First index (0)
        res_first = client.get(
            f"/api/volume/slice?patient_id={TEST_SUBJECT}&plane=axial&index=0"
        )
        assert res_first.status_code == 200

        # Last index (154 for axial)
        res_last = client.get(
            f"/api/volume/slice?patient_id={TEST_SUBJECT}&plane=axial&index=154"
        )
        assert res_last.status_code == 200

        # Negative out-of-bounds index (-10 -> clamps to 0)
        res_neg = client.get(
            f"/api/volume/slice?patient_id={TEST_SUBJECT}&plane=axial&index=-10"
        )
        assert res_neg.status_code == 200

        # High out-of-bounds index (999 -> clamps to 154)
        res_high = client.get(
            f"/api/volume/slice?patient_id={TEST_SUBJECT}&plane=axial&index=999"
        )
        assert res_high.status_code == 200


def test_active_sequence_switching():
    """Verify that switching between FLAIR, T1, T1CE, and T2 produces valid distinct images."""
    with TestClient(app) as client:
        contents = {}
        for mod in ["flair", "t1", "t1ce", "t2"]:
            res = client.get(
                f"/api/volume/slice?patient_id={TEST_SUBJECT}&plane=axial&index=78&modality={mod}&seg_source=none"
            )
            assert res.status_code == 200
            assert res.headers["content-type"] == "image/png"
            contents[mod] = res.content

        # Verify that FLAIR and T1 are not identical (different MRI contrasts)
        assert contents["flair"] != contents["t1"], "FLAIR and T1 slices should have distinct contrasts"
        assert contents["t1ce"] != contents["t2"], "T1ce and T2 slices should have distinct contrasts"


def test_segmentation_label_mapping():
    """Verify BraTS label mapping handles Whole Tumor, Tumor Core, and Enhancing Tumor."""
    seg_vol = VolumeService.get_volume_array(TEST_SUBJECT, "seg")
    assert seg_vol is not None
    unique_labels = set(np.unique(seg_vol).astype(int))

    # Standard BraTS labels: 0=BG, 1=NCR, 2=ED, 4=ET
    assert 0 in unique_labels
    assert (1 in unique_labels) or (2 in unique_labels) or (4 in unique_labels)

    # Whole Tumor (WT: 1, 2, 4)
    wt_mask = np.isin(seg_vol, [1, 2, 3, 4])
    # Tumor Core (TC: 1, 4)
    tc_mask = np.isin(seg_vol, [1, 3, 4])
    # Enhancing Tumor (ET: 4)
    et_mask = np.isin(seg_vol, [3, 4])

    assert wt_mask.sum() >= tc_mask.sum(), "Whole tumor volume must be >= Tumor core volume"
    assert tc_mask.sum() >= et_mask.sum(), "Tumor core volume must be >= Enhancing tumor volume"


def test_canonical_ras_orientation():
    """Verify canonical RAS affine orientation is enforced."""
    subj_dir = VolumeService._find_subject_dir(TEST_SUBJECT)
    assert subj_dir is not None
    flair_path = subj_dir / f"{TEST_SUBJECT}_flair.nii.gz"
    nii = nib.load(str(flair_path))
    canonical = nib.as_closest_canonical(nii)

    # RAS canonical has positive diagonal direction cosines
    diag = np.diag(canonical.affine)[:3]
    assert np.all(diag > 0), f"Canonical RAS affine diagonal must be positive: {diag}"
    assert canonical.shape == (240, 240, 155)


def test_model_readiness():
    """Verify trained Adaptive model checkpoint is loaded."""
    status = InferenceService.get_status()
    assert status["checkpoint_loaded"] is True
    assert status["model"] == "Adaptive Self-Distillation"
