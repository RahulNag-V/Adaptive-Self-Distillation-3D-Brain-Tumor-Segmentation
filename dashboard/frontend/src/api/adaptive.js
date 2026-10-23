/**
 * API client for NeuroSeg 3D Adaptive Human-in-the-Loop Workflow.
 * Communicates with /api/adaptive endpoints.
 */
import client from './client';

export const getCatalog = async () => {
  const response = await client.get('/api/adaptive/catalog');
  return response.data;
};

export const listAnnotations = async () => {
  const response = await client.get('/api/adaptive/annotations');
  return response.data;
};

export const getAnnotation = async (patientId, segSource = 'prediction') => {
  const response = await client.get(`/api/adaptive/annotations/${encodeURIComponent(patientId)}?seg_source=${encodeURIComponent(segSource)}`);
  return response.data;
};

export const editAnnotation = async (patientId, strokes, actionType = 'paint', segSource = 'prediction') => {
  const response = await client.post(`/api/adaptive/annotations/${encodeURIComponent(patientId)}/edit`, {
    patient_id: patientId,
    seg_source: segSource,
    strokes,
    action_type: actionType,
  });
  return response.data;
};

export const undoEdit = async (patientId) => {
  const response = await client.post(`/api/adaptive/annotations/${encodeURIComponent(patientId)}/undo`);
  return response.data;
};

export const redoEdit = async (patientId) => {
  const response = await client.post(`/api/adaptive/annotations/${encodeURIComponent(patientId)}/redo`);
  return response.data;
};

export const clearEdits = async (patientId) => {
  const response = await client.post(`/api/adaptive/annotations/${encodeURIComponent(patientId)}/clear`);
  return response.data;
};

export const saveDraft = async (patientId, annotatorId = 'radiologist_user', notes = '') => {
  const response = await client.post(`/api/adaptive/annotations/${encodeURIComponent(patientId)}/draft`, {
    patient_id: patientId,
    annotator_id: annotatorId,
    notes,
  });
  return response.data;
};

export const submitForReview = async (patientId, annotatorId = 'radiologist_user', notes = '') => {
  const response = await client.post(`/api/adaptive/annotations/${encodeURIComponent(patientId)}/submit`, {
    patient_id: patientId,
    annotator_id: annotatorId,
    notes,
  });
  return response.data;
};

export const reviewDecision = async (patientId, decision, reviewerId = 'chief_radiologist', reason = '') => {
  const response = await client.post(`/api/adaptive/annotations/${encodeURIComponent(patientId)}/review`, {
    decision,
    reviewer_id: reviewerId,
    reason,
  });
  return response.data;
};

export const compareMasks = async (patientId) => {
  const response = await client.get(`/api/adaptive/annotations/${encodeURIComponent(patientId)}/compare`);
  return response.data;
};

export const getDatasetStats = async () => {
  const response = await client.get('/api/adaptive/dataset/stats');
  return response.data;
};

export const ingestApproved = async () => {
  const response = await client.post('/api/adaptive/dataset/ingest-approved');
  return response.data;
};

export const getTrainingStatus = async () => {
  const response = await client.get('/api/adaptive/training/status');
  return response.data;
};

export const startTraining = async (epochs = 2, learningRate = 0.0001, candidateTag = null, notes = null) => {
  const response = await client.post('/api/adaptive/training/start', {
    epochs: Number(epochs),
    learning_rate: Number(learningRate),
    candidate_tag: candidateTag || null,
    notes: notes || null,
  });
  return response.data;
};

export const getModelRegistry = async () => {
  const response = await client.get('/api/adaptive/models/registry');
  return response.data;
};

export const evaluateCandidate = async (candidateId) => {
  const response = await client.post(`/api/adaptive/models/${encodeURIComponent(candidateId)}/evaluate`);
  return response.data;
};

export const promoteCandidate = async (candidateId, approvedBy = 'lead_ml_engineer', rationale = '') => {
  const response = await client.post(`/api/adaptive/models/${encodeURIComponent(candidateId)}/promote`, {
    candidate_id: candidateId,
    approved_by: approvedBy,
    rationale,
  });
  return response.data;
};

export const rollbackModel = async (targetModelId, reason = 'Operator requested rollback') => {
  const response = await client.post('/api/adaptive/models/rollback', {
    target_model_id: targetModelId,
    reason,
  });
  return response.data;
};

export const seedDemoSample = async () => {
  const response = await client.post('/api/adaptive/demo/seed-sample');
  return response.data;
};
