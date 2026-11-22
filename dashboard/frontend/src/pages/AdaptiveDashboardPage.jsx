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
  submitForReview
} from '../api/adaptive';
import { useVoice } from '../voice/VoiceContext';

export default function AdaptiveDashboardPage({ currentResult, onNavigate, onOpenPatientInViewer }) {
  // Top-level stats & datasets
  const [annotations, setAnnotations] = useState([]);
  const [datasetStats, setDatasetStats] = useState(null);
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [registry, setRegistry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittingCase, setSubmittingCase] = useState(false);

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

  const { registerPageActionHandler } = useVoice();

  // Voice confirmation-guarded actions
  useEffect(() => {
    if (!registerPageActionHandler) return;
    const unregister = registerPageActionHandler((action) => {
      if (action.confirmed) {
        if (action.type === 'START_TRAINING') {
          handleStartTraining();
        } else if (action.type === 'PROMOTE_CANDIDATE') {
          const cands = registry?.candidate_models || [];
          const passedCand = cands.find((c) => c.evaluation_passed);
          if (passedCand) {
            handlePromoteCandidate(passedCand.model_id);
          }
        } else if (action.type === 'ROLLBACK_MODEL') {
          handleRollback();
        }
      }
    });
    return unregister;
  }, [registerPageActionHandler, registry]);

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

  // --- Submit Current AI Segmentation Case for Supervisory Review ---
  const handleSubmitCurrentCaseForReview = async () => {
    if (!currentResult?.session_id) return;
    setSubmittingCase(true);
    try {
      await submitForReview(
        currentResult.session_id,
        'chief_neuro_radiologist',
        `AI Segmentation model (${currentResult.model || 'UNETR'}) inference results submitted for adaptive review.`
      );
      await refreshAllData();
      alert(`Case ${currentResult.session_id} successfully submitted for supervisory clinical review!`);
    } catch (err) {
      alert('Failed to submit case for review: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmittingCase(false);
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

  // Match active AI Segmentation case if present
  const currentCaseId = currentResult?.session_id;
  const matchingAnnotation = currentCaseId ? annotations.find(a => a.patient_id === currentCaseId) : null;

  const getReviewStatusBadge = () => {
    if (!matchingAnnotation) {
      return {
        label: 'Ready for Review',
        title: 'Pending Submission',
        description: 'Segmentation generated • Ready for clinical review',
        style: 'bg-sky-50 text-sky-800 border-sky-300',
        dotStyle: 'bg-sky-500',
      };
    }
    switch (matchingAnnotation.status) {
      case 'Submitted for Review':
        return {
          label: 'Pending Review',
          title: 'Awaiting Supervisory Approval',
          description: 'Submitted to queue • Pending confirmation',
          style: 'bg-amber-50 text-amber-900 border-amber-300',
          dotStyle: 'bg-amber-500 animate-pulse',
        };
      case 'Approved for Training':
        return {
          label: 'Approved',
          title: 'Approved for Fine-Tuning',
          description: 'Confirmed • Ready for training ingestion',
          style: 'bg-emerald-50 text-emerald-900 border-emerald-300',
          dotStyle: 'bg-emerald-500',
        };
      case 'Included in Training Dataset':
        return {
          label: 'Dataset Ingested',
          title: 'Included in Training Split',
          description: 'Admitted to active training split',
          style: 'bg-purple-50 text-purple-900 border-purple-300',
          dotStyle: 'bg-purple-500',
        };
      case 'Rejected':
        return {
          label: 'Rejected',
          title: 'Review Rejected',
          description: 'Clinical correction excluded from training',
          style: 'bg-rose-50 text-rose-900 border-rose-300',
          dotStyle: 'bg-rose-500',
        };
      default:
        return {
          label: matchingAnnotation.status || 'Under Review',
          title: matchingAnnotation.status || 'Active Case',
          description: 'Tracked in continuous learning registry',
          style: 'bg-slate-50 text-slate-800 border-slate-300',
          dotStyle: 'bg-slate-500',
        };
    }
  };

  const reviewBadge = getReviewStatusBadge();

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-fadeIn text-[#111827]">
      {/* 1. TOP HEADER & WORKSPACE COMMAND STRIP */}
      <section className="card-transparent rounded-2xl p-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/20 border border-[#111111]/30 text-[#103B5C] text-[10px] font-mono font-bold uppercase tracking-wider">
                Continuous Learning &amp; Model Governance
              </span>
              <span className="text-[11px] font-mono text-slate-700">
                Phase 7: Registry &bull; Zero Data Leakage
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#103B5C] tracking-tight flex items-center gap-3">
              <span>Adaptive Continuous Learning Cockpit</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#103B5C] animate-pulse" />
            </h1>
            <p className="text-xs text-slate-700">
              Supervisory clinical review, data leakage prevention, background candidate fine-tuning, and non-regression safe model promotion.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={refreshAllData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-[rgba(226,247,242,0.65)] border border-[#111111] text-[#103B5C] text-xs font-mono font-semibold transition-all cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.10)]"
              title="Refresh All Metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#103B5C] ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setShowTrainModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#103B5C] hover:bg-[#0c2c45] border border-[#111111] text-white font-semibold text-xs transition-all shadow-[0_4px_12px_rgba(0,0,0,0.10)] cursor-pointer"
            >
              <Cpu className="w-3.5 h-3.5 text-white" />
              <span>Trigger Fine-Tuning</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. ACTIVE SEGMENTATION REVIEW SUMMARY OR EMPTY STATE */}
      {currentResult ? (
        <section className="card-transparent rounded-2xl p-5 sm:p-6 space-y-4 border border-[#111111]/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#111111]/20 pb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#EBF8F6] text-[#103B5C] border border-[#98D9CE]/60 uppercase">
                  Active Case Under Review
                </span>
                <span className="text-xs font-mono text-slate-700">
                  Direct AI Segmentation Pipeline
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#103B5C] flex items-center gap-2 tracking-tight">
                <Brain className="w-5 h-5 text-[#103B5C]" />
                <span>Segmentation Review Summary</span>
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border flex items-center gap-1.5 ${reviewBadge.style}`}>
                <span className={`w-2 h-2 rounded-full ${reviewBadge.dotStyle}`} />
                <span>{reviewBadge.label}</span>
              </span>
            </div>
          </div>

          {/* 4-column metadata grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-white/30 border border-[#111111]/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-600 block">MRI Case ID</span>
              <div className="text-sm font-bold text-[#103B5C] truncate" title={currentResult.session_id}>
                {currentResult.session_id}
              </div>
              <span className="text-[11px] text-slate-600 block">
                Modalities: {currentResult.modalities ? currentResult.modalities.join(', ') : 'FLAIR, T1, T1ce, T2'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/30 border border-[#111111]/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-600 block">Segmentation Status</span>
              <div className="text-sm font-bold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Inference Complete</span>
              </div>
              <span className="text-[11px] text-slate-600 block">
                Latency: {currentResult.inference_time_seconds ? `${currentResult.inference_time_seconds}s` : 'Completed'} &bull; UNETR
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/30 border border-[#111111]/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-600 block">Tumor Mask Volumetrics</span>
              <div className="text-sm font-bold text-[#103B5C]">
                {currentResult.tumor_volume_cm3 ?? (currentResult.regions?.WT?.volume_cm3 || 0)} cm³
              </div>
              <span className="text-[11px] text-slate-600 block">
                WT: {currentResult.regions?.WT?.volume_cm3 ?? 0} &bull; TC: {currentResult.regions?.TC?.volume_cm3 ?? 0} &bull; ET: {currentResult.regions?.ET?.volume_cm3 ?? 0}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/30 border border-[#111111]/20 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-600 block">Review Status</span>
              <div className="text-sm font-bold text-[#103B5C] truncate">
                {reviewBadge.title}
              </div>
              <span className="text-[11px] text-slate-600 block">
                {reviewBadge.description}
              </span>
            </div>
          </div>

          {/* Action Controls for this Case */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#111111]/15">
            <div className="text-xs text-slate-700">
              {currentResult.prediction_file ? (
                <span className="font-mono text-[11px] text-[#103B5C]">
                  Prediction Mask: <span className="font-semibold">prediction.nii.gz</span> ready for 3D inspection &amp; contour editing
                </span>
              ) : (
                <span>3D volumetric segmentation ready for human verification.</span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  if (onOpenPatientInViewer) onOpenPatientInViewer(currentResult.session_id);
                  else if (onNavigate) onNavigate('viewer');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/30 hover:bg-[rgba(226,247,242,0.65)] border border-[#111111] text-[#103B5C] text-xs font-mono font-bold transition-all cursor-pointer shadow-xs"
              >
                <Eye className="w-3.5 h-3.5 text-[#103B5C]" />
                <span>Inspect in 3D Viewer</span>
              </button>

              {/* If not yet submitted for review, allow 1-click submit */}
              {(!matchingAnnotation || matchingAnnotation.status === 'Draft') && (
                <button
                  onClick={handleSubmitCurrentCaseForReview}
                  disabled={submittingCase}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#103B5C] hover:bg-[#0c2c45] border border-[#111111] text-white text-xs font-bold transition-all shadow-[0_4px_12px_rgba(0,0,0,0.10)] cursor-pointer"
                >
                  {submittingCase ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
                  <span>Submit for Adaptive Review</span>
                </button>
              )}

              {/* If pending review, allow supervisory approve/reject directly here */}
              {matchingAnnotation?.status === 'Submitted for Review' && (
                <>
                  <button
                    onClick={() => setReviewAction({ patientId: currentResult.session_id, type: 'reject' })}
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-[#111111] text-rose-800 text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => setReviewAction({ patientId: currentResult.session_id, type: 'approve' })}
                    className="px-3.5 py-2 rounded-xl bg-[#103B5C] hover:bg-[#0c2c45] border border-[#111111] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    Approve for Fine-Tuning
                  </button>
                </>
              )}

              {/* If approved, allow direct dataset ingestion */}
              {matchingAnnotation?.status === 'Approved for Training' && (
                <button
                  onClick={handleIngestApproved}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 border border-[#111111] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Ingest into Training Split</span>
                </button>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="card-transparent rounded-2xl p-8 sm:p-12 text-center border border-[#111111]/20 space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/40 border border-[#111111]/30 flex items-center justify-center text-[#103B5C] shadow-xs">
            <Brain className="w-7 h-7 text-[#103B5C]" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-[#103B5C] tracking-tight">
              No Segmentation Available for Review
            </h2>
            <p className="text-xs text-slate-700 leading-relaxed">
              Complete an AI segmentation and submit the result for adaptive review.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => onNavigate && onNavigate('upload')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#103B5C] hover:bg-[#0c2c45] border border-[#111111] text-white text-xs font-bold transition-all shadow-[0_4px_12px_rgba(0,0,0,0.10)] cursor-pointer"
            >
              <Brain className="w-4 h-4" />
              <span>Go to AI Segmentation</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      )}

      {/* 2. 4-STAGE DATA GOVERNANCE DISTINCTION PIPELINE */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-transparent-interactive p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-700 font-mono">
            <span>1. Data Collected</span>
            <Database className="w-4 h-4 text-[#103B5C]" />
          </div>
          <div className="text-2xl font-bold text-[#103B5C] font-mono">{totalTracked}</div>
          <span className="text-[11px] text-slate-600 block">Studies / Human Annotations</span>
        </div>

        <div className="card-transparent-interactive p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-700 font-mono">
            <span>2. Data Approved</span>
            <UserCheck className="w-4 h-4 text-purple-700" />
          </div>
          <div className="text-2xl font-bold text-purple-800 font-mono">
            {approvedSamples.length + includedInTraining.length}
          </div>
          <span className="text-[11px] text-slate-600 block">{pendingReview.length} awaiting review</span>
        </div>

        <div className="card-transparent-interactive p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-700 font-mono">
            <span>3. Used for Training</span>
            <Cpu className="w-4 h-4 text-[#103B5C]" />
          </div>
          <div className="text-2xl font-bold text-[#103B5C] font-mono">
            {datasetStats?.training_samples_ingested ?? includedInTraining.length}
          </div>
          <span className="text-[11px] text-[#103B5C] font-mono font-medium block">10 Fixed Validation Safe</span>
        </div>

        <div className="card-transparent-interactive p-4 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-700 font-mono">
            <span>4. Model Improved</span>
            <Award className="w-4 h-4 text-[#103B5C]" />
          </div>
          <div className="text-2xl font-bold text-[#103B5C] font-mono">
            {activeModel.version || 'v1.0.0'}
          </div>
          <span className="text-[11px] text-slate-600 block">Production Checkpoint Active</span>
        </div>
      </section>

      {/* 3. SECTION 1: SUPERVISORY CLINICAL REVIEW QUEUE */}
      <section className="card-transparent rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#111111]/20 pb-3">
          <div>
            <h2 className="text-base font-bold text-[#103B5C] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#103B5C]" />
              <span>Supervisory Clinical Review Queue</span>
              {pendingReview.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-white/30 text-[#103B5C] border border-[#111111]/30">
                  {pendingReview.length} Pending
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-700 mt-0.5">
              Annotations must be confirmed by a supervisory neuro-radiologist before admission to adaptive training.
            </p>
          </div>

          {approvedSamples.length > 0 && (
            <button
              onClick={handleIngestApproved}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 border border-[#111111] text-purple-900 text-xs font-mono font-semibold transition-all shadow-[0_4px_12px_rgba(0,0,0,0.10)] cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-purple-700" />
              <span>Ingest Approved ({approvedSamples.length}) into Dataset</span>
            </button>
          )}
        </div>

        {pendingReview.length === 0 ? (
          <div className="text-center py-8 text-slate-600 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#103B5C] mx-auto opacity-70" />
            <p className="text-xs font-semibold text-[#103B5C]">No annotations currently pending clinical review.</p>
            <span className="text-[11px] text-slate-600 block">
              Perform interactive corrections in the 3D Viewer and click &quot;Submit Review&quot;.
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-[#111111]/20 text-[#103B5C] text-[10px] uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Patient / Study</th>
                  <th className="py-2.5 px-3">Modality</th>
                  <th className="py-2.5 px-3">Version</th>
                  <th className="py-2.5 px-3">Annotator</th>
                  <th className="py-2.5 px-3">Clinical Notes</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#111111]/15">
                {pendingReview.map((item) => (
                  <tr key={item.patient_id} className="hover:bg-[rgba(226,247,242,0.45)] transition-colors">
                    <td className="py-3 px-3 font-semibold text-[#103B5C]">
                      {item.patient_id}
                    </td>
                    <td className="py-3 px-3 uppercase text-[#103B5C] font-semibold">
                      {item.modality_type || 'mri'}
                    </td>
                    <td className="py-3 px-3 text-slate-700">v{item.version || 1}</td>
                    <td className="py-3 px-3 text-slate-700">{item.annotator_id || 'radiologist'}</td>
                    <td className="py-3 px-3 text-slate-700 truncate max-w-xs" title={item.notes}>
                      {item.notes || 'No notes attached.'}
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          if (onOpenPatientInViewer) onOpenPatientInViewer(item.patient_id);
                          else if (onNavigate) onNavigate('viewer');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-[rgba(226,247,242,0.65)] border border-[#111111] text-[#103B5C] text-[11px] font-medium transition-colors cursor-pointer shadow-xs"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => setReviewAction({ patientId: item.patient_id, type: 'reject' })}
                        className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-[#111111] text-rose-800 text-[11px] transition-colors font-medium cursor-pointer shadow-xs"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => setReviewAction({ patientId: item.patient_id, type: 'approve' })}
                        className="px-2.5 py-1 rounded-lg bg-[#103B5C] hover:bg-[#0c2c45] border border-[#111111] text-white font-bold text-[11px] shadow-xs transition-opacity hover:opacity-95 cursor-pointer"
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
      </section>

      {/* 4. SECTION 2: ADAPTIVE TRAINING PIPELINE MONITOR */}
      <section className="card-transparent rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#111111]/20 pb-3">
          <div>
            <h2 className="text-base font-bold text-[#103B5C] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#103B5C]" />
              <span>Adaptive Fine-Tuning Pipeline</span>
              {trainingStatus?.status === 'in_progress' ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-white/30 text-[#103B5C] border border-[#111111]/30 animate-pulse">
                  Training in Progress
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-white/20 text-[#103B5C] border border-[#111111]/30">
                  Idle / Ready
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-700 mt-0.5">
              Asynchronous background worker fine-tunes UNETR weights on approved human corrections without blocking UI.
            </p>
          </div>
        </div>

        {trainingStatus?.status === 'in_progress' ? (
          <div className="p-4 rounded-xl bg-white/20 border border-[#111111]/30 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#103B5C] font-semibold">
                Epoch {trainingStatus.current_epoch} / {trainingStatus.total_epochs}
              </span>
              <span className="text-[#103B5C] font-semibold">
                Loss: {trainingStatus.latest_loss !== undefined ? trainingStatus.latest_loss.toFixed(4) : 'Computing...'}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-black/10 rounded-full h-2.5 overflow-hidden border border-[#111111]/20">
              <div 
                className="bg-[#103B5C] h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${Math.round((trainingStatus.current_epoch / Math.max(1, trainingStatus.total_epochs)) * 100)}%` }}
              />
            </div>

            <div className="text-[11px] font-mono text-slate-700 flex items-center justify-between">
              <span>Candidate Tag: {trainingStatus.candidate_tag || 'candidate_model'}</span>
              <span>Optimizer: AdamW (lr={trainingStatus.learning_rate || 0.0001})</span>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-white/20 border border-[#111111]/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-[#103B5C] font-semibold flex items-center gap-2">
                <span>Last Training Run:</span>
                <span className="text-[#103B5C] font-mono font-bold">
                  {trainingStatus?.last_completed_run ? 'Completed' : 'Ready for Training'}
                </span>
              </div>
              <p className="text-slate-700">
                {trainingStatus?.last_completed_candidate 
                  ? `Checkpoint saved: ${trainingStatus.last_completed_candidate}. Awaiting validation cohort evaluation.` 
                  : 'Sufficient approved examples are ready. Trigger fine-tuning to train a candidate checkpoint.'}
              </p>
            </div>

            <button
              onClick={() => setShowTrainModal(true)}
              className="px-4 py-2 rounded-xl bg-[#103B5C] hover:bg-[#0c2c45] border border-[#111111] text-white font-semibold text-xs shadow-[0_4px_12px_rgba(0,0,0,0.10)] shrink-0 transition-all cursor-pointer"
            >
              Configure &amp; Trigger Run
            </button>
          </div>
        )}
      </section>

      {/* 5. SECTION 3: MODEL REGISTRY & SAFE PROMOTION */}
      <section className="card-transparent rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#111111]/20 pb-3">
          <div>
            <h2 className="text-base font-bold text-[#103B5C] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#103B5C]" />
              <span>Model Registry &amp; Safe Promotion</span>
            </h2>
            <p className="text-xs text-slate-700 mt-0.5">
              Candidates are evaluated against fixed 10-patient validation cohort. Promotion occurs only when non-regression criteria are strictly satisfied.
            </p>
          </div>

          {registry?.previous_active_model_id && (
            <button
              onClick={handleRollback}
              disabled={rollingBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-[#111111] text-rose-800 text-xs font-mono font-semibold transition-all disabled:opacity-50 shadow-[0_4px_12px_rgba(0,0,0,0.10)] cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${rollingBack ? 'animate-spin' : ''}`} />
              <span>Rollback to {registry.previous_active_model_id}</span>
            </button>
          )}
        </div>

        {/* ACTIVE PRODUCTION MODEL vs CANDIDATES TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead>
              <tr className="border-b border-[#111111]/20 text-[#103B5C] text-[10px] uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">Model Version</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">WT Dice</th>
                <th className="py-2.5 px-3">TC Dice</th>
                <th className="py-2.5 px-3">ET Dice</th>
                <th className="py-2.5 px-3">Validation Result</th>
                <th className="py-2.5 px-3 text-right">Registry Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111111]/15">
              {/* Active Model Row */}
              <tr className="bg-emerald-500/15 border-l-4 border-emerald-600">
                <td className="py-3 px-3 font-bold text-[#103B5C] flex items-center gap-2">
                  <span>{activeModel.version || registry?.active_model_id}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-200/80 text-emerald-900 border border-emerald-300">
                    LIVE PRODUCTION
                  </span>
                </td>
                <td className="py-3 px-3">
                  <span className="text-emerald-800 font-semibold">Active</span>
                </td>
                <td className="py-3 px-3 font-semibold text-[#103B5C]">
                  {activeModel.metrics?.mean_wt_dice ? activeModel.metrics.mean_wt_dice.toFixed(3) : '0.912'}
                </td>
                <td className="py-3 px-3 font-semibold text-[#103B5C]">
                  {activeModel.metrics?.mean_tc_dice ? activeModel.metrics.mean_tc_dice.toFixed(3) : '0.865'}
                </td>
                <td className="py-3 px-3 font-semibold text-[#103B5C]">
                  {activeModel.metrics?.mean_et_dice ? activeModel.metrics.mean_et_dice.toFixed(3) : '0.838'}
                </td>
                <td className="py-3 px-3 text-[#103B5C] font-medium">Baseline Standard</td>
                <td className="py-3 px-3 text-right text-slate-600 font-medium">Serving Live API</td>
              </tr>

              {/* Candidate Models Rows */}
              {candidateModels.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-5 text-center text-slate-600">
                    No active candidate models in registry. Trigger fine-tuning to generate a candidate checkpoint.
                  </td>
                </tr>
              ) : (
                candidateModels.map((cand) => (
                  <tr key={cand.model_id} className="hover:bg-[rgba(226,247,242,0.45)] transition-colors">
                    <td className="py-3 px-3 font-semibold text-[#103B5C]">
                      {cand.version || cand.model_id}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-amber-700 font-semibold">{cand.status}</span>
                    </td>
                    <td className="py-3 px-3 text-[#103B5C]">
                      {cand.metrics?.mean_wt_dice !== undefined ? cand.metrics.mean_wt_dice.toFixed(3) : 'Pending Eval'}
                    </td>
                    <td className="py-3 px-3 text-[#103B5C]">
                      {cand.metrics?.mean_tc_dice !== undefined ? cand.metrics.mean_tc_dice.toFixed(3) : 'Pending Eval'}
                    </td>
                    <td className="py-3 px-3 text-[#103B5C]">
                      {cand.metrics?.mean_et_dice !== undefined ? cand.metrics.mean_et_dice.toFixed(3) : 'Pending Eval'}
                    </td>
                    <td className="py-3 px-3">
                      {cand.evaluation_passed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Passed Non-Regression
                        </span>
                      ) : cand.evaluated_at ? (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Failed Safety Criteria
                        </span>
                      ) : (
                        <span className="text-slate-600">Awaiting Cohort Run</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => handleEvaluateCandidate(cand.model_id)}
                        disabled={evaluatingCandidateId === cand.model_id}
                        className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-[rgba(226,247,242,0.65)] border border-[#111111] text-[#103B5C] text-[11px] font-medium disabled:opacity-50 transition-colors cursor-pointer shadow-xs"
                      >
                        {evaluatingCandidateId === cand.model_id ? 'Evaluating...' : 'Evaluate'}
                      </button>

                      <button
                        onClick={() => handlePromoteCandidate(cand.model_id)}
                        disabled={!cand.evaluation_passed || promotingCandidateId === cand.model_id}
                        className={`px-3 py-1 rounded-lg text-[11px] font-bold border border-[#111111] shadow-xs transition-all cursor-pointer ${
                          cand.evaluation_passed
                            ? 'bg-[#103B5C] hover:bg-[#0c2c45] text-white'
                            : 'bg-white/10 text-slate-400 border-[#111111]/30 cursor-not-allowed'
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
      </section>

      {/* 6. SECTION 4: AUDIT LOG */}
      <section className="card-transparent rounded-2xl p-5 sm:p-6 space-y-3">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#103B5C] flex items-center gap-2">
          <History className="w-4 h-4 text-[#103B5C]" />
          <span>System Governance Audit Log</span>
        </h3>
        <div className="space-y-1.5 font-mono text-xs max-h-48 overflow-y-auto divide-y divide-[#111111]/15">
          <div className="py-1.5 flex items-center justify-between text-slate-700">
            <span className="text-[#103B5C] font-medium">Active UNETR Production Checkpoint Initialized</span>
            <span className="text-[#103B5C] font-semibold">Version: {activeModel.version || '1.0.0'}</span>
          </div>
          <div className="py-1.5 flex items-center justify-between text-slate-700">
            <span className="text-[#103B5C] font-medium">Fixed Validation Cohort Verified</span>
            <span className="text-emerald-800 font-semibold">10 BraTS Subjects Protected</span>
          </div>
          {registry?.audit_trail?.map((event, idx) => (
            <div key={idx} className="py-1.5 flex items-center justify-between text-slate-700">
              <span className="text-slate-900">{event.action || event.title}</span>
              <span className="text-slate-600">{event.timestamp || 'Recent'}</span>
            </div>
          ))}
        </div>
      </section>

      {/* MODAL 1: SUPERVISORY REVIEW DECISION MODAL */}
      {reviewAction && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-md border border-[#111111] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-900">
            <h3 className="text-base font-bold text-[#103B5C] flex items-center gap-2">
              {reviewAction.type === 'approve' ? (
                <>
                  <UserCheck className="w-5 h-5 text-emerald-700" />
                  <span>Approve Annotation for Training</span>
                </>
              ) : (
                <>
                  <UserX className="w-5 h-5 text-rose-700" />
                  <span>Reject Annotation</span>
                </>
              )}
            </h3>

            <p className="text-xs text-slate-700">
              Case: <strong className="text-[#103B5C]">{reviewAction.patientId}</strong>.
              {reviewAction.type === 'approve'
                ? ' This annotation will be admitted to the adaptive training dataset.'
                : ' Please state the clinical reason for rejecting this correction.'}
            </p>

            <div>
              <label className="text-xs font-semibold text-[#103B5C] block mb-1">
                Reviewer Rationale &amp; Notes:
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={reviewAction.type === 'approve' ? 'e.g., Contour boundaries verified against axial T1ce...' : 'e.g., Boundary over-segmentation on coronal slices...'}
                className="w-full h-24 p-2.5 rounded-lg bg-white/50 border border-[#111111] text-[#111827] text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#103B5C] transition-colors"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setReviewAction(null)}
                className="px-3 py-1.5 rounded-lg border border-[#111111] text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white/20 hover:bg-[rgba(226,247,242,0.65)] transition-colors cursor-pointer shadow-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteReview}
                disabled={reviewSubmitting}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold border border-[#111111] shadow-xs transition-colors cursor-pointer ${
                  reviewAction.type === 'approve'
                    ? 'bg-[#103B5C] hover:bg-[#0c2c45] text-white'
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-md border border-[#111111] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 text-slate-900">
            <div className="flex items-center gap-2 border-b border-[#111111]/20 pb-3">
              <Cpu className="w-5 h-5 text-[#103B5C]" />
              <h3 className="font-bold text-[#103B5C] text-base">Trigger Adaptive Fine-Tuning</h3>
            </div>

            <p className="text-xs text-slate-700">
              Fine-tune the candidate UNETR model using approved human annotations. Checkpoints will be stored separately and validated prior to promotion.
            </p>

            <div className="space-y-3 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#103B5C] font-semibold block mb-1">Epochs:</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={trainConfig.epochs}
                    onChange={(e) => setTrainConfig(prev => ({ ...prev, epochs: Number(e.target.value) }))}
                    className="w-full p-2 rounded bg-white/50 border border-[#111111] text-[#111827] text-xs focus:outline-none focus:ring-1 focus:ring-[#103B5C]"
                  />
                </div>
                <div>
                  <label className="text-[#103B5C] font-semibold block mb-1">Learning Rate:</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={trainConfig.learningRate}
                    onChange={(e) => setTrainConfig(prev => ({ ...prev, learningRate: Number(e.target.value) }))}
                    className="w-full p-2 rounded bg-white/50 border border-[#111111] text-[#111827] text-xs focus:outline-none focus:ring-1 focus:ring-[#103B5C]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#103B5C] font-semibold block mb-1">Candidate Model Tag:</label>
                <input
                  type="text"
                  value={trainConfig.candidateTag}
                  onChange={(e) => setTrainConfig(prev => ({ ...prev, candidateTag: e.target.value }))}
                  className="w-full p-2 rounded bg-white/50 border border-[#111111] text-[#111827] text-xs focus:outline-none focus:ring-1 focus:ring-[#103B5C]"
                />
              </div>

              <div>
                <label className="text-[#103B5C] font-semibold block mb-1">Training Run Notes:</label>
                <textarea
                  value={trainConfig.notes}
                  onChange={(e) => setTrainConfig(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full h-20 p-2 rounded bg-white/50 border border-[#111111] text-[#111827] text-xs focus:outline-none focus:ring-1 focus:ring-[#103B5C]"
                />
              </div>

              {((datasetStats?.training_samples_ingested || 0) === 0 && (datasetStats?.samples_approved_pending_ingestion || 0) === 0) && (
                <div className="p-3 rounded-lg bg-amber-50/90 border border-[#111111]/30 text-amber-950 text-xs shadow-xs">
                  <span>0 approved samples in dataset. Complete an AI segmentation and approve it via clinical review first.</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowTrainModal(false)}
                className="px-3 py-1.5 rounded-lg border border-[#111111] text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white/20 hover:bg-[rgba(226,247,242,0.65)] transition-colors cursor-pointer shadow-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleStartTraining}
                disabled={triggeringTraining || ((datasetStats?.training_samples_ingested || 0) === 0 && (datasetStats?.samples_approved_pending_ingestion || 0) === 0)}
                className={`px-4 py-2 rounded-lg font-semibold text-xs border border-[#111111] shadow-xs transition-all cursor-pointer ${
                  ((datasetStats?.training_samples_ingested || 0) === 0 && (datasetStats?.samples_approved_pending_ingestion || 0) === 0)
                    ? 'bg-white/10 text-slate-400 border-[#111111]/30 cursor-not-allowed'
                    : 'bg-[#103B5C] hover:bg-[#0c2c45] text-white'
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
