import React, { createContext, useContext, useRef, useCallback } from 'react';
import { useVoiceControl } from '../hooks/useVoiceControl';

const VoiceControlContext = createContext(null);

export function VoiceControlProvider({ children, activeTab, onNavigate, onPlayIntro }) {
  const viewerHandlersRef = useRef(new Set());

  const handleCommand = useCallback((action, cmdRecord) => {
    // 1. Platform Navigation commands
    if (action.type === 'NAVIGATE') {
      if (onNavigate) {
        onNavigate(action.tab);
      }
      return;
    }

    if (action.type === 'PLAY_INTRO') {
      if (onPlayIntro) {
        onPlayIntro();
      }
      return;
    }

    if (action.type === 'STOP_LISTENING') {
      // Voice hook already handles self-stop
      return;
    }

    // 2. Viewer-specific actions: if on another tab, navigate to viewer first
    if (activeTab !== 'viewer' && onNavigate) {
      onNavigate('viewer');
    }

    // Forward to registered viewer handlers
    viewerHandlersRef.current.forEach((handler) => {
      try {
        handler(action, cmdRecord);
      } catch (err) {
        console.error('[VoiceControl] Viewer handler error:', err);
      }
    });
  }, [activeTab, onNavigate, onPlayIntro]);

  const voiceControl = useVoiceControl({ onCommand: handleCommand, ttsFeedback: true });

  const registerViewerHandler = useCallback((handler) => {
    viewerHandlersRef.current.add(handler);
    return () => {
      viewerHandlersRef.current.delete(handler);
    };
  }, []);

  return (
    <VoiceControlContext.Provider value={{ voiceControl, registerViewerHandler, activeTab }}>
      {children}
    </VoiceControlContext.Provider>
  );
}

export function useVoiceContext() {
  const ctx = useContext(VoiceControlContext);
  if (!ctx) {
    return {
      voiceControl: null,
      registerViewerHandler: () => () => {},
      activeTab: 'viewer',
    };
  }
  return ctx;
}

