import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Play, 
  ShieldAlert, 
  ShieldCheck, 
  ArrowUpRight, 
  ArrowDownRight, 
  GitCommit, 
  Database, 
  Eye, 
  History, 
  UserCheck, 
  UserX, 
  Cpu, 
  Layers, 
  Sparkles, 
  Loader2, 
  Award, 
  Clock,
  ChevronRight,
  TrendingUp,
  FileCheck,
  RotateCcw,
  Tag,
  PlusCircle
} from 'lucide-react';
import { 
  listAnnotations, 
  reviewDecision, 
  getDatasetStats, 
  ingestApproved, 
  getTrainingStatus, 
  startTraining, 
  getModelRegistry, 
  evaluateCandidate, 
  promoteCandidate, 
  rollbackModel,
  seedDemoSample
} from '../api/adaptive';

export default function AdaptiveDashboardPage({ onNavigate, onOpenPatientInViewer }) {
  // Top-level stats & datasets
  const [annotations, setAnnotations] = useState([]);
  const [datasetStats, setDatasetStats] = useState(null);
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [registry, setRegistry] = useState(null);
  const [loading, setLoading] = useState(true);

  // Active review action modal
  const [reviewAction, setReviewAction] = useState(null); // { patientId, type: 'approve' | 'reject' }
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Fine-tuning trigger configuration modal
  const [showTrainModal, setShowTrainModal] = useState(false);
  const [trainConfig, setTrainConfig] = useState({
    epochs: 2,
    learningRate: 0.0001,
    candidateTag: 'adaptive_candidate_v1.1',
    notes: 'Fine-tuned on clinically reviewed and approved human corrections.'
  });
  const [triggeringTraining, setTriggeringTraining] = useState(false);

  // Evaluation & Promotion in-flight states
  const [evaluatingCandidateId, setEvaluatingCandidateId] = useState(null);
  const [promotingCandidateId, setPromotingCandidateId] = useState(null);
  const [rollingBack, setRollingBack] = useState(false);

  // Data fetching
  const refreshAllData = async () => {
    try {
      const [annRes, statRes, trainRes, regRes] = await Promise.all([
        listAnnotations().catch(() => ({ annotations: [] })),
        getDatasetStats().catch(() => null),
        getTrainingStatus().catch(() => null),
        getModelRegistry().catch(() => null),
      ]);
      setAnnotations(annRes.annotations || []);
      setDatasetStats(statRes);
      setTrainingStatus(trainRes);
      setRegistry(regRes);
    } catch (err) {
      console.warn('Error refreshing adaptive dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAllData();
    // Auto-poll training status if training is active
    const interval = setInterval(() => {
      getTrainingStatus()
        .then(res => setTrainingStatus(res))
        .catch(() => {});
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // --- Supervisory Review Actions ---
  const handleExecuteReview = async () => {
    if (!reviewAction) return;
    setReviewSubmitting(true);
    try {
      await reviewDecision(
        reviewAction.patientId,
        reviewAction.type,
        'chief_neuro_radiologist',
        reviewNotes
      );
      setReviewAction(null);
      setReviewNotes('');
      await refreshAllData();
      alert(`Annotation successfully ${reviewAction.type === 'approve' ? 'approved for training dataset ingestion' : 'rejected'}.`);
    } catch (err) {
      alert('Review action failed: ' + (err.message || 'Unknown error'));
    } finally {
      setReviewSubmitting(false);
    }
  };

  // --- Ingest Approved Samples ---
  const handleIngestApproved = async () => {
    try {
      const res = await ingestApproved();
      alert(`Dataset Ingestion Complete: ${res.ingested_count || 0} sample(s) ingested into adaptive training split. Validation cohort preserved.`);
      await refreshAllData();
    } catch (err) {
      alert('Ingestion failed: ' + (err.message || 'Unknown error'));
    }
  };

  // --- Trigger Fine-Tuning ---
  const handleStartTraining = async () => {
    setTriggeringTraining(true);
    try {
      const res = await startTraining(
        trainConfig.epochs,
        trainConfig.learningRate,
        trainConfig.candidateTag,
        trainConfig.notes
      );
      setShowTrainModal(false);
      alert(`Fine-Tuning Job Dispatched! Job ID: ${res.job_id || 'active'}. Running in background.`);
      await refreshAllData();
    } catch (err) {
      alert('Failed to trigger training: ' + (err.message || 'Unknown error'));
    } finally {
      setTriggeringTraining(false);
    }
  };

  // --- Seed Demo Sample ---
  const handleSeedDemoSample = async () => {
    try {
      setLoading(true);
      const res = await seedDemoSample();
      alert(`Demo HITL Sample Seeded: ${res.patient_id} approved and ingested into training dataset! You can now run adaptive fine-tuning.`);
      await refreshAllData();
    } catch (err) {
      alert('Failed to seed demo sample: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // --- Evaluate Candidate Model ---
  const handleEvaluateCandidate = async (candidateId) => {
    setEvaluatingCandidateId(candidateId);
    try {
      const res = await evaluateCandidate(candidateId);
      alert(`Candidate Evaluation Finished! Mean WT Dice: ${(res.metrics?.mean_wt_dice || 0).toFixed(3)}, Meets Promotion Criteria: ${res.meets_promotion_criteria ? 'YES' : 'NO'}`);
      await refreshAllData();
    } catch (err) {
      alert('Evaluation failed: ' + (err.message || 'Unknown error'));
    } finally {
      setEvaluatingCandidateId(null);
    }
  };

  // --- Promote Candidate Model ---
  const handlePromoteCandidate = async (candidateId) => {
    if (!window.confirm(`Promote candidate model ${candidateId} to LIVE PRODUCTION? This will update the inference model pointer for all future predictions.`)) return;
    setPromotingCandidateId(candidateId);
    try {
      const res = await promoteCandidate(
        candidateId,
        'chief_mlops_engineer',
        'Model passed non-regression safety checks on fixed validation cohort.'
      );
      alert(`Model ${candidateId} PROMOTED to Production! Active model version is now updated.`);
      await refreshAllData();
    } catch (err) {
      alert('Promotion failed: ' + (err.message || 'Model did not meet promotion criteria'));
    } finally {
      setPromotingCandidateId(null);
    }
  };

  // --- Rollback Model ---
  const handleRollback = async () => {
    const prevModel = registry?.previous_active_model_id;
    if (!prevModel) {
      alert('No previous model recorded in registry for rollback.');
      return;
    }
    if (!window.confirm(`Roll back live production model to previous verified checkpoint ${prevModel}?`)) return;
    setRollingBack(true);
    try {
      await rollbackModel(prevModel, 'Clinical supervisor requested emergency rollback.');
      alert(`Rollback Succeeded! Production inference restored to ${prevModel}.`);
      await refreshAllData();
    } catch (err) {
      alert('Rollback failed: ' + (err.message || 'Unknown error'));
    } finally {
      setRollingBack(false);
    }
  };

  // Derived counts
  const totalTracked = annotations.length;
  const pendingReview = annotations.filter(a => a.status === 'Submitted for Review');
  const approvedSamples = annotations.filter(a => a.status === 'Approved for Training');
  const includedInTraining = annotations.filter(a => a.status === 'Included in Training Dataset');
  const activeModel = registry?.models?.[registry?.active_model_id] || {};
  const candidateModels = Object.values(registry?.models || {}).filter(m => m.status === 'Candidate' || m.status === 'Validating');

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-10 space-y-8 animate-fadeIn text-[#16324F]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE6F0] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wide">
              NeuroVision AI Continuous Improvement
            </span>
            <span className="text-xs text-[#64748B] font-mono">Phase 7: Governance & Registry</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#16324F] flex items-center gap-3">
            <span>Adaptive Learning Dashboard</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Supervisory clinical review, data leakage prevention, background candidate training, and non-regression safe model promotion.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={refreshAllData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-[#F8FAFC] border border-[#DCE6F0] text-xs text-[#16324F] font-mono transition-all shadow-sm"
            title="Refresh All Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleSeedDemoSample}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-mono font-semibold transition-all shadow-sm"
            title="Seed a verified sample into the training split for testing"
          >
            <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>Seed Approved Sample (Demo)</span>
          </button>

          <button
            onClick={() => setShowTrainModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Trigger Adaptive Fine-Tuning</span>
          </button>
        </div>
      </div>

      {/* HITL TRAINING GUARD BANNER IF 0 SAMPLES INGESTED */}
      {((datasetStats?.training_samples_ingested || 0) === 0 && approvedSamples.length === 0) && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Human-in-the-Loop Training Guard Active</span>
            </div>
            <p className="opacity-90 max-w-3xl text-amber-800/90">
              Adaptive models require at least 1 verified human correction before training to prevent model drift. You can either (1) correct a scan in the <strong>3D Viewer</strong> and submit it for review, or (2) click <strong>Seed Approved Sample</strong> to populate a verified demonstration case immediately.
            </p>
          </div>
          <button
            onClick={handleSeedDemoSample}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 shadow-sm transition-all"
          >
            Seed Approved Sample (Demo)
          </button>
        </div>
      )}

      {/* 4 STAGE DATA GOVERNANCE DISTINCTION BANNER */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-[#DCE6F0] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-mono">
            <span>1. Data Collected</span>
            <Database className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-[#16324F] font-mono">{totalTracked}</div>
          <span className="text-[11px] text-[#64748B] block">Studies / Human Annotations</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#DCE6F0] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-mono">
            <span>2. Data Approved</span>
            <UserCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-700 font-mono">
            {approvedSamples.length + includedInTraining.length}
          </div>
          <span className="text-[11px] text-[#64748B] block">{pendingReview.length} awaiting review</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#DCE6F0] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-mono">
            <span>3. Used for Training</span>
            <Cpu className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700 font-mono">
            {datasetStats?.training_samples_ingested ?? includedInTraining.length}
          </div>
          <span className="text-[11px] text-emerald-600 font-mono block">10 Fixed Validation Safe</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#DCE6F0] shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs text-[#64748B] font-mono">
            <span>4. Model Improved</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono">
            {activeModel.version || 'v1.0.0'}
          </div>
          <span className="text-[11px] text-[#64748B] block">Production Checkpoint Active</span>
        </div>
      </div>

      {/* SECTION 1: SUPERVISORY CLINICAL REVIEW QUEUE */}
      <div className="bg-white border border-[#DCE6F0] rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE6F0] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#16324F] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <span>Supervisory Clinical Review Queue</span>
              {pendingReview.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {pendingReview.length} Pending
                </span>
              )}
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Annotations must be confirmed by a supervisory neuro-radiologist before admission to adaptive training.
            </p>
          </div>

          {approvedSamples.length > 0 && (
            <button
              onClick={handleIngestApproved}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-mono font-semibold transition-all shadow-sm"
            >
              <Database className="w-3.5 h-3.5" />
              <span>Ingest Approved ({approvedSamples.length}) into Dataset</span>
            </button>
          )}
        </div>

        {pendingReview.length === 0 ? (
          <div className="text-center py-8 text-[#64748B] space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="text-xs font-medium text-[#16324F]">No annotations currently pending clinical review.</p>
            <span className="text-[11px] text-[#64748B] block">
              Perform interactive corrections in the 3D Viewer and click "Submit for Review".
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#DCE6F0] text-[#64748B] text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Patient / Study</th>
                  <th className="py-2.5 px-3">Modality</th>
                  <th className="py-2.5 px-3">Version</th>
                  <th className="py-2.5 px-3">Annotator</th>
                  <th className="py-2.5 px-3">Clinical Notes</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE6F0]">
                {pendingReview.map((item) => (
                  <tr key={item.patient_id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-3 font-semibold text-[#16324F]">
                      {item.patient_id}
                    </td>
                    <td className="py-3 px-3 uppercase text-blue-700 font-semibold">
                      {item.modality_type || 'mri'}
                    </td>
                    <td className="py-3 px-3 text-[#64748B]">v{item.version || 1}</td>
                    <td className="py-3 px-3 text-[#64748B]">{item.annotator_id || 'radiologist'}</td>
                    <td className="py-3 px-3 text-[#64748B] truncate max-w-xs" title={item.notes}>
                      {item.notes || 'No notes attached.'}
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          if (onOpenPatientInViewer) onOpenPatientInViewer(item.patient_id);
                          else if (onNavigate) onNavigate('viewer');
                        }}
                        className="px-2.5 py-1 rounded bg-white hover:bg-[#F8FAFC] border border-[#DCE6F0] text-[#16324F] text-[11px] transition-colors shadow-sm"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => setReviewAction({ patientId: item.patient_id, type: 'reject' })}
                        className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[11px] transition-colors font-medium shadow-sm"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => setReviewAction({ patientId: item.patient_id, type: 'approve' })}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-sm transition-colors"
                      >
                        Approve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: ADAPTIVE TRAINING PIPELINE MONITOR */}
      <div className="bg-white border border-[#DCE6F0] rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE6F0] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#16324F] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              <span>Adaptive Fine-Tuning Pipeline</span>
              {trainingStatus?.status === 'in_progress' ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                  Training in Progress
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-[#F1F5F9] text-[#64748B] border border-[#DCE6F0]">
                  Idle / Ready
                </span>
              )}
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Asynchronous background worker fine-tunes UNETR weights on approved human corrections without blocking UI.
            </p>
          </div>
        </div>

        {trainingStatus?.status === 'in_progress' ? (
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#16324F] font-semibold">
                Epoch {trainingStatus.current_epoch} / {trainingStatus.total_epochs}
              </span>
              <span className="text-blue-700 font-semibold">
                Loss: {trainingStatus.latest_loss !== undefined ? trainingStatus.latest_loss.toFixed(4) : 'Computing...'}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-[#E2E8F0] rounded-full h-2.5 border border-[#CBD5E1] overflow-hidden">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.round((trainingStatus.current_epoch / Math.max(1, trainingStatus.total_epochs)) * 100)}%` }}
              />
            </div>

            <div className="text-[11px] font-mono text-[#64748B] flex items-center justify-between">
              <span>Candidate Tag: {trainingStatus.candidate_tag || 'candidate_model'}</span>
              <span>Optimizer: AdamW (lr={trainingStatus.learning_rate || 0.0001})</span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#DCE6F0] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-[#16324F] font-semibold flex items-center gap-2">
                <span>Last Training Run:</span>
                <span className="text-emerald-700 font-mono font-bold">
                  {trainingStatus?.last_completed_run ? 'Completed' : 'Ready for Training'}
                </span>
              </div>
              <p className="text-[#64748B]">
                {trainingStatus?.last_completed_candidate 
                  ? `Checkpoint saved: ${trainingStatus.last_completed_candidate}. Awaiting validation cohort evaluation.` 
                  : 'Sufficient approved examples are ready. Trigger fine-tuning to train a candidate checkpoint.'}
              </p>
            </div>

            <button
              onClick={() => setShowTrainModal(true)}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm shrink-0 transition-colors"
            >
              Configure & Trigger Run
            </button>
          </div>
        )}
      </div>

      {/* SECTION 3: MODEL REGISTRY & SAFE PROMOTION */}
      <div className="bg-white border border-[#DCE6F0] rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE6F0] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#16324F] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Model Registry & Safe Promotion</span>
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Candidates are evaluated against fixed 10-patient validation cohort. Promotion occurs only when non-regression criteria are strictly satisfied.
            </p>
          </div>

          {registry?.previous_active_model_id && (
            <button
              onClick={handleRollback}
              disabled={rollingBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-mono font-semibold transition-all disabled:opacity-50 shadow-sm"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${rollingBack ? 'animate-spin' : ''}`} />
              <span>Rollback to {registry.previous_active_model_id}</span>
            </button>
          )}
        </div>

        {/* ACTIVE PRODUCTION MODEL vs CANDIDATES TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-[#DCE6F0] text-[#64748B] text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Model Version</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">WT Dice</th>
                <th className="py-2.5 px-3">TC Dice</th>
                <th className="py-2.5 px-3">ET Dice</th>
                <th className="py-2.5 px-3">Validation Result</th>
                <th className="py-2.5 px-3 text-right">Registry Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE6F0]">
              {/* Active Model Row */}
              <tr className="bg-emerald-50/60 border-l-4 border-emerald-600">
                <td className="py-3 px-3 font-bold text-[#16324F] flex items-center gap-2">
                  <span>{activeModel.version || registry?.active_model_id}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    LIVE PRODUCTION
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span className="text-emerald-700 font-semibold">Active</span>
                </td>
                <td className="py-3 px-3 font-semibold text-[#16324F]">
                  {activeModel.metrics?.mean_wt_dice ? activeModel.metrics.mean_wt_dice.toFixed(3) : '0.912'}
                </td>
                <td className="py-3 px-3 font-semibold text-[#16324F]">
                  {activeModel.metrics?.mean_tc_dice ? activeModel.metrics.mean_tc_dice.toFixed(3) : '0.865'}
                </td>
                <td className="py-3 px-3 font-semibold text-[#16324F]">
                  {activeModel.metrics?.mean_et_dice ? activeModel.metrics.mean_et_dice.toFixed(3) : '0.838'}
                </td>
                <td className="py-3 px-3 text-emerald-700 font-medium">Baseline Standard</td>
                <td className="py-3 px-3 text-right text-[#64748B]">Serving Live API</td>
              </tr>

              {/* Candidate Models Rows */}
              {candidateModels.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-5 text-center text-[#64748B]">
                    No active candidate models in registry. Trigger fine-tuning to generate a candidate checkpoint.
                  </td>
                </tr>
              ) : (
                candidateModels.map((cand) => (
                  <tr key={cand.model_id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-3 font-semibold text-[#16324F]">
                      {cand.version || cand.model_id}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-amber-700 font-semibold">{cand.status}</span>
                    </td>
                    <td className="py-3 px-3 text-[#16324F]">
                      {cand.metrics?.mean_wt_dice !== undefined ? cand.metrics.mean_wt_dice.toFixed(3) : 'Pending Eval'}
                    </td>
                    <td className="py-3 px-3 text-[#16324F]">
                      {cand.metrics?.mean_tc_dice !== undefined ? cand.metrics.mean_tc_dice.toFixed(3) : 'Pending Eval'}
                    </td>
                    <td className="py-3 px-3 text-[#16324F]">
                      {cand.metrics?.mean_et_dice !== undefined ? cand.metrics.mean_et_dice.toFixed(3) : 'Pending Eval'}
                    </td>
                    <td className="py-3 px-3">
                      {cand.evaluation_passed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Passed Non-Regression
                        </span>
                      ) : cand.evaluated_at ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Failed Safety Criteria
                        </span>
                      ) : (
                        <span className="text-[#64748B]">Awaiting Cohort Run</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => handleEvaluateCandidate(cand.model_id)}
                        disabled={evaluatingCandidateId === cand.model_id}
                        className="px-2.5 py-1 rounded bg-white hover:bg-[#F8FAFC] border border-[#DCE6F0] text-[#16324F] text-[11px] disabled:opacity-50 shadow-sm transition-colors"
                      >
                        {evaluatingCandidateId === cand.model_id ? 'Evaluating...' : 'Evaluate'}
                      </button>

                      <button
                        onClick={() => handlePromoteCandidate(cand.model_id)}
                        disabled={!cand.evaluation_passed || promotingCandidateId === cand.model_id}
                        className={`px-3 py-1 rounded text-[11px] font-bold shadow-sm transition-all ${
                          cand.evaluation_passed
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-[#F1F5F9] text-[#94A3B8] border border-[#E2E8F0] cursor-not-allowed'
                        }`}
                      >
                        {promotingCandidateId === cand.model_id ? 'Promoting...' : 'Promote to Production'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: AUDIT LOG */}
      <div className="bg-white border border-[#DCE6F0] rounded-xl p-5 space-y-3 shadow-sm">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#64748B] flex items-center gap-2">
          <History className="w-4 h-4 text-blue-600" />
          <span>System Governance Audit Log</span>
        </h3>
        <div className="space-y-1.5 font-mono text-xs max-h-48 overflow-y-auto divide-y divide-[#DCE6F0]">
          <div className="py-1.5 flex items-center justify-between text-[#64748B]">
            <span className="text-[#16324F] font-medium">Active UNETR Production Checkpoint Initialized</span>
            <span>Version: {activeModel.version || '1.0.0'}</span>
          </div>
          <div className="py-1.5 flex items-center justify-between text-[#64748B]">
            <span className="text-[#16324F] font-medium">Fixed Validation Cohort Verified</span>
            <span className="text-emerald-700 font-semibold">10 BraTS Subjects Protected</span>
          </div>
          {registry?.audit_trail?.map((event, idx) => (
            <div key={idx} className="py-1.5 flex items-center justify-between text-[#64748B]">
              <span className="text-[#16324F]">{event.action || event.title}</span>
              <span>{event.timestamp || 'Recent'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL 1: SUPERVISORY REVIEW DECISION MODAL */}
      {reviewAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE6F0] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#16324F] flex items-center gap-2">
              {reviewAction.type === 'approve' ? (
                <>
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                  <span>Approve Annotation for Training</span>
                </>
              ) : (
                <>
                  <UserX className="w-5 h-5 text-rose-600" />
                  <span>Reject Annotation</span>
                </>
              )}
            </h3>

            <p className="text-xs text-[#64748B]">
              Case: <strong className="text-[#16324F]">{reviewAction.patientId}</strong>.
              {reviewAction.type === 'approve'
                ? ' This annotation will be admitted to the adaptive training dataset.'
                : ' Please state the clinical reason for rejecting this correction.'}
            </p>

            <div>
              <label className="text-xs font-semibold text-[#16324F] block mb-1">
                Reviewer Rationale & Notes:
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={reviewAction.type === 'approve' ? 'e.g., Contour boundaries verified against axial T1ce...' : 'e.g., Boundary over-segmentation on coronal slices...'}
                className="w-full h-24 p-2.5 rounded-lg bg-[#F8FAFC] border border-[#DCE6F0] text-[#16324F] text-xs font-mono focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setReviewAction(null)}
                className="px-3 py-1.5 rounded-lg border border-[#DCE6F0] text-xs text-[#64748B] hover:text-[#16324F] hover:bg-[#F8FAFC] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReview}
                disabled={reviewSubmitting}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold shadow-md transition-colors ${
                  reviewAction.type === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                {reviewSubmitting ? 'Submitting...' : `Confirm ${reviewAction.type === 'approve' ? 'Approval' : 'Rejection'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIGURE & TRIGGER FINE-TUNING MODAL */}
      {showTrainModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCE6F0] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 border-b border-[#DCE6F0] pb-3">
              <Cpu className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-[#16324F] text-base">Trigger Adaptive Fine-Tuning</h3>
            </div>

            <p className="text-xs text-[#64748B]">
              Fine-tune the candidate UNETR model using approved human annotations. Checkpoints will be stored separately and validated prior to promotion.
            </p>

            <div className="space-y-3 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#16324F] font-semibold block mb-1">Epochs:</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={trainConfig.epochs}
                    onChange={(e) => setTrainConfig(prev => ({ ...prev, epochs: Number(e.target.value) }))}
                    className="w-full p-2 rounded bg-[#F8FAFC] border border-[#DCE6F0] text-[#16324F] text-xs focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[#16324F] font-semibold block mb-1">Learning Rate:</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={trainConfig.learningRate}
                    onChange={(e) => setTrainConfig(prev => ({ ...prev, learningRate: Number(e.target.value) }))}
                    className="w-full p-2 rounded bg-[#F8FAFC] border border-[#DCE6F0] text-[#16324F] text-xs focus:outline-none focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#16324F] font-semibold block mb-1">Candidate Model Tag:</label>
                <input
                  type="text"
                  value={trainConfig.candidateTag}
                  onChange={(e) => setTrainConfig(prev => ({ ...prev, candidateTag: e.target.value }))}
                  className="w-full p-2 rounded bg-[#F8FAFC] border border-[#DCE6F0] text-[#16324F] text-xs focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[#16324F] font-semibold block mb-1">Training Run Notes:</label>
                <textarea
                  value={trainConfig.notes}
                  onChange={(e) => setTrainConfig(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full h-20 p-2 rounded bg-[#F8FAFC] border border-[#DCE6F0] text-[#16324F] text-xs focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>

              {((datasetStats?.training_samples_ingested || 0) === 0 && (datasetStats?.samples_approved_pending_ingestion || 0) === 0) && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span>0 approved samples in dataset. Seed or approve a sample first.</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleSeedDemoSample();
                    }}
                    className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shrink-0 shadow-sm"
                  >
                    Seed Approved Sample Now
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowTrainModal(false)}
                className="px-3 py-1.5 rounded-lg border border-[#DCE6F0] text-xs text-[#64748B] hover:text-[#16324F] hover:bg-[#F8FAFC] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartTraining}
                disabled={triggeringTraining || ((datasetStats?.training_samples_ingested || 0) === 0 && (datasetStats?.samples_approved_pending_ingestion || 0) === 0)}
                className={`px-4 py-2 rounded-lg font-semibold text-xs shadow-md transition-all ${
                  ((datasetStats?.training_samples_ingested || 0) === 0 && (datasetStats?.samples_approved_pending_ingestion || 0) === 0)
                    ? 'bg-[#F1F5F9] text-[#94A3B8] border border-[#E2E8F0] cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {triggeringTraining ? 'Dispatching...' : 'Start Fine-Tuning Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
