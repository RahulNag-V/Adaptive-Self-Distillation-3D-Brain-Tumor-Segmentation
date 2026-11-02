/**
 * NeuroVision AI - Voice Context Provider
 *
 * Implements:
 * - Single SpeechEngine instance held in ref, safe under React StrictMode double-mount
 * - Global Ctrl + V / Cmd + V keyboard shortcut with native paste protection for input fields
 * - Unified dispatch pipeline for both speech recognition transcripts and typed commands
 * - Full status progression: idle -> starting -> listening -> processing -> executing -> error
 * - Audio synthesis feedback with loop protection
 */

import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import { SpeechEngine } from './engine.js';
import { parseVoiceCommand } from './parser.js';
import { ActionDispatcher } from './dispatcher.js';
import { viewerAdapter } from './viewerAdapter.js';
import { scrollController } from './scrollController.js';

const VoiceContext = createContext(null);

function isEditableElement(target) {
  if (!target) return false;
  const tagName = target.tagName ? target.tagName.toUpperCase() : '';
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }
  if (target.isContentEditable) return true;
  if (typeof target.closest === 'function') {
    return !!target.closest('[contenteditable="true"], [contenteditable=""], [role="textbox"]');
  }
  return false;
}

export function VoiceProvider({ children, activeTab, onNavigate, onPlayIntro }) {
  const [engineState, setEngineState] = useState('idle');
  const [executionState, setExecutionState] = useState('idle'); // 'idle' | 'processing' | 'executing' | 'success' | 'error'
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState(true);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [telemetryLogs, setTelemetryLogs] = useState([]);
  const [viewerStatus, setViewerStatus] = useState(viewerAdapter.getStatus());

  const engineRef = useRef(null);
  const dispatcherRef = useRef(null);
  const activeTabRef = useRef(activeTab);

  useEffect(() => {
    activeTabRef.current = activeTab;
    if (dispatcherRef.current) {
      dispatcherRef.current.updateNavigation(activeTab);
    }
    scrollController.cleanup();
  }, [activeTab]);

  // Keep viewer status synchronized
  useEffect(() => {
    return viewerAdapter.subscribeStatus((newStatus) => {
      setViewerStatus({ ...newStatus });
    });
  }, []);

  // Initialize Dispatcher once
  if (!dispatcherRef.current) {
    dispatcherRef.current = new ActionDispatcher({
      onNavigate,
      onPlayIntro,
    });
  } else {
    dispatcherRef.current.onNavigate = onNavigate;
    dispatcherRef.current.onPlayIntro = onPlayIntro;
  }

  // Subscribe to confirmation and telemetry updates
  useEffect(() => {
    const unregConf = dispatcherRef.current.onConfirmationChange((conf) => {
      setPendingConfirmation(conf);
    });
    const unregTelem = dispatcherRef.current.onTelemetryChange((logs) => {
      setTelemetryLogs([...logs]);
    });
    return () => {
      unregConf();
      unregTelem();
    };
  }, []);

  // Shared pipeline executor for both spoken voice and typed commands
  const processAndDispatch = useCallback(async (rawText, isTyped = false) => {
    if (!rawText || !rawText.trim()) return { success: false, error: 'Empty command' };

    const clean = rawText.trim();
    setTranscript(clean);
    setInterimTranscript('');
    setExecutionState('processing');
    setErrorMessage(null);

    const context = {
      activeTab: activeTabRef.current,
      pendingConfirmation,
      viewerStatus: viewerAdapter.getStatus(),
    };

    const parsed = parseVoiceCommand(clean, context);

    if (parsed.success && parsed.action) {
      setExecutionState('executing');
      const cmdRecord = {
        text: clean,
        action: parsed.action,
        success: true,
        label: parsed.action.label,
        timestamp: new Date().toLocaleTimeString(),
      };
      setLastCommand(cmdRecord);

      try {
        await Promise.resolve(dispatcherRef.current.dispatch(parsed.action, clean, activeTabRef.current));
        setExecutionState('success');

        if (parsed.action.type === 'STOP_LISTENING' || parsed.action.type === 'CLOSE_ASSISTANT' || parsed.action.type === 'PAUSE_LISTENING') {
          engineRef.current?.stop();
        } else if (parsed.action.type === 'RESUME_LISTENING' || parsed.action.type === 'START_LISTENING') {
          engineRef.current?.start();
        }

        // Audio feedback if enabled
        if (audioFeedbackEnabled && engineRef.current && parsed.action.feedback) {
          engineRef.current.speak(parsed.action.feedback);
        }

        setTimeout(() => {
          setExecutionState('idle');
        }, 1500);

        return { success: true, action: parsed.action };
      } catch (err) {
        console.error('[Voice] Dispatch execution error:', err);
        setExecutionState('error');
        setErrorMessage(`Execution error: ${err.message || 'Action failed'}`);
        setTimeout(() => { setExecutionState('idle'); }, 2500);
        return { success: false, error: err.message };
      }
    } else {
      setExecutionState('error');
      const errText = parsed.error || `Unrecognized command: "${clean}"`;
      setErrorMessage(errText);
      setLastCommand({
        text: clean,
        action: null,
        success: false,
        error: errText,
        timestamp: new Date().toLocaleTimeString(),
      });
      dispatcherRef.current.addTelemetryRecord({ text: clean, action: null, success: false, error: errText });
      setTimeout(() => { setExecutionState('idle'); }, 2500);
      return { success: false, error: errText };
    }
  }, [audioFeedbackEnabled, pendingConfirmation]);

  // Initialize SpeechEngine once, held in a ref
  useEffect(() => {
    const engine = new SpeechEngine({
      onTranscript: (finalStr) => {
        processAndDispatch(finalStr, false);
      },
      onInterim: (interimStr) => {
        setInterimTranscript(interimStr);
        setExecutionState('processing');
      },
      onStateChange: (newState) => {
        setEngineState(newState);
      },
      onError: (err) => {
        setErrorMessage(err.message);
      },
    });

    engineRef.current = engine;

    return () => {
      engine.destroy();
      scrollController.cleanup();
    };
  }, [processAndDispatch]);

  // Global Ctrl + V / Cmd + V Keyboard Shortcut
  // Preserves native clipboard paste inside input fields/textareas
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const isKeyV = e.key && e.key.toLowerCase() === 'v';

      if (isCtrlOrMeta && isKeyV) {
        // Native paste preserved in editable fields
        if (isEditableElement(e.target)) return;

        e.preventDefault();
        e.stopPropagation();

        if (engineRef.current) {
          engineRef.current.toggle();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  const isListening = engineState === 'listening';
  const isStarting = engineState === 'starting';

  // Overall display status
  let displayStatus = 'standby';
  if (!engineRef.current?.isSupported) {
    displayStatus = 'unsupported';
  } else if (executionState === 'processing') {
    displayStatus = 'processing';
  } else if (executionState === 'executing') {
    displayStatus = 'executing';
  } else if (executionState === 'success') {
    displayStatus = 'success';
  } else if (executionState === 'error' || engineState === 'error') {
    displayStatus = 'error';
  } else if (isListening) {
    displayStatus = 'listening';
  } else if (isStarting) {
    displayStatus = 'starting';
  }

  const value = {
    isListening,
    isStarting,
    engineState,
    status: displayStatus,
    transcript: interimTranscript || transcript,
    lastCommand,
    errorMessage,
    pendingConfirmation,
    telemetryLogs,
    audioFeedbackEnabled,
    setAudioFeedbackEnabled,
    isSupported: engineRef.current ? engineRef.current.isSupported : true,
    isSecureContext: engineRef.current ? engineRef.current.isSecureContext : true,
    startListening: () => engineRef.current?.start(),
    stopListening: () => engineRef.current?.stop(),
    toggleListening: () => engineRef.current?.toggle(),
    executeTypedCommand: (text) => processAndDispatch(text, true),
    registerLayoutHandler: (h) => dispatcherRef.current.registerLayoutHandler(h),
    registerPageActionHandler: (h) => dispatcherRef.current.registerPageActionHandler(h),
    registerViewerHandler: (h) => viewerAdapter.registerHandler(h),
    viewerStatus,
    updateViewerStatus: (s) => viewerAdapter.updateStatus(s),
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return ctx;
}

// Backward-compatible aliases
export const useVoiceContext = useVoice;
export const VoiceControlProvider = VoiceProvider;
