import React, { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import { useVoiceControl } from '../hooks/useVoiceControl';
import { scrollController } from '../services/scrollController';

/**
 * Detects whether an event target is an active editable field
 * (input, textarea, select, contenteditable, or ARIA textbox)
 * to ensure normal clipboard paste is preserved when typing.
 */
function isEditableElement(target) {
  if (!target) return false;
  const tagName = target.tagName ? target.tagName.toUpperCase() : '';
  if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  if (typeof target.closest === 'function') {
    const editableAncestor = target.closest('[contenteditable="true"], [contenteditable=""], [role="textbox"]');
    if (editableAncestor) return true;
  }
  return false;
}

const VoiceControlContext = createContext(null);

export function VoiceControlProvider({ children, activeTab, onNavigate, onPlayIntro }) {
  const viewerHandlersRef = useRef(new Set());
  const layoutHandlersRef = useRef(new Set());
  const pageActionHandlersRef = useRef(new Set());

  // Navigation History Stack
  const historyRef = useRef([activeTab || 'overview']);
  const historyIndexRef = useRef(0);

  // Safety Confirmation State Machine
  const [pendingConfirmation, setPendingConfirmation] = useState(null);

  useEffect(() => {
    // Stop continuous scrolling whenever the active route/tab changes
    scrollController.stopContinuousScroll();

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

  // Context provider for the parser
  const getParserContext = useCallback(() => {
    return {
      pendingConfirmation,
      activeTab,
      viewerStatus,
    };
  }, [pendingConfirmation, activeTab, viewerStatus]);

  const handleCommand = useCallback((action, cmdRecord) => {
    if (!action) return;

    // 1. Motion Halt: Stops both continuous scrolling and 3D camera rotation
    if (action.type === 'STOP_ALL_MOTION') {
      scrollController.stopContinuousScroll();
      viewerHandlersRef.current.forEach((handler) => {
        try {
          handler({ type: 'STOP_ROTATION' }, cmdRecord);
        } catch (e) {}
      });
      return;
    }

    // 2. Website-Wide Scrolling Actions
    if (action.type === 'SCROLL_STEP') {
      scrollController.scrollStep({
        direction: action.direction,
        amount: action.amount,
        isScreen: action.isScreen,
      });
      return;
    }

    if (action.type === 'SCROLL_CARDINAL') {
      scrollController.scrollToPosition(action.position);
      return;
    }

    if (action.type === 'START_CONTINUOUS_SCROLL') {
      scrollController.startContinuousScroll({
        direction: action.direction,
        speed: action.speed,
      });
      return;
    }

    // 3. Two-Phase Safety Confirmation
    if (action.type === 'REQUEST_CONFIRMATION') {
      setPendingConfirmation({
        type: action.pendingType,
        prompt: action.prompt,
      });
      return;
    }

    if (action.type === 'CANCEL_PENDING_ACTION') {
      setPendingConfirmation(null);
      return;
    }

    if (action.type === 'CONFIRM_PENDING_ACTION') {
      const confirmedType = action.pendingType || pendingConfirmation?.type;
      setPendingConfirmation(null);
      if (confirmedType) {
        // Dispatch confirmed action to page action handlers
        pageActionHandlersRef.current.forEach((handler) => {
          try {
            handler({ type: confirmedType, confirmed: true }, cmdRecord);
          } catch (e) {
            console.error('[VoiceControl] Confirmed action handler error:', e);
          }
        });
      }
      return;
    }

    // 4. Manual Modal Controls
    if (action.type === 'OPEN_MANUAL' || action.type === 'CLOSE_MANUAL') {
      layoutHandlersRef.current.forEach((handler) => {
        try {
          handler(action, cmdRecord);
        } catch (e) {}
      });
      return;
    }

    // 5. Navigation History (Go Back / Go Forward)
    if (action.type === 'NAVIGATE_HISTORY') {
      if (action.direction === 'back') {
        if (historyIndexRef.current > 0) {
          historyIndexRef.current -= 1;
          const target = historyRef.current[historyIndexRef.current];
          if (onNavigate) onNavigate(target);
        } else if (typeof window !== 'undefined') {
          window.history.back();
        }
      } else if (action.direction === 'forward') {
        if (historyIndexRef.current < historyRef.current.length - 1) {
          historyIndexRef.current += 1;
          const target = historyRef.current[historyIndexRef.current];
          if (onNavigate) onNavigate(target);
        } else if (typeof window !== 'undefined') {
          window.history.forward();
        }
      }
      return;
    }

    // 6. Direct Website Reload
    if (action.type === 'RELOAD_WEBSITE') {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      return;
    }

    // 7. Platform Tab Navigation
    if (action.type === 'NAVIGATE') {
      scrollController.stopContinuousScroll();
      if (onNavigate) {
        onNavigate(action.tab);
      }
      return;
    }

    // 8. Intro Video Playback
    if (action.type === 'PLAY_INTRO') {
      if (onPlayIntro) {
        onPlayIntro();
      }
      return;
    }

    // 9. Layout & UI Controls (Sidebar, Menu, Settings)
    if (
      action.type === 'TOGGLE_SIDEBAR' ||
      action.type === 'TOGGLE_MENU' ||
      action.type === 'OPEN_SETTINGS' ||
      action.type === 'CLOSE_SETTINGS'
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

    // 10. Reports Print Action
    if (action.type === 'PRINT_REPORT') {
      if (activeTab !== 'reports' && onNavigate) {
        onNavigate('reports');
      }
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.print();
        }
      }, 300);
      return;
    }

    // 11. Viewer-specific actions: If on another tab, navigate to 3D Workspace first!
    const isViewerAction = [
      'SET_LAYOUT',
      'SET_COORDINATES',
      'SET_AXIS_COORDINATE',
      'SELECT_CASE',
      'SET_MODALITY',
      'CYCLE_MODALITY',
      'GOTO_CENTER_SLICE',
      'RESET_SLICE',
      'STEP_SLICE',
      'GOTO_SLICE',
      'ROTATE',
      'ROTATE_ONCE',
      'START_CONTINUOUS_ROTATION',
      'STOP_ROTATION',
      'RESET_ROTATION',
      'ZOOM',
      'PAN',
      'SET_SEGMENTATION',
      'TOGGLE_SEGMENTATION',
      'SET_OPACITY',
      'TOGGLE_SUBREGION',
      'RESET_VIEW',
    ].includes(action.type);

    if (isViewerAction && activeTab !== 'viewer' && onNavigate) {
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

    // Also forward to page action handlers
    pageActionHandlersRef.current.forEach((handler) => {
      try {
        handler(action, cmdRecord);
      } catch (err) {
        console.error('[VoiceControl] Page action handler error:', err);
      }
    });
  }, [activeTab, onNavigate, onPlayIntro, pendingConfirmation]);

  const voiceControl = useVoiceControl({
    onCommand: handleCommand,
    ttsFeedback: true,
    getContext: getParserContext,
  });

  // Stable ref for toggleListening to avoid re-binding the window event listener
  const toggleListeningRef = useRef(voiceControl.toggleListening);
  useEffect(() => {
    toggleListeningRef.current = voiceControl.toggleListening;
  }, [voiceControl.toggleListening]);

  // Global Ctrl + V Keyboard Shortcut
  // - Activates voice recognition when pressed
  // - Deactivates voice recognition if already active
  // - Operates globally across all pages without requiring page reloads
  // - Preserves normal clipboard paste behavior inside editable fields
  // - Ignores key repeat events from held keys
  // - Case-insensitive match for the 'v' key
  // - Uses capture phase to ensure reliable priority
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. Prevent accidental repeated toggles from key-repeat events
      if (e.repeat) return;

      // 2. Case-insensitive check for 'v' with Ctrl (Windows/Linux) or Meta (macOS)
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const isKeyV = e.key && e.key.toLowerCase() === 'v';

      if (isCtrlOrMeta && isKeyV) {
        // 3. Preserve normal paste inside editable fields (input, textarea, select, contenteditable)
        if (isEditableElement(e.target)) {
          return;
        }

        // 4. Outside editable fields: toggle voice recognition cleanly
        e.preventDefault();
        e.stopPropagation();

        if (toggleListeningRef.current) {
          toggleListeningRef.current();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  // Non-UI Dev/Test Dispatch Hook for Automated Browser and Unit Testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__neurovision_voice_dispatch_test__ = (transcriptText) => {
        return voiceControl.processAndDispatch(transcriptText);
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window.__neurovision_voice_dispatch_test__;
      }
    };
  }, [voiceControl]);

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

  const registerPageActionHandler = useCallback((handler) => {
    pageActionHandlersRef.current.add(handler);
    return () => {
      pageActionHandlersRef.current.delete(handler);
    };
  }, []);

  return (
    <VoiceControlContext.Provider
      value={{
        voiceControl,
        registerViewerHandler,
        registerLayoutHandler,
        registerPageActionHandler,
        viewerStatus,
        updateViewerStatus,
        pendingConfirmation,
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
      registerPageActionHandler: () => () => {},
      viewerStatus: {
        selectedPatientId: 'BraTS2021_01017',
        activePlane: 'Axial (Z)',
        coordinates: { x: 120, y: 120, z: 78 },
        dimensions: { axial: 155, coronal: 240, sagittal: 240 },
        lastFeedback: null,
      },
      updateViewerStatus: () => {},
      pendingConfirmation: null,
      activeTab: 'viewer',
    };
  }
  return ctx;
}
