/**
 * NeuroSeg 3D - Segmentation API Service
 * Connects directly to FastAPI backend for upload, validation, and real inference.
 */

import { request, API_BASE_URL } from './client';

/**
 * Checks server health status and model checkpoint readiness.
 * GET /api/health
 */
export async function checkHealth() {
  return request('/api/health');
}

/**
 * Uploads multimodal MRI scans (FLAIR, T1, T1ce, T2) and optional ground truth (seg).
 * POST /api/upload
 */
export async function uploadMRI(files) {
  const formData = new FormData();
  if (files.flair) formData.append('flair', files.flair);
  if (files.t1) formData.append('t1', files.t1);
  if (files.t1ce) formData.append('t1ce', files.t1ce);
  if (files.t2) formData.append('t2', files.t2);
  if (files.seg) formData.append('seg', files.seg);
  if (files.ct) formData.append('ct', files.ct);

  return request('/api/upload', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Validates uploaded session files for NIfTI conformity, dimensional parity, and completeness.
 * POST /api/validate
 */
export async function validateMRI(sessionId) {
  return request('/api/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session_id: sessionId,
    }),
  });
}

/**
 * Preloads an existing validation case (e.g. BraTS2021_01069) from repository data
 * into an ephemeral session for testing.
 * POST /api/load-subject/{subject_id}
 */
export async function loadValidationSubject(subjectId = 'BraTS2021_01069') {
  return request(`/api/load-subject/${subjectId}`, {
    method: 'POST',
  });
}

/**
 * Triggers full-volume sliding-window inference using the trained Adaptive model.
 * POST /api/segment
 */
export async function runSegmentation(sessionId) {
  return request('/api/segment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session_id: sessionId,
    }),
  });
}

/**
 * Fetches completed segmentation results by session ID.
 * GET /api/results/{sessionId}
 */
export async function getSegmentationResult(sessionId) {
  return request(`/api/results/${sessionId}`);
}

/**
 * Helper to construct streaming URL for prediction or MRI NIfTI files.
 */
export function getSessionFileUrl(sessionId, filename) {
  return `${API_BASE_URL}/api/sessions/${sessionId}/file/${filename}`;
}

/**
 * Discovers and lists all BraTS 2021 subjects with available modalities and split tags.
 * GET /api/patients
 */
export async function getPatients() {
  return request('/api/patients');
}

/**
 * Retrieves spatial dimensions, voxel spacing, and tumor volumetrics for a patient.
 * GET /api/patients/{patient_id}
 */
export async function getPatientMetadata(patientId) {
  return request(`/api/patients/${patientId}`);
}

/**
 * Constructs direct URL for real-time 2D MRI and segmentation slice streaming.
 */
export function getSliceUrl({
  patientId,
  plane = 'axial',
  index = 75,
  modality = 'flair',
  segSource = 'ground_truth',
  showWt = true,
  showTc = true,
  showEt = true,
  opacity = 0.75,
  showOverlay = true,
  timestamp = null,
}) {
  const params = new URLSearchParams({
    patient_id: patientId,
    plane,
    index: String(index),
    modality: modality.toLowerCase(),
    seg_source: segSource,
    show_wt: String(showWt),
    show_tc: String(showTc),
    show_et: String(showEt),
    opacity: String(opacity),
    show_overlay: String(showOverlay),
  });
  if (timestamp) {
    params.append('t', String(timestamp));
  }
  return `${API_BASE_URL}/api/volume/slice?${params.toString()}`;
}

/**
 * Runs real Adaptive UNETR sliding-window inference on a patient volume.
 * POST /api/patients/{patient_id}/predict
 */
export async function runPatientPrediction(patientId) {
  return request(`/api/patients/${patientId}/predict`, {
    method: 'POST',
  });
}

/**
 * Fetches quantitative tumor burden, affected slice extents, relative intracranial percentage,
 * and experimental research categorization for a patient based on real MRI and segmentation masks.
 * GET /api/patients/{patient_id}/tumor-burden?seg_source={seg_source}
 */
export async function getPatientTumorBurden(patientId, segSource = 'ground_truth') {
  return request(`/api/patients/${patientId}/tumor-burden?seg_source=${encodeURIComponent(segSource)}`);
}

