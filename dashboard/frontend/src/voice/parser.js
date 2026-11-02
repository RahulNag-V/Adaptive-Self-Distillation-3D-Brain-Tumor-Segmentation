/**
 * NeuroVision AI - Voice Command Parser Pipeline
 *
 * Pipeline:
 * Transcript -> Normalization -> Negation Check -> Stop Words -> Intent Extraction -> Parameter Validation -> Structured Intent Object
 *
 * Rules:
 * - Structured intent objects only (NEVER returns executable code or raw unvalidated strings).
 * - Negation checked FIRST: "don't open reports" -> NO_ACTION.
 * - Stop words checked FIRST: "stop", "freeze", "cancel", "halt" -> STOP_ALL_MOTION (never navigates).
 * - Specific page/viewer actions checked BEFORE generic route navigation aliases.
 * - Handles synonyms: "t one c e" -> "t1ce", "flare" -> "flair", "transverse" -> "axial".
 */

import { ROUTES, SCROLL_CONFIG, VIEWER_CONSTRAINTS } from './registry.js';

const WORD_TO_NUM = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, hundred: 100,
};

/**
 * Normalizes input speech transcripts.
 */
export function normalizeTranscript(text) {
  if (!text || typeof text !== 'string') return '';

  let norm = text.toLowerCase().trim();

  // Strip conversational fillers
  norm = norm.replace(/\b(can you please|please can you|could you please|please|can you|could you|i want to|would you|take me to|show me|let's|lets|go to the|open the|go to|open|show|display|navigate to|switch to the|switch to)\b/gi, ' ');

  // Standardize common medical/speech misrecognitions
  norm = norm.replace(/\bt\s*one\s*c\s*e\b/gi, 't1ce');
  norm = norm.replace(/\bt\s*1\s*c\s*e\b/gi, 't1ce');
  norm = norm.replace(/\bt\s*one\s*post\b/gi, 't1ce');
  norm = norm.replace(/\bt\s*1\s*post\b/gi, 't1ce');
  norm = norm.replace(/\bt\s*one\s*contrast\b/gi, 't1ce');
  norm = norm.replace(/\bt\s*1\s*contrast\b/gi, 't1ce');
  norm = norm.replace(/\bt\s*one\b/gi, 't1');
  norm = norm.replace(/\bt\s*1\b/gi, 't1');
  norm = norm.replace(/\bt\s*two\b/gi, 't2');
  norm = norm.replace(/\bt\s*2\b/gi, 't2');
  norm = norm.replace(/\bflare\b/gi, 'flair');
  norm = norm.replace(/\bsagital\b/gi, 'sagittal');
  norm = norm.replace(/\btransverse\b/gi, 'axial');
  norm = norm.replace(/\bwhole tumor\b/gi, 'wt');
  norm = norm.replace(/\btumor core\b/gi, 'tc');
  norm = norm.replace(/\benhancing tumor\b/gi, 'et');

  // Collapse extra spaces and clean punctuation (preserve numbers, hyphens, and %)
  norm = norm.replace(/[^\w\s%.-]/g, ' ').replace(/\s+/g, ' ').trim();

  return norm;
}

/**
 * Converts spoken number words into integer values.
 */
export function parseSpokenNumber(str) {
  if (str === null || str === undefined) return null;
  const s = String(str).trim().toLowerCase();
  if (s === '') return null;
  const direct = parseInt(s, 10);
  if (!isNaN(direct) && String(direct) === s) return direct;

  const parts = s.split(/[\s-]+/);
  let total = 0;
  let current = 0;
  let matchedAny = false;

  for (const part of parts) {
    if (WORD_TO_NUM[part] !== undefined) {
      matchedAny = true;
      const val = WORD_TO_NUM[part];
      if (val === 100) {
        current = (current || 1) * 100;
      } else {
        current += val;
      }
    } else {
      const num = parseInt(part, 10);
      if (!isNaN(num)) {
        matchedAny = true;
        current += num;
      }
    }
  }

  total += current;
  return matchedAny ? total : (!isNaN(direct) ? direct : null);
}

/**
 * Core Parser Function.
 * Returns { success: boolean, action: Object|null, error: string|null }
 */
export function parseVoiceCommand(rawTranscript, context = {}) {
  if (!rawTranscript || typeof rawTranscript !== 'string') {
    return { success: false, action: null, error: 'Empty transcript' };
  }

  const rawLower = rawTranscript.toLowerCase().trim();
  const normalized = normalizeTranscript(rawTranscript);

  // 1. NEGATION CHECK (FIRST PRIORITY)
  // Statements containing "don't", "never", "do not" MUST NEVER execute navigation or actions!
  if (/\b(don'?t|do not|never|should not|must not|cancel that)\b/i.test(rawLower)) {
    if (context.pendingConfirmation) {
      return {
        success: true,
        action: {
          type: 'CANCEL_PENDING_ACTION',
          label: 'Pending action cancelled',
          feedback: 'Action cancelled',
        },
      };
    }
    return {
      success: true,
      action: {
        type: 'NO_ACTION',
        label: 'Negation detected - no action performed',
        feedback: 'Action ignored',
      },
    };
  }

  // 2. TWO-PHASE SAFETY CONFIRMATION RESPONSE
  if (context.pendingConfirmation) {
    if (/\b(confirm|yes|proceed|do it|approve|agree|go ahead)\b/i.test(rawLower)) {
      return {
        success: true,
        action: {
          type: 'CONFIRM_PENDING_ACTION',
          pendingType: context.pendingConfirmation.type,
          label: `Confirmed: ${context.pendingConfirmation.type}`,
          feedback: 'Action confirmed and executed',
        },
      };
    }
    if (/\b(cancel|no|abort|stop|reject|decline)\b/i.test(rawLower)) {
      return {
        success: true,
        action: {
          type: 'CANCEL_PENDING_ACTION',
          label: 'Action cancelled by user',
          feedback: 'Action cancelled',
        },
      };
    }
  }

  // 3. MOTION STOP WORDS (EVALUATED BEFORE ROUTE NAVIGATION)
  if (/\b(stop rotating|stop spinning|stop camera)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'STOP_ROTATION',
        label: 'Stop 3D camera rotation',
        feedback: 'Camera rotation stopped',
      },
    };
  }

  // "stop", "freeze", "pause", "halt", "cancel" halt continuous motion and NEVER navigate!
  if (/^(stop|stop scrolling|freeze|freeze view|pause|halt|cancel|enough)$/i.test(normalized) ||
      /^(stop|freeze|halt)$/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'STOP_ALL_MOTION',
        label: 'Stop continuous motion',
        feedback: 'Motion stopped',
      },
    };
  }

  // 4. ASSISTANT LIFECYCLE, STATUS QUERIES & CONTROL (SECTION 23)
  if (/\b(are you listening)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'STATUS_QUERY',
        query: 'is_listening',
        label: 'Query listening state',
        feedback: context.isListening ? "Yes, I am actively listening for your commands." : "No, microphone recognition is currently stopped.",
      },
    };
  }

  if (/\b(what is your (current )?status|current status|assistant status)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'STATUS_QUERY',
        query: 'current_status',
        label: 'Query assistant status',
        feedback: `The voice assistant is ${context.isListening ? 'active and listening' : 'on standby'}.`,
      },
    };
  }

  if (/\b(why did the assistant activate|why did you activate|why are you listening)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'STATUS_QUERY',
        query: 'why_activated',
        label: 'Query activation reason',
        feedback: context.activationReason || "Voice assistant was activated by your requested command.",
      },
    };
  }

  if (/\b(why did the assistant stop|why did you stop|why did listening stop)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'STATUS_QUERY',
        query: 'why_stopped',
        label: 'Query stop reason',
        feedback: context.stopReason || "Voice listening stopped as requested.",
      },
    };
  }

  if (/\b(why did the assistant close|why did you close)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'STATUS_QUERY',
        query: 'why_closed',
        label: 'Query closure reason',
        feedback: context.closureReason || "Voice assistant closed because you requested it.",
      },
    };
  }

  if (/\b(open voice assistant|activate voice assistant|start voice assistance|start listening)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'ASSISTANT_LIFECYCLE',
        operation: 'start',
        label: 'Activate voice assistant',
        feedback: "Microphone activated. I'm listening for your commands.",
      },
    };
  }

  if (/\b(pause voice assistance|pause voice)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'ASSISTANT_LIFECYCLE',
        operation: 'pause',
        label: 'Pause voice assistance',
        feedback: "Voice assistance is paused. Say resume listening when you're ready.",
      },
    };
  }

  if (/\b(resume voice assistance|resume listening|resume voice)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'ASSISTANT_LIFECYCLE',
        operation: 'resume',
        label: 'Resume voice assistance',
        feedback: "Voice assistance has resumed. I'm ready for your next command.",
      },
    };
  }

  if (/\b(close voice assistant|exit voice assistant|deactivate voice assistant)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'ASSISTANT_LIFECYCLE',
        operation: 'close',
        label: 'Close voice assistant',
        feedback: "Closing the voice assistant as requested.",
      },
    };
  }

  // 5. SIDEBAR COLLAPSE & EXPAND (SECTION 10)
  if (/\b(collapse sidebar|hide sidebar|close sidebar|minimize navigation|hide navigation panel|collapse navigation)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'TOGGLE_SIDEBAR',
        collapsed: true,
        label: 'Collapse Sidebar',
        feedback: 'Sidebar collapsed',
      },
    };
  }

  if (/\b(expand sidebar|show sidebar|open sidebar|restore navigation|expand navigation|show navigation panel)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'TOGGLE_SIDEBAR',
        collapsed: false,
        label: 'Expand Sidebar',
        feedback: 'Sidebar expanded',
      },
    };
  }

  // 6. FULLSCREEN MAXIMIZE & MINIMIZE / RESTORE (SECTION 5)
  if (/\b(maximize viewer|maximize 3d view|maximize 3d model|go full screen|open full screen|expand viewer|expand 3d model|make it bigger|use entire screen|show full view|enter presentation view|full screen)\b/i.test(rawLower) ||
      /^(maximize)$/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'FULLSCREEN',
        enabled: true,
        target: '3d',
        label: 'Maximize 3D viewer',
        feedback: '3D viewer maximized',
      },
    };
  }

  if (/\b(minimize viewer|restore viewer|exit full screen|close full screen|normal screen|normal view|return to normal|reduce viewer|collapse maximized view|restore normal layout|back to regular view)\b/i.test(rawLower) ||
      /^(minimize)$/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'FULLSCREEN',
        enabled: false,
        label: 'Restore normal viewer layout',
        feedback: 'Restored normal embedded layout',
      },
    };
  }

  // 7. SYSTEM & MANUAL CONTROLS
  if (/\b(stop listening|mute microphone|turn off microphone|stop voice|pause microphone)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'STOP_LISTENING',
        label: 'Stop voice recognition',
        feedback: 'Microphone paused',
      },
    };
  }

  if (/\b(open manual|voice manual|show manual|voice help|show commands|command guide|help manual|open voice manual)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'OPEN_MANUAL',
        label: 'Open Voice Control Manual',
        feedback: 'Opening voice manual',
      },
    };
  }

  if (/\b(close manual|hide manual|close help|hide help|dismiss manual)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'CLOSE_MANUAL',
        label: 'Close Voice Control Manual',
        feedback: 'Closing manual',
      },
    };
  }

  if (/\b(reload website|refresh page|reload page|refresh website|reload app|refresh this page|reload this page)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'RELOAD_WEBSITE',
        label: 'Reload Application',
        feedback: 'Reloading website',
      },
    };
  }

  if (/\b(go back|previous page|back page|return back)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'NAVIGATE_HISTORY',
        direction: 'back',
        label: 'Go back in history',
        feedback: 'Navigating back',
      },
    };
  }

  if (/\b(go forward|forward page|next page in history)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'NAVIGATE_HISTORY',
        direction: 'forward',
        label: 'Go forward in history',
        feedback: 'Navigating forward',
      },
    };
  }

  // 5. CONTINUOUS SCROLLING & SPEED ADJUSTMENT
  if (/\b(keep scrolling down|continuous scroll down|auto scroll down|start scrolling down)\b/i.test(rawLower) ||
      /\bkeep scrolling\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'START_CONTINUOUS_SCROLL',
        direction: 'down',
        speed: SCROLL_CONFIG.continuousSpeed,
        label: 'Continuous scroll down',
        feedback: 'Scrolling down',
      },
    };
  }

  if (/\b(keep scrolling up|continuous scroll up|keep going up|start scrolling up)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'START_CONTINUOUS_SCROLL',
        direction: 'up',
        speed: SCROLL_CONFIG.continuousSpeed,
        label: 'Continuous scroll up',
        feedback: 'Scrolling up',
      },
    };
  }

  if (/\b(scroll faster|faster scroll|speed up scroll)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'START_CONTINUOUS_SCROLL',
        speed: SCROLL_CONFIG.continuousSpeedFast,
        label: 'Scroll faster',
        feedback: 'Accelerating scroll',
      },
    };
  }

  // 6. CARDINAL SCROLLING (TOP / BOTTOM)
  if (/\b(scroll to (the )?top|go to (the )?top( of the page)?|top of page|jump to top)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SCROLL_CARDINAL',
        position: 'top',
        label: 'Scroll to top',
        feedback: 'Scrolled to top',
      },
    };
  }

  if (/\b(scroll to (the )?bottom|go to (the )?bottom( of the page)?|bottom of page|jump to bottom)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SCROLL_CARDINAL',
        position: 'bottom',
        label: 'Scroll to bottom',
        feedback: 'Scrolled to bottom',
      },
    };
  }

  // 7. SCREEN RATIO SCROLLING
  if (/\b(scroll (one )?screen down|next screen)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SCROLL_STEP',
        direction: 'down',
        isScreen: true,
        label: 'Scroll one screen down',
        feedback: 'Page down',
      },
    };
  }

  if (/\b(scroll (one )?screen up|previous screen)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SCROLL_STEP',
        direction: 'up',
        isScreen: true,
        label: 'Scroll one screen up',
        feedback: 'Page up',
      },
    };
  }

  // 8. DISCRETE STEP SCROLLING
  if (/\b(scroll down a lot|scroll way down|big scroll down)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SCROLL_STEP',
        direction: 'down',
        amount: SCROLL_CONFIG.largeStep,
        label: 'Large scroll down',
        feedback: 'Scrolled down',
      },
    };
  }

  if (/\b(scroll up a lot|scroll way up|big scroll up)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SCROLL_STEP',
        direction: 'up',
        amount: SCROLL_CONFIG.largeStep,
        label: 'Large scroll up',
        feedback: 'Scrolled up',
      },
    };
  }

  if (/\b(scroll down a (little|bit|few)|scroll down slightly|nudge down)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SCROLL_STEP',
        direction: 'down',
        amount: SCROLL_CONFIG.smallStep,
        label: 'Small scroll down',
        feedback: 'Scrolled down slightly',
      },
    };
  }

  if (/\b(scroll up a (little|bit|few)|scroll up slightly|nudge up)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SCROLL_STEP',
        direction: 'up',
        amount: SCROLL_CONFIG.smallStep,
        label: 'Small scroll up',
        feedback: 'Scrolled up slightly',
      },
    };
  }

  if (/\b(scroll down|page down|scroll downward|go down|move down)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SCROLL_STEP',
        direction: 'down',
        amount: SCROLL_CONFIG.normalStep,
        label: 'Scroll down',
        feedback: 'Scrolled down',
      },
    };
  }

  if (/\b(scroll up|page up|scroll upward|go up|move up)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SCROLL_STEP',
        direction: 'up',
        amount: SCROLL_CONFIG.normalStep,
        label: 'Scroll up',
        feedback: 'Scrolled up',
      },
    };
  }

  // 9. 3D WORKSPACE LAYOUT & RESET (PRIORITY OVER GENERIC ROUTE NAVIGATION)
  if (/\b(reset view|reset viewer|reset all views|default view|reset layout)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'RESET_VIEW',
        label: 'Reset 3D and MPR views',
        feedback: 'Views reset to default',
      },
    };
  }

  if (/\b(quad view|quad reconstruction|quad mpr|multiplanar view|4 view|all views)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SET_LAYOUT',
        value: 'quad',
        label: 'Switch to Quad MPR View',
        feedback: 'Quad view enabled',
      },
    };
  }

  if (/\b(axial view|transverse view|z axis view|maximize axial|axial plane)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SET_LAYOUT',
        value: 'axial',
        label: 'Maximize Axial Slice View',
        feedback: 'Axial view active',
      },
    };
  }

  if (/\b(coronal view|frontal view|y axis view|maximize coronal|coronal plane)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SET_LAYOUT',
        value: 'coronal',
        label: 'Maximize Coronal Slice View',
        feedback: 'Coronal view active',
      },
    };
  }

  if (/\b(sagittal view|x axis view|maximize sagittal|sagittal plane)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SET_LAYOUT',
        value: 'sagittal',
        label: 'Maximize Sagittal Slice View',
        feedback: 'Sagittal view active',
      },
    };
  }

  if (/\b(show 3d volume|3d volume|maximize 3d|show 3d model|3d surface|volumetric view)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SET_LAYOUT',
        value: '3d',
        label: 'Maximize 3D Volumetric View',
        feedback: '3D volume maximized',
      },
    };
  }

  // 10. CAMERA ROTATION, ZOOM & PAN
  if (/\b(spin 3d view|spin view|continuous rotation|start spinning|keep rotating)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'START_CONTINUOUS_ROTATION',
        direction: 'right',
        label: 'Start continuous 3D rotation',
        feedback: 'Spinning 3D view',
      },
    };
  }

  if (/\b(stop rotating|stop spinning|stop camera)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'STOP_ROTATION',
        label: 'Stop 3D camera rotation',
        feedback: 'Camera rotation stopped',
      },
    };
  }

  if (/\b(rotate right|rotate clockwise|turn right)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'ROTATE_ONCE',
        direction: 'right',
        degrees: 15,
        label: 'Rotate 3D view right 15°',
        feedback: 'Rotated right',
      },
    };
  }

  if (/\b(rotate left|rotate counterclockwise|turn left)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'ROTATE_ONCE',
        direction: 'left',
        degrees: 15,
        label: 'Rotate 3D view left 15°',
        feedback: 'Rotated left',
      },
    };
  }

  if (/\b(zoom in|magnify|zoom closer|closer view)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'ZOOM',
        factor: 1.2,
        label: 'Zoom in 20%',
        feedback: 'Zoomed in',
      },
    };
  }

  if (/\b(zoom out|shrink|zoom farther|step back(?!\s*(?:\d+|[a-z0-9-]+)?\s*slices?))\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'ZOOM',
        factor: 0.8,
        label: 'Zoom out 20%',
        feedback: 'Zoomed out',
      },
    };
  }

  if (/\b(pan left|move camera left|shift left)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'PAN',
        dx: -30,
        dy: 0,
        label: 'Pan left',
        feedback: 'Panned left',
      },
    };
  }

  if (/\b(pan right|move camera right|shift right)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'PAN',
        dx: 30,
        dy: 0,
        label: 'Pan right',
        feedback: 'Panned right',
      },
    };
  }

  if (/\b(center view|center image|recenter|center (the )?brain|fit brain to screen|fit to screen)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'CENTER_VIEW',
        label: 'Center view and reset zoom',
        feedback: 'View centered',
      },
    };
  }

  if (/\b(rotate up|look up|tilt upward|rotate upward|tilt up|camera up)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'ROTATE_ONCE',
        direction: 'up',
        degrees: 15,
        label: 'Rotate camera up',
        feedback: 'Rotating 3D camera up',
      },
    };
  }

  if (/\b(rotate down|look down|tilt downward|rotate downward|tilt down|camera down)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'ROTATE_ONCE',
        direction: 'down',
        degrees: 15,
        label: 'Rotate camera down',
        feedback: 'Rotating 3D camera down',
      },
    };
  }

  if (/\b(rotate 90 degrees right|turn 90 degrees right|quarter turn right|rotate right 90 degrees|turn right 90 degrees)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'ROTATE_ONCE',
        direction: 'right',
        degrees: 90,
        label: 'Rotate 3D view right 90°',
        feedback: 'Rotated right 90 degrees',
      },
    };
  }

  if (/\b(rotate 90 degrees left|turn 90 degrees left|quarter turn left|rotate left 90 degrees|turn left 90 degrees)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'ROTATE_ONCE',
        direction: 'left',
        degrees: 90,
        label: 'Rotate 3D view left 90°',
        feedback: 'Rotated left 90 degrees',
      },
    };
  }

  // Anatomical Camera Angle Presets (Anterior, Posterior, Superior, Inferior, Lateral)
  if (/\b(anterior view|front view|look from front|anterior perspective|front aspect)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SET_CAMERA_ANGLE',
        angle: 'anterior',
        label: 'Anterior (Front) View',
        feedback: 'Camera set to anterior view',
      },
    };
  }

  if (/\b(posterior view|back view|look from back|posterior perspective|rear view)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SET_CAMERA_ANGLE',
        angle: 'posterior',
        label: 'Posterior (Back) View',
        feedback: 'Camera set to posterior view',
      },
    };
  }

  if (/\b(superior view|top view|look from top|look from above|superior perspective|top down view|view from top)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SET_CAMERA_ANGLE',
        angle: 'superior',
        label: 'Superior (Top) View',
        feedback: 'Camera set to superior view',
      },
    };
  }

  if (/\b(inferior view|bottom view|look from bottom|look from below|inferior perspective|bottom up view|underside view)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SET_CAMERA_ANGLE',
        angle: 'inferior',
        label: 'Inferior (Bottom) View',
        feedback: 'Camera set to inferior view',
      },
    };
  }

  if (/\b(lateral view|side view|profile view|lateral perspective|side perspective|left lateral view|right lateral view|medial view)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SET_CAMERA_ANGLE',
        angle: 'lateral',
        label: 'Lateral (Side) View',
        feedback: 'Camera set to lateral view',
      },
    };
  }

  // Brain Appearance Presets (Section 25)
  // 1: Anatomical Regions ("regions", "multi-shade lobes", "option 1")
  // 2: Natural Anatomy ("natural", "unified cortex", "option 2")
  // 3: Anatomical Contrast ("contrast", "high relief", "option 3")
  // 4: Original Appearance ("original", "monochrome", "option 4")
  if (/\b(list brain appearances|what appearances are available|appearance options|list appearances|available appearances|show (me )?(the )?available brain appearances|show available brain appearances)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'LIST_BRAIN_APPEARANCES',
        label: 'List Brain Appearances',
        feedback: 'Available appearances are 1: Anatomical Regions, 2: Natural Anatomy, 3: Anatomical Contrast, and 4: Original Appearance.',
      },
    };
  }

  if (/\b(change brain appearance|change appearance|switch appearance|appearance mode)\b/i.test(rawLower) &&
      !/\b(next|previous|cycle|regions|natural|contrast|original|option|one|two|three|four)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'PROMPT_APPEARANCE_SELECTION',
        label: 'Prompt Brain Appearance Selection',
        feedback: 'Available appearances are 1: Anatomical Regions, 2: Natural Anatomy, 3: Anatomical Contrast, and 4: Original Appearance. Which would you like?',
      },
    };
  }

  if (/\b(anatomical regions|multi shade lobes|brain appearance 1|appearance 1|appearance one|option 1|option one|regions appearance|show first appearance|first appearance)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SET_BRAIN_APPEARANCE',
        mode: 'regions',
        label: 'Set Brain Appearance: Anatomical Regions',
        feedback: 'Brain appearance set to Anatomical Regions',
      },
    };
  }

  if (/\b(natural anatomy|unified cortex|brain appearance 2|appearance 2|appearance two|option 2|option two|natural appearance|show second appearance|second appearance)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SET_BRAIN_APPEARANCE',
        mode: 'natural',
        label: 'Set Brain Appearance: Natural Anatomy',
        feedback: 'Brain appearance set to Natural Anatomy',
      },
    };
  }

  if (/\b(anatomical contrast|high relief|brain appearance 3|appearance 3|appearance three|option 3|option three|contrast appearance|show third appearance|third appearance)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SET_BRAIN_APPEARANCE',
        mode: 'contrast',
        label: 'Set Brain Appearance: Anatomical Contrast',
        feedback: 'Brain appearance set to Anatomical Contrast',
      },
    };
  }

  if (/\b(original appearance|monochrome appearance|brain appearance 4|appearance 4|appearance four|option 4|option four|default brain appearance|show fourth appearance|fourth appearance|original clinical appearance)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SET_BRAIN_APPEARANCE',
        mode: 'original',
        label: 'Set Brain Appearance: Original Appearance',
        feedback: 'Brain appearance set to Original Appearance',
      },
    };
  }

  if (/\b(next appearance|cycle appearance|next brain appearance|cycle brain appearance)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SET_BRAIN_APPEARANCE',
        mode: 'cycle',
        direction: 'next',
        label: 'Cycle to next brain appearance',
        feedback: 'Cycled to next appearance',
      },
    };
  }

  if (/\b(previous appearance|previous brain appearance)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SET_BRAIN_APPEARANCE',
        mode: 'cycle',
        direction: 'prev',
        label: 'Cycle to previous brain appearance',
        feedback: 'Cycled to previous appearance',
      },
    };
  }

  // 11. MRI MODALITIES
  if (/\b(show flair|switch to flair|flair modality|flair sequence|flair scan)\b/i.test(rawLower) || normalized === 'flair') {
    return {
      success: true,
      action: {
        type: 'SET_MODALITY',
        value: 'flair',
        label: 'Switch to T2-FLAIR Modality',
        feedback: 'FLAIR sequence selected',
      },
    };
  }

  if (/\b(show t1ce|switch to t1ce|t1ce modality|contrast enhanced|t1 contrast|t1 post contrast|t one c e)\b/i.test(rawLower) || normalized === 't1ce') {
    return {
      success: true,
      action: {
        type: 'SET_MODALITY',
        value: 't1ce',
        label: 'Switch to T1ce Modality',
        feedback: 'T1ce sequence selected',
      },
    };
  }

  if (/\b(show t1|switch to t1|t1 modality|t1 pre contrast)\b/i.test(rawLower) || normalized === 't1') {
    return {
      success: true,
      action: {
        type: 'SET_MODALITY',
        value: 't1',
        label: 'Switch to T1 Modality',
        feedback: 'T1 sequence selected',
      },
    };
  }

  if (/\b(show t2|switch to t2|t2 modality|t2 weighted)\b/i.test(rawLower) || normalized === 't2') {
    return {
      success: true,
      action: {
        type: 'SET_MODALITY',
        value: 't2',
        label: 'Switch to T2 Modality',
        feedback: 'T2 sequence selected',
      },
    };
  }

  if (/\b(show ct|switch to ct|computed tomography|ct scan)\b/i.test(rawLower) || normalized === 'ct') {
    return {
      success: true,
      action: {
        type: 'SET_MODALITY',
        value: 'ct',
        label: 'Switch to CT Modality',
        feedback: 'CT scan sequence selected',
      },
    };
  }

  if (/\b(cycle modality|next modality|switch modality)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'CYCLE_MODALITY',
        label: 'Cycle to next MRI modality',
        feedback: 'Modality cycled',
      },
    };
  }

  // 12. PANELS, LAYERS, SUBREGIONS & OPACITY
  // Panel Controls (Checked before generic route navigation)
  if (/\b(show both panels|show both layers and volumetrics|show layers and volumetrics|expand both panels|all panels|display layers and measurements|open layer and volume information|show layers and burden)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SHOW_LAYERS_AND_VOLUMETRICS',
        label: 'Show Layers and Volumetrics',
        feedback: 'Showing both layers and volumetrics',
      },
    };
  }

  if (/\b(show volumetrics panel|open volumetrics panel|volumetrics tab|show volumetrics|show tumor burden|open volumetrics|switch to volumetrics|tumor burden)\b/i.test(rawLower) || normalized === 'volumetrics') {
    return {
      success: true,
      action: {
        type: 'SHOW_VOLUMETRICS_PANEL',
        label: 'Show Volumetrics Panel',
        feedback: 'Volumetrics panel active',
      },
    };
  }

  if (/\b(hide layers panel|close layers panel|hide layers tab|hide layers|close layers)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'HIDE_LAYERS_PANEL',
        label: 'Hide Layers Panel',
        feedback: 'Layers panel closed',
      },
    };
  }

  if (/\b(show layers panel|open layers panel|layers tab|show layers|open layers|go to layers|switch to layers|display layer controls)\b/i.test(rawLower) || normalized === 'layers') {
    return {
      success: true,
      action: {
        type: 'SHOW_LAYERS_PANEL',
        label: 'Show Layers Panel',
        feedback: 'Layers panel active',
      },
    };
  }

  // Subregions (WT, TC, ET) - Must be checked BEFORE generic "show tumor" segmentation overlay!
  if (/\b(show|enable|turn on)\s*(wt|whole tumor)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'TOGGLE_SUBREGION',
        key: 'WT',
        enabled: true,
        label: 'Show Whole Tumor (WT)',
        feedback: 'Whole Tumor visible',
      },
    };
  }

  if (/\b(hide|disable|turn off)\s*(wt|whole tumor)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'TOGGLE_SUBREGION',
        key: 'WT',
        enabled: false,
        label: 'Hide Whole Tumor (WT)',
        feedback: 'Whole Tumor hidden',
      },
    };
  }

  if (/\btoggle\s*(wt|whole tumor)\b/i.test(rawLower) || rawLower === 'wt' || rawLower === 'whole tumor') {
    return {
      success: true,
      action: {
        type: 'TOGGLE_SUBREGION',
        key: 'WT',
        label: 'Toggle Whole Tumor (WT)',
        feedback: 'Toggled Whole Tumor',
      },
    };
  }

  if (/\b(show|enable|turn on)\s*(tc|tumor core)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'TOGGLE_SUBREGION',
        key: 'TC',
        enabled: true,
        label: 'Show Tumor Core (TC)',
        feedback: 'Tumor Core visible',
      },
    };
  }

  if (/\b(hide|disable|turn off)\s*(tc|tumor core)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'TOGGLE_SUBREGION',
        key: 'TC',
        enabled: false,
        label: 'Hide Tumor Core (TC)',
        feedback: 'Tumor Core hidden',
      },
    };
  }

  if (/\btoggle\s*(tc|tumor core)\b/i.test(rawLower) || rawLower === 'tc' || rawLower === 'tumor core') {
    return {
      success: true,
      action: {
        type: 'TOGGLE_SUBREGION',
        key: 'TC',
        label: 'Toggle Tumor Core (TC)',
        feedback: 'Toggled Tumor Core',
      },
    };
  }

  if (/\b(show|enable|turn on)\s*(et|enhancing tumor)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'TOGGLE_SUBREGION',
        key: 'ET',
        enabled: true,
        label: 'Show Enhancing Tumor (ET)',
        feedback: 'Enhancing Tumor visible',
      },
    };
  }

  if (/\b(hide|disable|turn off)\s*(et|enhancing tumor)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'TOGGLE_SUBREGION',
        key: 'ET',
        enabled: false,
        label: 'Hide Enhancing Tumor (ET)',
        feedback: 'Enhancing Tumor hidden',
      },
    };
  }

  if (/\btoggle\s*(et|enhancing tumor)\b/i.test(rawLower) || rawLower === 'et' || rawLower === 'enhancing tumor') {
    return {
      success: true,
      action: {
        type: 'TOGGLE_SUBREGION',
        key: 'ET',
        label: 'Toggle Enhancing Tumor (ET)',
        feedback: 'Toggled Enhancing Tumor',
      },
    };
  }

  // Segmentation Overlays & Opacity
  if (/\b(show segmentation|enable segmentation|turn on overlay|show mask|show tumor|enable mask)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SET_SEGMENTATION',
        enabled: true,
        label: 'Show segmentation overlay',
        feedback: 'Segmentation overlay visible',
      },
    };
  }

  if (/\b(hide segmentation|disable segmentation|turn off overlay|hide mask|hide tumor)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SET_SEGMENTATION',
        enabled: false,
        label: 'Hide segmentation overlay',
        feedback: 'Segmentation overlay hidden',
      },
    };
  }

  if (/\b(toggle segmentation|toggle overlay|toggle mask)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'TOGGLE_SEGMENTATION',
        label: 'Toggle segmentation overlay',
        feedback: 'Toggled segmentation',
      },
    };
  }

  if (/\b(increase opacity|more opacity|raise opacity|make overlay brighter|brighter overlay|make tumor more visible)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'STEP_OPACITY',
        delta: 0.1,
        label: 'Increase overlay opacity',
        feedback: 'Opacity increased',
      },
    };
  }

  if (/\b(decrease opacity|less opacity|lower opacity|reduce opacity|make overlay dimmer|dimmer overlay|make tumor more transparent)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'STEP_OPACITY',
        delta: -0.1,
        label: 'Decrease overlay opacity',
        feedback: 'Opacity decreased',
      },
    };
  }

  if (/\b(?:set\s+)?opacity\b|\boverlay\s+opacity\b/i.test(rawLower)) {
    const opacityMatch = rawLower.match(/opacity\s*(?:to|at)?\s*(\d+)?\s*(?:percent|%)?/i);
    const rawNum = (opacityMatch && opacityMatch[1]) ? parseInt(opacityMatch[1], 10) : 85;
    const clamped = Math.max(0.1, Math.min(1.0, rawNum > 1 ? rawNum / 100 : rawNum));
    return {
      success: true,
      action: {
        type: 'SET_OPACITY',
        value: clamped,
        label: `Set overlay opacity to ${Math.round(clamped * 100)}%`,
        feedback: `Opacity set to ${Math.round(clamped * 100)} percent`,
      },
    };
  }

  // 13. SLICE COORDINATES WITH VOLUME CLAMPING & SPOKEN NUMBERS
  // Multi-coordinate with 3 explicit numbers: "set coordinates 120 120 78" or "coordinates 100 130 80"
  const multiCoordsMatch = rawLower.match(/(?:coordinates?|x\s*y\s*z)(?:\s+to)?\s+(\d+)\s+(\d+)\s+(\d+)/i);
  if (multiCoordsMatch) {
    let x = parseInt(multiCoordsMatch[1], 10);
    let y = parseInt(multiCoordsMatch[2], 10);
    let z = parseInt(multiCoordsMatch[3], 10);

    const maxX = VIEWER_CONSTRAINTS.dimensions.sagittal - 1; // 239
    const maxY = VIEWER_CONSTRAINTS.dimensions.coronal - 1; // 239
    const maxZ = VIEWER_CONSTRAINTS.dimensions.axial - 1; // 154

    // Bounds checking: If explicitly invalid in multi-coords, report error
    if (x < 0 || x > maxX || y < 0 || y > maxY || z < 0 || z > maxZ) {
      return {
        success: false,
        action: null,
        error: `Coordinates (${x}, ${y}, ${z}) out of bounds. Valid ranges: X in [0..239], Y in [0..239], Z in [0..154].`,
      };
    }

    return {
      success: true,
      action: {
        type: 'SET_COORDINATES',
        coordinates: { x, y, z },
        label: `Set coordinates to X:${x}, Y:${y}, Z:${z}`,
        feedback: `Coordinates set to ${x}, ${y}, ${z}`,
      },
    };
  }

  // Bare multi-coordinates commands without digits -> center coordinates
  if (/\b(set coordinates|coordinates to|set x y z|go to coordinates)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SET_COORDINATES',
        coordinates: { x: 120, y: 120, z: 75 },
        label: 'Set coordinates to X:120, Y:120, Z:75',
        feedback: 'Coordinates set to 120, 120, 75',
      },
    };
  }

  // Single axis coordinates (with spoken or digit number or defaulting to center)
  // Axial (Z) [0..154]
  const zMatch = rawLower.match(/(?:axial\s*(?:slice|coordinate)?|slice\s*z|z\s*axis|set\s*z(?:\s*to|\s*coordinate)?|go to axial slice)(?:\s*(?:to\s*)?([a-z0-9\s-]+))?/i);
  if (zMatch && (rawLower.includes('axial') || rawLower.includes('slice z') || rawLower.includes('z axis') || rawLower.includes('set z'))) {
    const rawValStr = zMatch[1] ? zMatch[1].trim() : '';
    const parsedNum = rawValStr ? parseSpokenNumber(rawValStr) : 75;
    const val = parsedNum !== null ? parsedNum : 75;
    const maxZ = VIEWER_CONSTRAINTS.dimensions.axial - 1; // 154
    let clampedVal = val;
    let feedback = `Axial slice set to ${val}`;

    if (val > maxZ) {
      clampedVal = maxZ;
      feedback = `Axial slice clamped to maximum boundary of ${maxZ}.`;
    } else if (val < 0) {
      clampedVal = 0;
      feedback = `Axial slice clamped to minimum boundary of 0.`;
    }

    return {
      success: true,
      action: {
        type: 'SET_AXIS_COORDINATE',
        axis: 'z',
        value: clampedVal,
        label: `Set Axial slice to ${clampedVal}`,
        feedback,
      },
    };
  }

  // Coronal (Y) [0..239]
  const yMatch = rawLower.match(/(?:coronal\s*(?:slice|coordinate)?|slice\s*y|y\s*axis|set\s*y(?:\s*to|\s*coordinate)?|go to coronal slice)(?:\s*(?:to\s*)?([a-z0-9\s-]+))?/i);
  if (yMatch && (rawLower.includes('coronal') || rawLower.includes('slice y') || rawLower.includes('y axis') || rawLower.includes('set y'))) {
    const rawValStr = yMatch[1] ? yMatch[1].trim() : '';
    const parsedNum = rawValStr ? parseSpokenNumber(rawValStr) : 120;
    const val = parsedNum !== null ? parsedNum : 120;
    const maxY = VIEWER_CONSTRAINTS.dimensions.coronal - 1; // 239
    let clampedVal = val;
    let feedback = `Coronal slice set to ${val}`;

    if (val > maxY) {
      clampedVal = maxY;
      feedback = `Coronal slice clamped to maximum boundary of ${maxY}.`;
    } else if (val < 0) {
      clampedVal = 0;
      feedback = `Coronal slice clamped to minimum boundary of 0.`;
    }

    return {
      success: true,
      action: {
        type: 'SET_AXIS_COORDINATE',
        axis: 'y',
        value: clampedVal,
        label: `Set Coronal slice to ${clampedVal}`,
        feedback,
      },
    };
  }

  // Sagittal (X) [0..239]
  const xMatch = rawLower.match(/(?:sagittal\s*(?:slice|coordinate)?|slice\s*x|x\s*axis|set\s*x(?:\s*to|\s*coordinate)?|go to sagittal slice)(?:\s*(?:to\s*)?([a-z0-9\s-]+))?/i);
  if (xMatch && (rawLower.includes('sagittal') || rawLower.includes('slice x') || rawLower.includes('x axis') || rawLower.includes('set x'))) {
    const rawValStr = xMatch[1] ? xMatch[1].trim() : '';
    const parsedNum = rawValStr ? parseSpokenNumber(rawValStr) : 120;
    const val = parsedNum !== null ? parsedNum : 120;
    const maxX = VIEWER_CONSTRAINTS.dimensions.sagittal - 1; // 239
    let clampedVal = val;
    let feedback = `Sagittal slice set to ${val}`;

    if (val > maxX) {
      clampedVal = maxX;
      feedback = `Sagittal slice clamped to maximum boundary of ${maxX}.`;
    } else if (val < 0) {
      clampedVal = 0;
      feedback = `Sagittal slice clamped to minimum boundary of 0.`;
    }

    return {
      success: true,
      action: {
        type: 'SET_AXIS_COORDINATE',
        axis: 'x',
        value: clampedVal,
        label: `Set Sagittal slice to ${clampedVal}`,
        feedback,
      },
    };
  }

  // Relative slice stepping with count
  const stepForwardMatch = rawLower.match(/(?:step forward|next slice|slice up|forward slice)(?:\s*(?:by)?\s*([a-z0-9\s-]+)\s*(?:slices)?)?/i);
  if (stepForwardMatch && (rawLower.includes('step forward') || rawLower.includes('next slice') || rawLower.includes('slice up') || rawLower.includes('forward slice'))) {
    const parsedStep = stepForwardMatch[1] ? parseSpokenNumber(stepForwardMatch[1]) : 1;
    const step = parsedStep && parsedStep > 0 ? parsedStep : 1;
    return {
      success: true,
      action: {
        type: 'STEP_SLICE',
        step,
        label: `Step forward ${step} slice${step > 1 ? 's' : ''}`,
        feedback: `Stepped forward ${step} slice${step > 1 ? 's' : ''}`,
      },
    };
  }

  const stepBackMatch = rawLower.match(/(?:step back(?:\s*slice)?|previous slice|slice down|back slice)(?:\s*(?:by)?\s*([a-z0-9\s-]+)\s*(?:slices)?)?/i);
  if (stepBackMatch && (rawLower.includes('step back') || rawLower.includes('previous slice') || rawLower.includes('slice down') || rawLower.includes('back slice'))) {
    const parsedStep = stepBackMatch[1] ? parseSpokenNumber(stepBackMatch[1]) : 1;
    const step = parsedStep && parsedStep > 0 ? parsedStep : 1;
    return {
      success: true,
      action: {
        type: 'STEP_SLICE',
        step: -step,
        label: `Step back ${step} slice${step > 1 ? 's' : ''}`,
        feedback: `Stepped back ${step} slice${step > 1 ? 's' : ''}`,
      },
    };
  }

  if (/\b(center slice|middle slice|go to center|reset slice coordinates)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'GOTO_CENTER_SLICE',
        label: 'Center slice coordinates',
        feedback: 'Centered slices',
      },
    };
  }

  // 14. PATIENT / CASE SELECTION & LISTING (SECTION 24)
  if (/\b(list patients|what patients are available|available patients|patient list|show patients|show (the )?patient list|show available patients)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SELECT_CASE',
        query: 'list',
        label: 'List Available Patients',
        feedback: 'Available patients include BraTS2021_01017, 01018, and cohort cases up to 01072.',
      },
    };
  }

  if (/\b(next case|next patient|load next patient)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SELECT_CASE',
        direction: 'next',
        label: 'Select next patient case',
        feedback: 'Loading next patient',
      },
    };
  }

  if (/\b(previous case|previous patient|load previous patient)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SELECT_CASE',
        direction: 'prev',
        label: 'Select previous patient case',
        feedback: 'Loading previous patient',
      },
    };
  }

  if (/\b(select\s*case|open\s*case|load\s*case|load\s*patient|case\s*id|patient\s*case|select\s*patient|open\s*patient|switch\s*patient|show\s*patient|go\s*to\s*patient|display\s*patient\s*results|find\s*patient|search\s*for\s*patient|load\s*brats\s*patient|open\s*brats\s*patient)\b/i.test(rawLower)) {
    const caseIdMatch = rawLower.match(/(?:select\s*case|open\s*case|load\s*case|load\s*patient|case\s*id|patient\s*case|select\s*patient|open\s*patient|switch\s*patient|show\s*patient|go\s*to\s*patient|display\s*patient\s*results|find\s*patient|search\s*for\s*patient|load\s*brats\s*patient|open\s*brats\s*patient)\s*(?:brats\d*[_ -]*)?([a-z0-9\s-]+)?/i);
    const rawIdStr = (caseIdMatch && caseIdMatch[1]) ? caseIdMatch[1].trim() : '';
    let resolvedId = rawIdStr || '01017';
    if (!/^\d+$/.test(resolvedId) && !resolvedId.startsWith('brats')) {
      const spokenNum = parseSpokenNumber(resolvedId);
      if (spokenNum !== null) resolvedId = String(spokenNum);
    }
    return {
      success: true,
      action: {
        type: 'SELECT_CASE',
        query: resolvedId,
        label: `Select patient case ${resolvedId}`,
        feedback: `Selected case ${resolvedId}`,
      },
    };
  }

  // 15. MODEL LAB METRIC TABS
  if (/\b(show dice metrics|switch to dice comparison|dice comparison|dice scores|switch to dice)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SET_MODEL_METRIC_TAB',
        tab: 'dice',
        label: 'Switch Model Lab to Dice Metrics',
        feedback: 'Dice metrics selected',
      },
    };
  }

  if (/\b(show hd95 metrics|switch to hausdorff distance|show hd95|hausdorff distance|hd95 metrics|switch to hd95)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'SET_MODEL_METRIC_TAB',
        tab: 'hd95',
        label: 'Switch Model Lab to HD95 Metrics',
        feedback: 'HD95 metrics selected',
      },
    };
  }

  // 16. ADAPTIVE LEARNING CONFIRMATION-GUARDED ACTIONS
  if (/\b(start training|start retraining|train model|trigger fine tuning)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'REQUEST_CONFIRMATION',
        pendingType: 'START_TRAINING',
        prompt: 'Are you sure you want to trigger fine-tuning on approved corrections? Say "Confirm" to proceed.',
        label: 'Request confirmation: Start Fine-Tuning',
        feedback: 'Confirmation required to start training. Say confirm to proceed.',
      },
    };
  }

  if (/\b(promote candidate|promote model candidate|deploy candidate model|promote model)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'REQUEST_CONFIRMATION',
        pendingType: 'PROMOTE_CANDIDATE',
        prompt: 'Are you sure you want to promote candidate model to production? Say "Confirm" to proceed.',
        label: 'Request confirmation: Promote Model Candidate',
        feedback: 'Confirmation required to promote model. Say confirm to proceed.',
      },
    };
  }

  if (/\b(rollback model|rollback production|revert model)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'REQUEST_CONFIRMATION',
        pendingType: 'ROLLBACK_MODEL',
        prompt: 'Are you sure you want to roll back the production model? Say "Confirm" to proceed.',
        label: 'Request confirmation: Rollback Model',
        feedback: 'Confirmation required to roll back model. Say confirm to proceed.',
      },
    };
  }

  // 17. REPORTS EXPORT / PRINT
  if (/\b(print report|export report to pdf|print to pdf|download report|export report)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'PRINT_REPORT',
        label: 'Export Clinical Report to PDF',
        feedback: 'Opening print dialog',
      },
    };
  }

  // 18. SETTINGS PREFERENCES
  if (/\b(toggle crosshair|show crosshair|hide crosshair|toggle crosshairs)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'TOGGLE_CROSSHAIR',
        label: 'Toggle MPR crosshairs',
        feedback: 'Toggled crosshairs',
      },
    };
  }

  // 19. ABOUT & VIVA DEFENSE QUESTIONS
  if (/\b(show viva question|open defense question|expand question|show viva question one|next viva question)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'EXPAND_VIVA_QUESTION',
        label: 'Expand next viva defense question',
        feedback: 'Next defense question expanded',
      },
    };
  }

  if (/\b(play intro|cinematic intro|watch intro|replay intro|show intro)\b/i.test(rawLower)) {
    return {
      success: true,
      action: {
        type: 'PLAY_INTRO',
        label: 'Play Cinematic Intro',
        feedback: 'Playing intro',
      },
    };
  }

  // 19. ROUTE NAVIGATION (EVALUATED AFTER ALL SPECIFIC PAGE & VIEWER ACTIONS)
  for (const route of ROUTES) {
    if (route.aliases.some((alias) => rawLower === alias || rawLower.includes(alias) || normalized === alias)) {
      return {
        success: true,
        action: {
          type: 'NAVIGATE',
          tab: route.id,
          label: `Navigate to ${route.name}`,
          feedback: `Opening ${route.name}`,
          source: 'builtin_alias',
        },
        ruleMatched: 'builtin_route_alias',
      };
    }
  }

  return {
    success: false,
    action: null,
    error: `Unrecognized command: "${rawTranscript}". Say "Open manual" to view all available commands.`,
  };
}

/**
 * Dry-run simulation of a voice command.
 * Strictly pure with ZERO side effects (no scrolling, no navigation, no speech synthesis).
 * Returns a step-by-step pipeline inspection object.
 */
export function simulateVoiceCommand(rawTranscript, context = {}) {
  if (!rawTranscript || typeof rawTranscript !== 'string') {
    return {
      rawTranscript: '',
      normalized: '',
      success: false,
      ruleMatched: 'none',
      action: null,
      parameters: {},
      confidence: 0,
      wouldHappen: 'No transcript provided.',
      requiresConfirmation: false,
      error: 'Empty transcript',
    };
  }

  const normalized = normalizeTranscript(rawTranscript);
  const parsed = parseVoiceCommand(rawTranscript, context);

  let ruleMatched = parsed.ruleMatched || 'unrecognized';
  if (parsed.success && !parsed.ruleMatched) {
    if (parsed.action?.type === 'NO_ACTION' || parsed.action?.type === 'CANCEL_PENDING_ACTION') {
      ruleMatched = 'safety_negation';
    } else if (parsed.action?.type === 'STOP_ALL_MOTION' || parsed.action?.type === 'STOP_ROTATION') {
      ruleMatched = 'safety_stop_word';
    } else {
      ruleMatched = 'builtin_action';
    }
  }

  const parameters = parsed.action ? extractParameters(parsed.action) : {};
  const confidence = parsed.success ? 0.95 : 0;

  return {
    rawTranscript,
    normalized,
    success: parsed.success,
    ruleMatched,
    action: parsed.action,
    parameters,
    confidence,
    wouldHappen: describeSimulationOutcome(parsed.action, parsed.error),
    requiresConfirmation: !!parsed.action?.requiresConfirmation,
    error: parsed.error || null,
  };
}

function extractParameters(action) {
  const params = {};
  if (!action) return params;
  if (action.tab) params.tab = action.tab;
  if (action.direction) params.direction = action.direction;
  if (action.amount !== undefined) params.amount = `${action.amount}px`;
  if (action.speed !== undefined) params.speed = `${action.speed}px/s`;
  if (action.axis) params.axis = action.axis.toUpperCase();
  if (action.value !== undefined) params.value = action.value;
  if (action.coordinates) params.coordinates = `(${action.coordinates.x}, ${action.coordinates.y}, ${action.coordinates.z})`;
  if (action.key) params.subregion = action.key;
  if (action.degrees !== undefined) params.degrees = `${action.degrees}°`;
  if (action.factor !== undefined) params.zoomFactor = `${action.factor}x`;
  if (action.query) params.caseId = action.query;
  return params;
}

function describeSimulationOutcome(action, error) {
  if (!action) {
    return `Would reject command: "${error || 'Unrecognized speech'}". No action would be taken.`;
  }
  switch (action.type) {
    case 'NAVIGATE':
      return `Would navigate to page "${action.tab}".`;
    case 'SCROLL_STEP':
      return `Would scroll ${action.direction} by ${action.amount || 'standard distance'}${action.isScreen ? ' (one screen)' : 'px'}.`;
    case 'SCROLL_CARDINAL':
      return `Would jump scroll directly to ${action.position} of page.`;
    case 'START_CONTINUOUS_SCROLL':
      return `Would start continuous scrolling ${action.direction} at ${action.speed || 300}px/s.`;
    case 'STOP_ALL_MOTION':
      return 'Would immediately stop all scrolling motion and 3D camera rotation.';
    case 'STOP_ROTATION':
      return 'Would stop continuous 3D camera rotation.';
    case 'START_CONTINUOUS_ROTATION':
      return 'Would start continuous 3D camera rotation.';
    case 'ROTATE_ONCE':
      return `Would rotate 3D camera ${action.direction} by ${action.degrees || 15}°.`;
    case 'ZOOM':
      return `Would zoom 3D camera ${action.factor > 1 ? 'in' : 'out'} by ${Math.round(Math.abs(action.factor - 1) * 100)}%.`;
    case 'PAN':
      return `Would pan 3D view (dx: ${action.dx}, dy: ${action.dy}).`;
    case 'CENTER_VIEW':
      return 'Would center 3D view and reset zoom level.';
    case 'RESET_VIEW':
      return 'Would reset all MPR and 3D views to default orientation.';
    case 'SET_LAYOUT':
      return `Would switch workstation layout to "${action.value}".`;
    case 'SET_MODALITY':
      return `Would switch MRI modality sequence to "${action.value.toUpperCase()}".`;
    case 'CYCLE_MODALITY':
      return 'Would cycle to the next MRI modality sequence in order.';
    case 'SET_SEGMENTATION':
      return `Would ${action.enabled ? 'show' : 'hide'} tumor segmentation overlay mask.`;
    case 'TOGGLE_SEGMENTATION':
      return 'Would toggle tumor segmentation overlay mask visibility.';
    case 'SET_OPACITY':
      return `Would set segmentation overlay opacity to ${Math.round((action.value || 0) * 100)}%.`;
    case 'TOGGLE_SUBREGION':
      return `Would toggle visibility of subregion ${action.key}.`;
    case 'SET_COORDINATES':
      return `Would set voxel coordinates to X:${action.coordinates?.x}, Y:${action.coordinates?.y}, Z:${action.coordinates?.z}.`;
    case 'SET_AXIS_COORDINATE':
      return `Would set ${action.axis?.toUpperCase()} axis coordinate to ${action.value}.`;
    case 'STEP_SLICE':
      return `Would step slice ${action.step > 0 ? 'forward (+1)' : 'backward (-1)'}.`;
    case 'GOTO_CENTER_SLICE':
      return 'Would reset slice coordinates to volumetric center.';
    case 'SELECT_CASE':
      return action.query ? `Would load patient case "${action.query}".` : `Would select ${action.direction || 'next'} patient case.`;
    case 'REQUEST_CONFIRMATION':
      return `Would prompt user for spoken confirmation before executing: ${action.pendingType}.`;
    case 'PRINT_REPORT':
      return 'Would open browser print dialog to export clinical report.';
    case 'TOGGLE_CROSSHAIR':
      return 'Would toggle MPR crosshair visibility.';
    case 'EXPAND_VIVA_QUESTION':
      return 'Would expand the next viva defense inquiry in the list.';
    case 'OPEN_MANUAL':
      return 'Would open the Voice Control Manual modal dialog.';
    case 'CLOSE_MANUAL':
      return 'Would close the Voice Control Manual modal dialog.';
    case 'RELOAD_WEBSITE':
      return 'Would reload the application webpage.';
    case 'NAVIGATE_HISTORY':
      return `Would navigate ${action.direction} in browser history.`;
    case 'FULLSCREEN':
      return `Would ${action.enabled ? 'maximize' : 'restore'} viewer presentation layout.`;
    case 'TOGGLE_SIDEBAR':
      return `Would ${action.collapsed ? 'collapse' : 'expand'} navigation sidebar.`;
    case 'STATUS_QUERY':
      return 'Would report voice assistant operational status.';
    case 'START_LISTENING':
      return 'Would start voice recognition listening.';
    case 'PAUSE_LISTENING':
      return 'Would pause voice recognition listening.';
    case 'RESUME_LISTENING':
      return 'Would resume voice recognition listening.';
    case 'CLOSE_ASSISTANT':
      return 'Would close voice assistant.';
    case 'ROTATE_VERTICAL':
      return `Would tilt 3D camera ${action.direction} by ${action.degrees || 15}°.`;
    case 'SET_CAMERA_ANGLE':
      return `Would align 3D camera to ${action.angle} anatomical preset.`;
    case 'SET_BRAIN_APPEARANCE':
      return `Would set brain appearance mode to "${action.mode}".`;
    case 'LIST_BRAIN_APPEARANCES':
      return 'Would announce available brain appearance options.';
    case 'PROMPT_APPEARANCE_SELECTION':
      return 'Would prompt for appearance mode selection.';
    case 'SHOW_LAYERS_PANEL':
      return 'Would open Layers panel.';
    case 'HIDE_LAYERS_PANEL':
      return 'Would close Layers panel.';
    case 'SHOW_VOLUMETRICS_PANEL':
      return 'Would open Volumetrics panel.';
    case 'SHOW_LAYERS_AND_VOLUMETRICS':
      return 'Would show both Layers and Volumetrics panels.';
    case 'STEP_OPACITY':
      return `Would ${action.delta > 0 ? 'increase' : 'decrease'} overlay opacity.`;
    case 'LIST_PATIENTS':
      return 'Would list available cohort patient cases.';
    case 'STOP_LISTENING':
      return 'Would deactivate microphone speech recognition.';
    case 'NO_ACTION':
      return 'Negation detected ("do not", "never"). Would safely perform NO action.';
    case 'CANCEL_PENDING_ACTION':
      return 'Would cancel pending safety confirmation.';
    default:
      return `Would dispatch action "${action.type}".`;
  }
}
