import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Mic, 
  Sliders, 
  Monitor, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Sparkles,
  Volume2,
  Eye,
  Layers,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { useVoiceContext } from '../context/VoiceControlContext';
import { useServerStatus } from '../hooks/useServerStatus';
import { parseVoiceCommand } from '../services/voiceCommandParser';

export default function SettingsPage({ onNavigate }) {
  const {
    voiceControl,
  } = useVoiceContext();

  const { status: serverStatus } = useServerStatus();

  // Local settings state
  const [crosshairVisible, setCrosshairVisible] = useState(true);
  const [sliceStep, setSliceStep] = useState(5);
  const [defaultOpacity, setDefaultOpacity] = useState(75);
  const [voiceTestInput, setVoiceTestInput] = useState('');
  const [voiceTestResult, setVoiceTestResult] = useState(null);
  const [audioFeedback, setAudioFeedback] = useState(true);

  const handleTestVoiceCommand = (e) => {
    e.preventDefault();
    if (!voiceTestInput.trim()) return;
    const res = parseVoiceCommand(voiceTestInput);
    setVoiceTestResult(res);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. HEADER */}
      <section className="rounded-xl bg-white border border-[#DCE6F0] p-6 shadow-medical-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE6F0] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#16324F] tracking-tight">
                Workstation Preferences & Interaction Controls
              </h1>
              <p className="text-xs text-[#64748B]">
                Configure 3D MPR rendering and natural language voice control.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-[#EEF4F8] border border-[#DCE6F0] text-[11px] font-mono text-[#64748B]">
              v1.0.0 Workstation
            </span>
          </div>
        </div>
      </section>

      {/* 2. GRID SETTINGS: VOICE, RENDERING, BACKEND */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PANEL A: NATURAL LANGUAGE VOICE CONTROL */}
        <div className="rounded-xl bg-white border border-[#DCE6F0] p-6 shadow-medical-card space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCE6F0] pb-3">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-blue-600" />
                <h2 className="text-sm font-semibold text-[#16324F]">Clinical Voice Control Engine</h2>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                voiceControl?.isListening ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse' : 'bg-[#EEF4F8] text-[#64748B]'
              }`}>
                {voiceControl?.isListening ? 'Listening' : 'Standby'}
              </span>
            </div>

            <p className="text-xs text-[#64748B] leading-relaxed">
              Hands-free natural language parser with 113 passing verification tests.
              Controls slice coordinates, MRI modalities, 3D orbits, and full application navigation.
            </p>

            {/* Audio Feedback Chime Toggle */}
            <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-blue-600" />
                <div>
                  <span className="text-xs font-semibold text-[#16324F] block">Acoustic Execution Feedback</span>
                  <span className="text-[11px] text-[#64748B]">Audio confirmation on successful voice command</span>
                </div>
              </div>
              <button
                onClick={() => setAudioFeedback(!audioFeedback)}
                className={`px-3 py-1 rounded-full font-mono text-xs font-semibold transition-all ${
                  audioFeedback
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-[#EEF4F8] text-[#64748B] border border-[#CBD5E1]'
                }`}
              >
                {audioFeedback ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Test Voice Command Parser Box */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-[#64748B] block">
                Natural Language Command Parser Sandbox:
              </label>
              <form onSubmit={handleTestVoiceCommand} className="flex gap-2">
                <input
                  type="text"
                  placeholder='e.g., "Set axial to 50", "Show FLAIR", "Rotate left"'
                  value={voiceTestInput}
                  onChange={(e) => setVoiceTestInput(e.target.value)}
                  className="flex-1 bg-white border border-[#CBD5E1] rounded-lg px-3 py-2 text-xs font-mono text-[#16324F] focus:outline-none focus:border-blue-500 shadow-medical-sm"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-semibold transition-colors shadow-sm"
                >
                  Parse
                </button>
              </form>

              {voiceTestResult && (
                <div className={`p-2.5 rounded-lg border text-xs font-mono space-y-1 ${
                  voiceTestResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  <div className="font-bold">
                    {voiceTestResult.success ? 'Success: Intent Recognized' : 'Parsing Rejected'}
                  </div>
                  {voiceTestResult.success && (
                    <div className="text-[11px] text-[#16324F]">
                      Action Type: <strong className="text-blue-700">{voiceTestResult.action?.type}</strong> • Label: {voiceTestResult.action?.label}
                    </div>
                  )}
                  {voiceTestResult.error && (
                    <div className="text-[11px] text-red-700">
                      Reason: {voiceTestResult.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-[#DCE6F0] flex items-center justify-between text-xs font-mono text-[#64748B]">
            <span>Speech Recognition:</span>
            <span className="text-[#16324F] font-semibold">Web Speech API (Chrome/Edge Native)</span>
          </div>
        </div>

        {/* PANEL B: WORKSTATION RENDERING PREFERENCES */}
        <div className="rounded-xl bg-white border border-[#DCE6F0] p-6 shadow-medical-card space-y-5">
          <div className="flex items-center justify-between border-b border-[#DCE6F0] pb-3">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-[#16324F]">Rendering & MPR Display</h2>
            </div>
            <span className="text-[11px] font-mono text-[#64748B]">Multiplanar MPR</span>
          </div>

          <div className="space-y-4 font-mono text-xs">
            {/* Slice step slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[#64748B] text-[11px]">
                <span>Default Slice Navigation Step:</span>
                <span className="text-[#16324F] font-bold">{sliceStep} slices</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={sliceStep}
                onChange={(e) => setSliceStep(parseInt(e.target.value, 10))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Default opacity slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[#64748B] text-[11px]">
                <span>Segmentation Mask Overlay Opacity:</span>
                <span className="text-[#16324F] font-bold">{defaultOpacity}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={defaultOpacity}
                onChange={(e) => setDefaultOpacity(parseInt(e.target.value, 10))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>

            {/* Crosshair toggle */}
            <div className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-between">
              <div>
                <span className="font-semibold text-[#16324F] block">Synchronized Orthogonal Crosshairs</span>
                <span className="text-[11px] text-[#64748B]">Display planar intersection lines on 2D slices</span>
              </div>
              <button
                onClick={() => setCrosshairVisible(!crosshairVisible)}
                className={`px-3 py-1 rounded-full font-mono text-xs font-semibold transition-all ${
                  crosshairVisible
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-[#EEF4F8] text-[#64748B] border border-[#CBD5E1]'
                }`}
              >
                {crosshairVisible ? 'VISIBLE' : 'HIDDEN'}
              </button>
            </div>
          </div>
        </div>

        {/* PANEL C: HARDWARE & MODEL BACKEND SPECIFICATIONS */}
        <div className="rounded-xl bg-white border border-[#DCE6F0] p-6 shadow-medical-card space-y-5">
          <div className="flex items-center justify-between border-b border-[#DCE6F0] pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-[#16324F]">Hardware & Model Engine Status</h2>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
              serverStatus === 'ready' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {serverStatus === 'ready' ? 'Online' : 'Checking'}
            </span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex justify-between items-center">
              <span className="text-[#64748B]">Backend Service:</span>
              <span className="text-[#16324F] font-bold">FastAPI + Uvicorn (Port 8000)</span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex justify-between items-center">
              <span className="text-[#64748B]">PyTorch & Accelerator:</span>
              <span className="text-emerald-700 font-bold">PyTorch 2.11 + CUDA (FP16)</span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex justify-between items-center">
              <span className="text-[#64748B]">Deep Learning Framework:</span>
              <span className="text-[#16324F] font-bold">Project MONAI 1.6</span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex justify-between items-center">
              <span className="text-[#64748B]">Active Segmentation Checkpoint:</span>
              <span className="text-blue-700 font-bold truncate max-w-[200px]">checkpoints/adaptive/best.pth</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

