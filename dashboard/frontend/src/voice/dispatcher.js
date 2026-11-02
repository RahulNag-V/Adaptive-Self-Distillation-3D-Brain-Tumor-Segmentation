/**
 * NeuroVision AI - Voice Action Dispatcher
 *
 * Implements:
 * - Allowlisted action execution across routes, layout, scrolling, 3D viewer, and page handlers
 * - Two-phase safety confirmation state machine for model training and promotion
 * - Diagnostic telemetry log (stores last 10 recognized transcripts with outcomes)
 * - Structured intent validation (never executes arbitrary code)
 */

import { scrollController } from './scrollController.js';
import { viewerAdapter } from './viewerAdapter.js';

export class ActionDispatcher {
  constructor({ onNavigate, onPlayIntro, onFeedback } = {}) {
    this.onNavigate = onNavigate;
    this.onPlayIntro = onPlayIntro;
    this.onFeedback = onFeedback;

    this.layoutHandlers = new Set();
    this.pageActionHandlers = new Set();
    this.pendingConfirmation = null;
    this.confirmationListeners = new Set();

    // History stack
    this.historyStack = ['overview'];
    this.historyIndex = 0;

    // Recent telemetry logs (up to 30 records)
    this.telemetryLogs = [];
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const saved = localStorage.getItem('neurovision_recent_voice_telemetry');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) this.telemetryLogs = parsed.slice(0, 30);
        }
      } catch (e) {}
    }
    this.telemetryListeners = new Set();
  }

  updateNavigation(activeTab) {
    if (activeTab && this.historyStack[this.historyIndex] !== activeTab) {
      this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
      this.historyStack.push(activeTab);
      this.historyIndex = this.historyStack.length - 1;
    }
  }

  registerLayoutHandler(handler) {
    this.layoutHandlers.add(handler);
    return () => {
      this.layoutHandlers.delete(handler);
    };
  }

  registerPageActionHandler(handler) {
    this.pageActionHandlers.add(handler);
    return () => {
      this.pageActionHandlers.delete(handler);
    };
  }

  onConfirmationChange(listener) {
    this.confirmationListeners.add(listener);
    return () => {
      this.confirmationListeners.delete(listener);
    };
  }

  setPendingConfirmation(val) {
    this.pendingConfirmation = val;
    this.confirmationListeners.forEach((fn) => {
      try { fn(val); } catch (e) {}
    });
  }

  onTelemetryChange(listener) {
    this.telemetryListeners.add(listener);
    return () => {
      this.telemetryListeners.delete(listener);
    };
  }

  addTelemetryRecord({ text, action, success, error, label }) {
    const record = {
      id: Date.now() + Math.random(),
      text,
      actionType: action?.type || 'UNRECOGNIZED',
      label: label || action?.label || (success ? 'Success' : 'Failed'),
      success: !!success,
      error: error || null,
      timestamp: new Date().toLocaleTimeString(),
    };

    this.telemetryLogs = [record, ...this.telemetryLogs.slice(0, 29)];
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('neurovision_recent_voice_telemetry', JSON.stringify(this.telemetryLogs));
      } catch (e) {}
    }
    this.telemetryListeners.forEach((fn) => {
      try { fn(this.telemetryLogs); } catch (e) {}
    });

    return record;
  }

  /**
   * Executes a parsed, allowlisted action object.
   */
  async dispatch(action, rawText, currentTab = 'overview') {
    if (!action) return;

    // 1. Motion Halt: Stops continuous scrolling and 3D camera rotation
    if (action.type === 'STOP_ALL_MOTION') {
      scrollController.stopContinuousScroll();
      viewerAdapter.dispatch({ type: 'STOP_ROTATION' });
      this.addTelemetryRecord({ text: rawText, action, success: true, label: 'Motion Stopped' });
      return;
    }

    // 2. Website-Wide Scrolling
    if (action.type === 'SCROLL_STEP') {
      scrollController.scrollStep({
        direction: action.direction,
        amount: action.amount,
        isScreen: action.isScreen,
      });
      this.addTelemetryRecord({ text: rawText, action, success: true, label: action.label });
      return;
    }

    if (action.type === 'SCROLL_CARDINAL') {
      scrollController.scrollToPosition(action.position);
      this.addTelemetryRecord({ text: rawText, action, success: true, label: action.label });
      return;
    }

    if (action.type === 'START_CONTINUOUS_SCROLL') {
      scrollController.startContinuousScroll({
        direction: action.direction,
        speed: action.speed,
      });
      this.addTelemetryRecord({ text: rawText, action, success: true, label: action.label });
      return;
    }

    // 3. Two-Phase Safety Confirmation
    if (action.type === 'REQUEST_CONFIRMATION') {
      this.setPendingConfirmation({
        type: action.pendingType,
        prompt: action.prompt,
      });
      this.addTelemetryRecord({ text: rawText, action, success: true, label: 'Confirmation Requested' });
      return;
    }

    if (action.type === 'CANCEL_PENDING_ACTION') {
      this.setPendingConfirmation(null);
      this.addTelemetryRecord({ text: rawText, action, success: true, label: 'Action Cancelled' });
      return;
    }

    if (action.type === 'CONFIRM_PENDING_ACTION') {
      const targetType = action.pendingType || this.pendingConfirmation?.type;
      this.setPendingConfirmation(null);
      if (targetType) {
        this.pageActionHandlers.forEach((handler) => {
          try {
            handler({ type: targetType, confirmed: true });
          } catch (e) {}
        });
      }
      this.addTelemetryRecord({ text: rawText, action, success: true, label: `Executed ${targetType}` });
      return;
    }

    // 4. Manual Modal Controls & Layout Controls
    if (action.type === 'OPEN_MANUAL' || action.type === 'CLOSE_MANUAL' || action.type === 'TOGGLE_SIDEBAR' || action.type === 'TOGGLE_MENU' || action.type === 'CLOSE_ASSISTANT') {
      this.layoutHandlers.forEach((handler) => {
        try {
          if (action.type === 'CLOSE_ASSISTANT') {
            handler({ type: 'CLOSE_MANUAL' });
          } else {
            handler(action);
          }
        } catch (e) {}
      });
      this.addTelemetryRecord({ text: rawText, action, success: true, label: action.label });
      return;
    }

    // 5. History Navigation
    if (action.type === 'NAVIGATE_HISTORY') {
      if (action.direction === 'back') {
        if (this.historyIndex > 0) {
          this.historyIndex -= 1;
          const target = this.historyStack[this.historyIndex];
          if (this.onNavigate) this.onNavigate(target);
        } else if (typeof window !== 'undefined') {
          window.history.back();
        }
      } else if (action.direction === 'forward') {
        if (this.historyIndex < this.historyStack.length - 1) {
          this.historyIndex += 1;
          const target = this.historyStack[this.historyIndex];
          if (this.onNavigate) this.onNavigate(target);
        } else if (typeof window !== 'undefined') {
          window.history.forward();
        }
      }
      this.addTelemetryRecord({ text: rawText, action, success: true, label: action.label });
      return;
    }

    // 6. Direct Application Reload
    if (action.type === 'RELOAD_WEBSITE') {
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
      return;
    }

    // 7. Route Navigation
    if (action.type === 'NAVIGATE') {
      scrollController.stopContinuousScroll();
      if (this.onNavigate) {
        this.onNavigate(action.tab);
      }
      this.addTelemetryRecord({ text: rawText, action, success: true, label: action.label });
      return;
    }

    // 8. Intro Video
    if (action.type === 'PLAY_INTRO') {
      if (this.onPlayIntro) {
        this.onPlayIntro();
      }
      this.addTelemetryRecord({ text: rawText, action, success: true, label: action.label });
      return;
    }

    // 9. Reports Print Dialog
    if (action.type === 'PRINT_REPORT') {
      if (currentTab !== 'reports' && this.onNavigate) {
        this.onNavigate('reports');
      }
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.print();
        }
      }, 300);
      this.addTelemetryRecord({ text: rawText, action, success: true, label: 'Print PDF Report' });
      return;
    }

    // 10. Viewer Actions
    const isViewerAction = [
      'SET_LAYOUT',
      'FULLSCREEN',
      'SET_COORDINATES',
      'SET_AXIS_COORDINATE',
      'SELECT_CASE',
      'LIST_PATIENTS',
      'SET_MODALITY',
      'CYCLE_MODALITY',
      'GOTO_CENTER_SLICE',
      'RESET_SLICE',
      'STEP_SLICE',
      'GOTO_SLICE',
      'ROTATE',
      'ROTATE_ONCE',
      'ROTATE_VERTICAL',
      'SET_CAMERA_ANGLE',
      'SET_BRAIN_APPEARANCE',
      'LIST_BRAIN_APPEARANCES',
      'PROMPT_APPEARANCE_SELECTION',
      'START_CONTINUOUS_ROTATION',
      'STOP_ROTATION',
      'RESET_ROTATION',
      'ZOOM',
      'PAN',
      'CENTER_VIEW',
      'RESET_VIEW',
      'SET_SEGMENTATION',
      'TOGGLE_SEGMENTATION',
      'SET_OPACITY',
      'STEP_OPACITY',
      'TOGGLE_SUBREGION',
      'SHOW_LAYERS_PANEL',
      'HIDE_LAYERS_PANEL',
      'SHOW_VOLUMETRICS_PANEL',
      'SHOW_LAYERS_AND_VOLUMETRICS',
    ].includes(action.type);

    if (isViewerAction) {
      if (currentTab !== 'viewer' && this.onNavigate) {
        this.onNavigate('viewer');
      }
      viewerAdapter.dispatch(action);
      this.addTelemetryRecord({ text: rawText, action, success: true, label: action.label });
      return;
    }

    // 11. Page-specific Actions (Settings, Model Lab, About Viva)
    let pageHandled = false;
    this.pageActionHandlers.forEach((handler) => {
      try {
        handler(action);
        pageHandled = true;
      } catch (e) {}
    });

    this.addTelemetryRecord({ text: rawText, action, success: true, label: action.label });
  }
}

