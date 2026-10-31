import React, { useState, useRef, useEffect } from 'react';
import { 
  Hand, 
  Sparkles, 
  Video, 
  VideoOff, 
  Settings, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  RotateCcw,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { useGestureContext } from '../context/GestureControlContext';

export default function GestureControlWidget({ onNavigateSettings }) {
  const {
    isEnabled,
    status,
    activeGesture,
    lastExecutedAction,
    toggleGesture,
    triggerSimulatedGesture,
    cameraActive,
    startCamera,
    stopCamera,
    availableGestures,
  } = useGestureContext();

  const [panelOpen, setPanelOpen] = useState(false);
  const panelRef = useRef(null);

  // Close popup when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setPanelOpen(false);
      }
    }
    if (panelOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [panelOpen]);

  return (
    <div className="relative" ref={panelRef}>
      {/* HEADER HUD BUTTON */}
      <button
        onClick={() => setPanelOpen(!panelOpen)}
        type="button"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all shadow-sm ${
          isEnabled
            ? status === 'tracking'
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 ring-1 ring-emerald-400/50'
              : 'bg-medical-teal/15 border-medical-teal/40 text-medical-tealLight hover:bg-medical-teal/25'
            : 'bg-medical-card border-medical-border text-medical-muted hover:text-white hover:bg-medical-surface'
        }`}
        title="Touchless Hand Gesture Interface (Clinical Sterile Interaction)"
        aria-label="Toggle Gesture Control Panel"
      >
        <Hand className={`w-3.5 h-3.5 ${
          isEnabled 
            ? status === 'tracking' ? 'text-emerald-400 animate-bounce' : 'text-medical-teal' 
            : 'text-medical-muted'
        }`} />
        <span className="hidden sm:inline font-medium">Gesture</span>

        {/* Live Status Pip */}
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            !isEnabled
              ? 'bg-zinc-600'
              : status === 'tracking'
              ? 'bg-emerald-400 animate-ping'
              : 'bg-medical-teal'
          }`}
        />
      </button>

      {/* FLYOUT CONTROL & SIMULATION PANEL */}
      {panelOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-medical-card border border-medical-border shadow-2xl z-50 p-4 space-y-4 text-xs font-sans animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-medical-border pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-medical-teal/15 text-medical-teal">
                <Hand className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Contactless Gesture Control</h3>
                <span className="text-[10px] font-mono text-medical-muted block">
                  Sterile Touchless Workstation Navigation
                </span>
              </div>
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              className="p-1 rounded-md text-medical-muted hover:text-white hover:bg-medical-surface"
              aria-label="Close Gesture Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Master Enable Toggle */}
          <div className="p-3 rounded-lg bg-medical-base border border-medical-border flex items-center justify-between">
            <div>
              <span className="font-medium text-white block">Gesture Tracking Engine</span>
              <span className="text-[11px] text-medical-muted">
                {isEnabled ? 'System Active • Listening for Hand Movements' : 'Offline • Manual Interaction Only'}
              </span>
            </div>
            <button
              onClick={() => toggleGesture()}
              className={`px-3 py-1 rounded-full font-mono text-xs font-semibold transition-all ${
                isEnabled
                  ? 'bg-medical-teal text-medical-darkest shadow-sm'
                  : 'bg-medical-surface text-medical-muted border border-medical-border'
              }`}
            >
              {isEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Real-time Status & Last Executed */}
          {isEnabled && (
            <div className="p-2.5 rounded-lg bg-medical-darkest/70 border border-medical-border/60 space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-medical-muted">Tracking State:</span>
                <span className={`inline-flex items-center gap-1 font-semibold ${
                  status === 'tracking' ? 'text-emerald-400' : 'text-medical-teal'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    status === 'tracking' ? 'bg-emerald-400 animate-ping' : 'bg-medical-teal'
                  }`} />
                  {status.toUpperCase()}
                </span>
              </div>

              {activeGesture && (
                <div className="flex items-center justify-between text-emerald-300">
                  <span>Detected Gesture:</span>
                  <span className="font-bold">{activeGesture.label} ({Math.round(activeGesture.confidence * 100)}%)</span>
                </div>
              )}

              {lastExecutedAction && (
                <div className="pt-1 border-t border-medical-border/40 flex items-center justify-between text-medical-muted">
                  <span>Last Action:</span>
                  <span className="text-white truncate max-w-[180px]">{lastExecutedAction.action}</span>
                </div>
              )}
            </div>
          )}

          {/* Quick Simulation Trigger Buttons (Viva / Demo Readiness) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-medical-muted font-mono">
              <span>Interactive Gesture Simulator (Viva Demo)</span>
              <span className="text-medical-cyan">Instant Trigger</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              <button
                onClick={() => triggerSimulatedGesture('SWIPE_LEFT')}
                disabled={!isEnabled}
                className="p-2 rounded bg-medical-surface hover:bg-medical-teal/20 hover:text-medical-teal border border-medical-border disabled:opacity-40 transition-colors flex flex-col items-center gap-1"
                title="Trigger Swipe Left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="text-[10px]">Prev Slice</span>
              </button>

              <button
                onClick={() => triggerSimulatedGesture('SWIPE_RIGHT')}
                disabled={!isEnabled}
                className="p-2 rounded bg-medical-surface hover:bg-medical-teal/20 hover:text-medical-teal border border-medical-border disabled:opacity-40 transition-colors flex flex-col items-center gap-1"
                title="Trigger Swipe Right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-[10px]">Next Slice</span>
              </button>

              <button
                onClick={() => triggerSimulatedGesture('ROTATE_ORBIT')}
                disabled={!isEnabled}
                className="p-2 rounded bg-medical-surface hover:bg-medical-teal/20 hover:text-medical-teal border border-medical-border disabled:opacity-40 transition-colors flex flex-col items-center gap-1"
                title="Trigger 3D Orbit Rotate"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="text-[10px]">Orbit 3D</span>
              </button>

              <button
                onClick={() => triggerSimulatedGesture('PINCH_IN')}
                disabled={!isEnabled}
                className="p-2 rounded bg-medical-surface hover:bg-medical-teal/20 hover:text-medical-teal border border-medical-border disabled:opacity-40 transition-colors flex flex-col items-center gap-1"
                title="Trigger Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span className="text-[10px]">Zoom In</span>
              </button>

              <button
                onClick={() => triggerSimulatedGesture('PINCH_OUT')}
                disabled={!isEnabled}
                className="p-2 rounded bg-medical-surface hover:bg-medical-teal/20 hover:text-medical-teal border border-medical-border disabled:opacity-40 transition-colors flex flex-col items-center gap-1"
                title="Trigger Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
                <span className="text-[10px]">Zoom Out</span>
              </button>

              <button
                onClick={() => triggerSimulatedGesture('FIST')}
                disabled={!isEnabled}
                className="p-2 rounded bg-medical-surface hover:bg-medical-teal/20 hover:text-medical-teal border border-medical-border disabled:opacity-40 transition-colors flex flex-col items-center gap-1"
                title="Trigger Coordinate Reset"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="text-[10px]">Reset</span>
              </button>
            </div>
          </div>

          {/* Footer Controls & Link to Full Settings */}
          <div className="pt-2 border-t border-medical-border/70 flex items-center justify-between text-xs">
            <button
              onClick={() => {
                if (cameraActive) stopCamera();
                else startCamera();
              }}
              disabled={!isEnabled}
              className="inline-flex items-center gap-1.5 text-medical-muted hover:text-white disabled:opacity-40"
            >
              {cameraActive ? <Video className="w-3.5 h-3.5 text-emerald-400" /> : <VideoOff className="w-3.5 h-3.5" />}
              <span>{cameraActive ? 'Camera Connected' : 'Connect Camera'}</span>
            </button>

            {onNavigateSettings && (
              <button
                onClick={() => {
                  setPanelOpen(false);
                  onNavigateSettings('settings');
                }}
                className="inline-flex items-center gap-1 text-medical-teal hover:underline text-[11px]"
              >
                <Settings className="w-3 h-3" />
                <span>Workstation Settings</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

