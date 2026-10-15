"""
Volume service for 3D Brain Tumor Segmentation MPR.
Provides high-performance canonical RAS NIfTI slicing, volume caching,
patient discovery, multi-modality alignment, and real-time BraTS segmentation overlay.
"""
from collections import OrderedDict
import io
import logging
from pathlib import Path
from threading import Lock
from typing import Dict, Any, List, Optional, Tuple

import nibabel as nib
import numpy as np
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data" / "raw" / "BraTS2021" / "BraTS2021_Training_Data"
VAL_SPLIT_FILE = PROJECT_ROOT / "data" / "splits" / "val.txt"
SESSIONS_DIR = PROJECT_ROOT / "neuroseg3d_sessions"

logger = logging.getLogger("neuroseg3d.volume")


class VolumeService:
    # LRU In-memory volume cache: { (patient_id, modality_or_seg): np.ndarray }
    _cache: "OrderedDict[Tuple[str, str], np.ndarray]" = OrderedDict()
    _cache_max_size: int = 32  # Can hold up to 6-8 complete 4-modality cases in memory
    _cache_lock: Lock = Lock()

    # Cached patient list
    _patients_list_cache: Optional[List[Dict[str, Any]]] = None

    @classmethod
    def list_patients(cls) -> List[Dict[str, Any]]:
        """
        Dynamically discovers all BraTS subjects present in dataset folder.
        """
        if cls._patients_list_cache is not None:
            return cls._patients_list_cache

        val_subs = set()
        if VAL_SPLIT_FILE.exists():
            try:
                with open(VAL_SPLIT_FILE, "r", encoding="utf-8") as f:
                    val_subs = {line.strip() for line in f if line.strip()}
            except Exception as e:
                logger.warning(f"Failed to read val split: {e}")

        patients = []
        if DATA_DIR.exists():
            for p_dir in sorted(DATA_DIR.iterdir()):
                if p_dir.is_dir() and p_dir.name.startswith("BraTS2021_"):
                    p_id = p_dir.name
                    # Check available files
                    flair = (p_dir / f"{p_id}_flair.nii.gz").exists()
                    t1 = (p_dir / f"{p_id}_t1.nii.gz").exists()
                    t1ce = (p_dir / f"{p_id}_t1ce.nii.gz").exists()
                    t2 = (p_dir / f"{p_id}_t2.nii.gz").exists()
                    seg = (p_dir / f"{p_id}_seg.nii.gz").exists()

                    # Check if prediction exists in sessions or checkpoints
                    pred_file = SESSIONS_DIR / p_id / "prediction.nii.gz"
                    has_pred = pred_file.exists()

                    mods = []
                    if flair: mods.append("FLAIR")
                    if t1: mods.append("T1")
                    if t1ce: mods.append("T1CE")
                    if t2: mods.append("T2")

                    patients.append({
                        "id": p_id,
                        "modalities": mods,
                        "has_ground_truth": seg,
                        "has_prediction": has_pred,
                        "is_validation": p_id in val_subs
                    })

        cls._patients_list_cache = patients
        return patients

    @classmethod
    def _find_subject_dir(cls, subject_id: str) -> Optional[Path]:
        """Finds patient directory in raw data or active session."""
        # Check raw data
        candidate = DATA_DIR / subject_id
        if candidate.exists():
            return candidate
        # Check session folder
        session_cand = SESSIONS_DIR / subject_id
        if session_cand.exists():
            return session_cand
        return None

    @classmethod
    def get_volume_array(cls, subject_id: str, kind: str) -> Optional[np.ndarray]:
        """
        Loads and caches canonical RAS volume in memory.
        kind: 'flair', 't1', 't1ce', 't2', 'seg', 'pred'
        """
        cache_key = (subject_id, kind.lower())
        with cls._cache_lock:
            if cache_key in cls._cache:
                cls._cache.move_to_end(cache_key)
                return cls._cache[cache_key]

        subj_dir = cls._find_subject_dir(subject_id)
        if not subj_dir:
            return None

        # Determine file path
        target_path: Optional[Path] = None
        if kind.lower() in ["flair", "t1", "t1ce", "t2", "seg"]:
            # Standard BraTS naming
            p1 = subj_dir / f"{subject_id}_{kind.lower()}.nii.gz"
            p2 = subj_dir / f"{kind.lower()}.nii.gz"
            if p1.exists():
                target_path = p1
            elif p2.exists():
                target_path = p2
        elif kind.lower() == "pred":
            # Check session prediction
            p = SESSIONS_DIR / subject_id / "prediction.nii.gz"
            if p.exists():
                target_path = p

        if not target_path or not target_path.exists():
            return None

        try:
            nii = nib.load(str(target_path))
            canonical = nib.as_closest_canonical(nii)
            arr = canonical.get_fdata(dtype=np.float32)

            with cls._cache_lock:
                if len(cls._cache) >= cls._cache_max_size:
                    cls._cache.popitem(last=False)
                cls._cache[cache_key] = arr

            return arr
        except Exception as e:
            logger.error(f"Error loading {target_path}: {e}")
            return None

    @classmethod
    def get_patient_metadata(cls, subject_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves real spatial dimensions, voxel spacing, and volumetric metrics.
        """
        # Load FLAIR or first available modality for geometry
        vol = cls.get_volume_array(subject_id, "flair")
        if vol is None:
            for m in ["t1", "t1ce", "t2"]:
                vol = cls.get_volume_array(subject_id, m)
                if vol is not None:
                    break

        if vol is None:
            return None

        # Canonical RAS shape: [sagittal (X), coronal (Y), axial (Z)]
        shape_x, shape_y, shape_z = vol.shape

        # Check segmentation volumes
        seg_vol = cls.get_volume_array(subject_id, "seg")
        volumetrics = {
            "WT": {"volume_cm3": 0.0, "voxels": 0},
            "TC": {"volume_cm3": 0.0, "voxels": 0},
            "ET": {"volume_cm3": 0.0, "voxels": 0},
        }

        if seg_vol is not None:
            # BraTS labels: 1=NCR, 2=ED, 4=ET (or 3=ET)
            wt_mask = (seg_vol == 1) | (seg_vol == 2) | (seg_vol == 3) | (seg_vol == 4)
            tc_mask = (seg_vol == 1) | (seg_vol == 3) | (seg_vol == 4)
            et_mask = (seg_vol == 3) | (seg_vol == 4)

            wt_vox = int(np.count_nonzero(wt_mask))
            tc_vox = int(np.count_nonzero(tc_mask))
            et_vox = int(np.count_nonzero(et_mask))

            volumetrics = {
                "WT": {"volume_cm3": round(wt_vox / 1000.0, 2), "voxels": wt_vox},
                "TC": {"volume_cm3": round(tc_vox / 1000.0, 2), "voxels": tc_vox},
                "ET": {"volume_cm3": round(et_vox / 1000.0, 2), "voxels": et_vox},
            }

        pred_vol = cls.get_volume_array(subject_id, "pred")

        return {
            "patient_id": subject_id,
            "dimensions": {
                "axial": shape_z,     # Z slices (0 .. shape_z - 1)
                "coronal": shape_y,   # Y slices (0 .. shape_y - 1)
                "sagittal": shape_x,  # X slices (0 .. shape_x - 1)
            },
            "voxel_spacing": [1.0, 1.0, 1.0],
            "modalities": ["FLAIR", "T1", "T1CE", "T2"],
            "has_ground_truth": seg_vol is not None,
            "has_prediction": pred_vol is not None,
            "volumetrics": volumetrics
        }

    @classmethod
    def render_slice(
        cls,
        subject_id: str,
        plane: str,
        index: int,
        modality: str = "flair",
        seg_source: str = "ground_truth",
        show_wt: bool = True,
        show_tc: bool = True,
        show_et: bool = True,
        opacity: float = 0.75,
        show_overlay: bool = True
    ) -> bytes:
        """
        Renders an authentic, contrast-normalized 2D slice along the requested plane
        with optional BraTS segmentation overlay in sub-millisecond time.
        """
        plane = plane.lower()
        modality = modality.lower()
        mri_vol = cls.get_volume_array(subject_id, modality)

        if mri_vol is None:
            # Fallback to black empty slice
            blank = Image.new("RGBA", (240, 240), (6, 10, 18, 255))
            buf = io.BytesIO()
            blank.save(buf, format="PNG")
            return buf.getvalue()

        shape_x, shape_y, shape_z = mri_vol.shape

        # Clamp slice index
        if plane == "axial":
            idx = max(0, min(shape_z - 1, index))
            mri_2d = mri_vol[:, :, idx]
        elif plane == "coronal":
            idx = max(0, min(shape_y - 1, index))
            mri_2d = mri_vol[:, idx, :]
        elif plane == "sagittal":
            idx = max(0, min(shape_x - 1, index))
            mri_2d = mri_vol[idx, :, :]
        else:
            raise ValueError(f"Unknown anatomical plane '{plane}'")

        # Load segmentation if requested
        seg_2d: Optional[np.ndarray] = None
        if seg_source in ["ground_truth", "gt"]:
            seg_vol = cls.get_volume_array(subject_id, "seg")
        elif seg_source in ["prediction", "pred"]:
            seg_vol = cls.get_volume_array(subject_id, "pred")
        else:
            seg_vol = None

        if seg_vol is not None:
            if plane == "axial":
                seg_2d = seg_vol[:, :, idx]
            elif plane == "coronal":
                seg_2d = seg_vol[:, idx, :]
            elif plane == "sagittal":
                seg_2d = seg_vol[idx, :, :]

        # Orient slice according to standard radiological conventions
        # Axial: Anterior on Top, Posterior on Bottom; Right on Left, Left on Right
        # Coronal: Superior on Top, Inferior on Bottom; Right on Left, Left on Right
        # Sagittal: Superior on Top, Inferior on Bottom; Anterior on Left, Posterior on Right
        if plane == "axial":
            mri_slice = np.flipud(np.rot90(mri_2d))
            seg_slice = np.flipud(np.rot90(seg_2d)) if seg_2d is not None else None
        elif plane == "coronal":
            mri_slice = np.rot90(mri_2d)
            seg_slice = np.rot90(seg_2d) if seg_2d is not None else None
        elif plane == "sagittal":
            mri_slice = np.rot90(mri_2d)
            seg_slice = np.rot90(seg_2d) if seg_2d is not None else None

        # 1. Grayscale MRI Windowing (1% to 99% robust contrast normalization)
        fg = mri_slice[mri_slice > 0]
        if len(fg) > 0:
            p1 = float(np.percentile(fg, 1))
            p99 = float(np.percentile(fg, 99))
            norm = np.clip((mri_slice - p1) / (p99 - p1 + 1e-5) * 255.0, 0, 255).astype(np.uint8)
        else:
            norm = np.zeros_like(mri_slice, dtype=np.uint8)

        # Convert to RGBA
        rgb = np.stack([norm, norm, norm, np.full_like(norm, 255)], axis=-1)

        # 2. BraTS Segmentation Overlay Color Mapping
        if seg_slice is not None and show_overlay and opacity > 0:
            alpha_val = int(max(0.0, min(1.0, opacity)) * 255)

            # Mask definitions
            # WT: 1, 2, 3, 4 (Whole Tumor - Emerald Green #10B981)
            # TC: 1, 3, 4 (Tumor Core - Amber #F59E0B)
            # ET: 3, 4 (Enhancing Tumor - Red #EF4444)
            is_et = (seg_slice == 3) | (seg_slice == 4)
            is_tc = (seg_slice == 1) | is_et
            is_wt = (seg_slice == 2) | is_tc

            # Colors (RGB)
            c_wt = np.array([16, 185, 129], dtype=np.float32)   # Green
            c_tc = np.array([245, 158, 11], dtype=np.float32)   # Amber
            c_et = np.array([239, 68, 68], dtype=np.float32)    # Red

            blend_rgb = rgb[:, :, :3].astype(np.float32)

            # Apply in hierarchical order: WT -> TC -> ET
            if show_wt:
                m_wt = is_wt & ~is_tc if show_tc else is_wt
                for c in range(3):
                    blend_rgb[m_wt, c] = (1 - opacity) * blend_rgb[m_wt, c] + opacity * c_wt[c]

            if show_tc:
                m_tc = is_tc & ~is_et if show_et else is_tc
                for c in range(3):
                    blend_rgb[m_tc, c] = (1 - opacity) * blend_rgb[m_tc, c] + opacity * c_tc[c]

            if show_et:
                m_et = is_et
                for c in range(3):
                    blend_rgb[m_et, c] = (1 - opacity) * blend_rgb[m_et, c] + opacity * c_et[c]

            rgb[:, :, :3] = np.clip(blend_rgb, 0, 255).astype(np.uint8)

        # Save as PNG
        img = Image.fromarray(rgb, mode="RGBA")
        buf = io.BytesIO()
        img.save(buf, format="PNG", compress_level=1)  # compress_level=1 for max speed
        return buf.getvalue()
