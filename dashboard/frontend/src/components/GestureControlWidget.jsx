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
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-all shadow-2xs ${
          isEnabled
            ? status === 'tracking'
              ? 'bg-[#E3EEFF] border-[#2563EB] text-[#2563EB] ring-1 ring-[#2563EB]/40'
              : 'bg-[#EEF4F8] border-[#BFDBFE] text-[#2563EB] hover:bg-[#EAF2FF]'
            : 'bg-white border-[#DCE6F0] text-[#64748B] hover:text-[#16324F] hover:bg-[#EEF4F8]'
        }`}
        title="Touchless Hand Gesture Interface (Clinical Sterile Interaction)"
        aria-label="Toggle Gesture Control Panel"
      >
        <Hand className={`w-3.5 h-3.5 ${
          isEnabled 
            ? status === 'tracking' ? 'text-[#2563EB] animate-bounce' : 'text-[#2563EB]' 
            : 'text-[#64748B]'
        }`} />
        <span className="hidden sm:inline font-medium">Gesture</span>

        {/* Live Status Pip */}
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            !isEnabled
              ? 'bg-[#CBD5E1]'
              : status === 'tracking'
              ? 'bg-[#2563EB] animate-ping'
              : 'bg-[#06B6D4]'
          }`}
        />
      </button>

      {/* FLYOUT CONTROL & SIMULATION PANEL */}
      {panelOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-[#DCE6F0] shadow-xl z-50 p-4 space-y-4 text-xs font-sans animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#DCE6F0] pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#E3EEFF] text-[#2563EB]">
                <Hand className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-[#16324F] text-sm">Contactless Gesture Control</h3>
                <span className="text-[10px] font-mono text-[#64748B] block">
                  Sterile Touchless Workstation Navigation
                </span>
              </div>
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              className="p-1 rounded-md text-[#64748B] hover:text-[#16324F] hover:bg-[#EEF4F8]"
              aria-label="Close Gesture Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Master Enable Toggle */}
          <div className="p-3 rounded-xl bg-[#EEF4F8] border border-[#DCE6F0] flex items-center justify-between">
            <div>
              <span className="font-semibold text-[#16324F] block">Gesture Tracking Engine</span>
              <span className="text-[11px] text-[#64748B]">
                {isEnabled ? 'Active • Listening for Hand Movements' : 'Offline • Manual Interaction'}
              </span>
            </div>
            <button
              onClick={() => toggleGesture()}
              className={`px-3 py-1 rounded-full font-mono text-xs font-semibold transition-all ${
                isEnabled
                  ? 'bg-[#2563EB] text-white shadow-xs'
                  : 'bg-white text-[#64748B] border border-[#DCE6F0]'
              }`}
            >
              {isEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Real-time Status & Last Executed */}
          {isEnabled && (
            <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#DCE6F0] space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-[#64748B]">Tracking State:</span>
                <span className={`inline-flex items-center gap-1 font-semibold ${
                  status === 'tracking' ? 'text-[#2563EB]' : 'text-[#06B6D4]'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    status === 'tracking' ? 'bg-[#2563EB] animate-ping' : 'bg-[#06B6D4]'
                  }`} />
                  {status.toUpperCase()}
                </span>
              </div>

              {activeGesture && (
                <div className="flex items-center justify-between text-[#2563EB]">
                  <span>Detected Gesture:</span>
                  <span className="font-bold">{activeGesture.label} ({Math.round(activeGesture.confidence * 100)}%)</span>
                </div>
              )}

              {lastExecutedAction && (
                <div className="pt-1 border-t border-[#EEF4F8] flex items-center justify-between text-[#64748B]">
                  <span>Last Action:</span>
                  <span className="text-[#16324F] truncate max-w-[180px] font-medium">{lastExecutedAction.action}</span>
                </div>
              )}
            </div>
          )}

          {/* Quick Simulation Trigger Buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-[#64748B] font-mono">
              <span>Interactive Gesture Simulator (Viva Demo)</span>
              <span className="text-[#2563EB] font-medium">Instant Trigger</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              <button
                onClick={() => triggerSimulatedGesture('SWIPE_LEFT')}
                disabled={!isEnabled}
                className="p-2 rounded-lg bg-white hover:bg-[#EAF2FF] hover:text-[#2563EB] border border-[#DCE6F0] disabled:opacity-40 transition-colors flex flex-col items-center gap-1 text-[#16324F]"
                title="Trigger Swipe Left"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="text-[10px]">Prev Slice</span>
              </button>

              <button
                onClick={() => triggerSimulatedGesture('SWIPE_RIGHT')}
                disabled={!isEnabled}
                className="p-2 rounded-lg bg-white hover:bg-[#EAF2FF] hover:text-[#2563EB] border border-[#DCE6F0] disabled:opacity-40 transition-colors flex flex-col items-center gap-1 text-[#16324F]"
                title="Trigger Swipe Right"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                <span className="text-[10px]">Next Slice</span>
              </button>

              <button
                onClick={() => triggerSimulatedGesture('ROTATE_ORBIT')}
                disabled={!isEnabled}
                className="p-2 rounded-lg bg-white hover:bg-[#EAF2FF] hover:text-[#2563EB] border border-[#DCE6F0] disabled:opacity-40 transition-colors flex flex-col items-center gap-1 text-[#16324F]"
                title="Trigger 3D Orbit Rotate"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span className="text-[10px]">Orbit 3D</span>
              </button>

              <button
                onClick={() => triggerSimulatedGesture('PINCH_IN')}
                disabled={!isEnabled}
                className="p-2 rounded-lg bg-white hover:bg-[#EAF2FF] hover:text-[#2563EB] border border-[#DCE6F0] disabled:opacity-40 transition-colors flex flex-col items-center gap-1 text-[#16324F]"
                title="Trigger Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span className="text-[10px]">Zoom In</span>
              </button>

              <button
                onClick={() => triggerSimulatedGesture('PINCH_OUT')}
                disabled={!isEnabled}
                className="p-2 rounded-lg bg-white hover:bg-[#EAF2FF] hover:text-[#2563EB] border border-[#DCE6F0] disabled:opacity-40 transition-colors flex flex-col items-center gap-1 text-[#16324F]"
                title="Trigger Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
                <span className="text-[10px]">Zoom Out</span>
              </button>

              <button
                onClick={() => triggerSimulatedGesture('FIST')}
                disabled={!isEnabled}
                className="p-2 rounded-lg bg-white hover:bg-[#EAF2FF] hover:text-[#2563EB] border border-[#DCE6F0] disabled:opacity-40 transition-colors flex flex-col items-center gap-1 text-[#16324F]"
                title="Trigger Coordinate Reset"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="text-[10px]">Reset</span>
              </button>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-2 border-t border-[#DCE6F0] flex items-center justify-between text-xs">
            <button
              onClick={() => {
                if (cameraActive) stopCamera();
                else startCamera();
              }}
              disabled={!isEnabled}
              className="inline-flex items-center gap-1.5 text-[#64748B] hover:text-[#16324F] disabled:opacity-40"
            >
              {cameraActive ? <Video className="w-3.5 h-3.5 text-[#16866A]" /> : <VideoOff className="w-3.5 h-3.5" />}
              <span>{cameraActive ? 'Camera Connected' : 'Connect Camera'}</span>
            </button>

            {onNavigateSettings && (
              <button
                onClick={() => {
                  setPanelOpen(false);
                  onNavigateSettings('settings');
                }}
                className="inline-flex items-center gap-1 text-[#2563EB] hover:underline text-[11px] font-medium"
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
