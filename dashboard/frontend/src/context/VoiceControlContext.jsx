import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import { useVoiceControl } from '../hooks/useVoiceControl';

const VoiceControlContext = createContext(null);

export function VoiceControlProvider({ children, activeTab, onNavigate, onPlayIntro }) {
  const viewerHandlersRef = useRef(new Set());
  const layoutHandlersRef = useRef(new Set());

  // Navigation History Stack
  const historyRef = useRef([activeTab || 'overview']);
  const historyIndexRef = useRef(0);

  useEffect(() => {
    if (activeTab && historyRef.current[historyIndexRef.current] !== activeTab) {
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      historyRef.current.push(activeTab);
      historyIndexRef.current = historyRef.current.length - 1;
    }
  }, [activeTab]);

  // Viewer State shared across components
  const [viewerStatus, setViewerStatus] = useState({
    selectedPatientId: 'BraTS2021_01017',
    activePlane: 'Axial (Z)',
    coordinates: { x: 120, y: 120, z: 78 },
    dimensions: { axial: 155, coronal: 240, sagittal: 240 },
    lastFeedback: null,
  });

  const updateViewerStatus = useCallback((partial) => {
    setViewerStatus((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleCommand = useCallback((action, cmdRecord) => {
    // 1. Navigation History (Go Back / Go Forward)
    if (action.type === 'NAVIGATE_HISTORY') {
      if (action.direction === 'back') {
        if (historyIndexRef.current > 0) {
          historyIndexRef.current -= 1;
          const target = historyRef.current[historyIndexRef.current];
          if (onNavigate) onNavigate(target);
        } else {
          window.history.back();
        }
      } else if (action.direction === 'forward') {
        if (historyIndexRef.current < historyRef.current.length - 1) {
          historyIndexRef.current += 1;
          const target = historyRef.current[historyIndexRef.current];
          if (onNavigate) onNavigate(target);
        } else {
          window.history.forward();
        }
      }
      return;
    }

    // 2. Direct Website Reload
    if (action.type === 'RELOAD_WEBSITE') {
      console.log('[VoiceControl] Reloading website upon voice request...');
      window.location.reload();
      return;
    }

    // 3. Platform Tab Navigation
    if (action.type === 'NAVIGATE') {
      if (onNavigate) {
        onNavigate(action.tab);
      }
      return;
    }

    // 4. Intro Video Playback
    if (action.type === 'PLAY_INTRO') {
      if (onPlayIntro) {
        onPlayIntro();
      }
      return;
    }

    // 5. Layout & UI Controls (Sidebar, Menu, Settings, Help modal, Gesture toggle)
    if (
      action.type === 'TOGGLE_SIDEBAR' ||
      action.type === 'TOGGLE_MENU' ||
      action.type === 'OPEN_HELP_MODAL' ||
      action.type === 'CLOSE_HELP_MODAL' ||
      action.type === 'OPEN_SETTINGS' ||
      action.type === 'CLOSE_SETTINGS' ||
      action.type === 'TOGGLE_GESTURE'
    ) {
      if (action.type === 'OPEN_SETTINGS' && onNavigate) {
        onNavigate('settings');
      }
      layoutHandlersRef.current.forEach((handler) => {
        try {
          handler(action, cmdRecord);
        } catch (err) {
          console.error('[VoiceControl] Layout handler error:', err);
        }
      });
      return;
    }

    // 6. Unsupported Features & Informative Messages (e.g. Volumetric Raymarching request)
    if (action.type === 'UNSUPPORTED_FEATURE' || action.type === 'INFO_MESSAGE') {
      updateViewerStatus({ lastFeedback: action.message });
      // Also notify viewer handlers
      viewerHandlersRef.current.forEach((handler) => {
        try {
          handler(action, cmdRecord);
        } catch (err) {
          console.error('[VoiceControl] Viewer handler error:', err);
        }
      });
      return;
    }

    if (action.type === 'STOP_LISTENING') {
      // Voice hook already handles self-stop
      return;
    }

    // 7. Viewer-specific actions: if on another tab, navigate to viewer first
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
  }, [activeTab, onNavigate, onPlayIntro, updateViewerStatus]);

  const voiceControl = useVoiceControl({ onCommand: handleCommand, ttsFeedback: true });

  const registerViewerHandler = useCallback((handler) => {
    viewerHandlersRef.current.add(handler);
    return () => {
      viewerHandlersRef.current.delete(handler);
    };
  }, []);

  const registerLayoutHandler = useCallback((handler) => {
    layoutHandlersRef.current.add(handler);
    return () => {
      layoutHandlersRef.current.delete(handler);
    };
  }, []);

  return (
    <VoiceControlContext.Provider
      value={{
        voiceControl,
        registerViewerHandler,
        registerLayoutHandler,
        viewerStatus,
        updateViewerStatus,
        activeTab,
      }}
    >
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
      registerLayoutHandler: () => () => {},
      viewerStatus: {
        selectedPatientId: 'BraTS2021_01017',
        activePlane: 'Axial (Z)',
        coordinates: { x: 120, y: 120, z: 78 },
        dimensions: { axial: 155, coronal: 240, sagittal: 240 },
        lastFeedback: null,
      },
      updateViewerStatus: () => {},
      activeTab: 'viewer',
    };
  }
  return ctx;
}
