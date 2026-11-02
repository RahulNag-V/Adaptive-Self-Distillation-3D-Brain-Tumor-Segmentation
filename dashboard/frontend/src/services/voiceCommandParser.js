/**
 * NeuroVision AI - Intelligent Voice Command Parser Service
 *
 * Implements deterministic allowlisted pipeline:
 * Speech recognition -> normalization -> negation/stop check -> filler stripping
 * -> priority matching (exact > alias > keyword) -> parameter extraction -> structured allowlisted intent.
 */

import { ROUTE_MAP, SCROLL_CONFIG, COMMAND_REGISTRY } from './commandRegistry.js';

// Spoken numbers and digit words
export const NUMBER_WORDS = {
  zero: 0,
  one: 1,
  two: 2,
  second: 2,
  twice: 2,
  three: 3,
  third: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
};

const DIGIT_WORDS = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
};

/**
 * Converts natural spoken number words or digits into integers.
 */
export function wordsToNumber(text) {
  if (!text) return null;
  const directMatch = text.match(/\b\d+\b/);
  if (directMatch) {
    return parseInt(directMatch[0], 10);
  }

  const tokens = text.toLowerCase().replace(/[-_]/g, ' ').split(/\s+/);
  let total = 0;
  let current = 0;
  let found = false;

  for (const token of tokens) {
    if (NUMBER_WORDS[token] !== undefined) {
      found = true;
      const val = NUMBER_WORDS[token];
      if (val === 100) {
        current = (current === 0 ? 1 : current) * 100;
      } else if (val >= 20) {
        current += val;
      } else {
        current += val;
      }
    } else if (found) {
      total += current;
      current = 0;
    }
  }
  total += current;
  return found ? total : null;
}

/**
 * Normalizes speech transcript: lowercases, cleans punctuation, handles spaces.
 */
export function normalizeTranscript(raw) {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Strips natural conversational filler phrases before matching.
 */
export function stripFillers(text) {
  if (!text) return '';
  return text
    .replace(/\b(?:could you please|can you please|would you please|please|can you|could you|i want to|i would like to|take me to|show me the|show me|show|let's go to|let us go to|let's|let us|go to the|go to|open the|open|navigate to the|navigate to|switch to the|switch to|look at the|look at|bring up the|bring up)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts patient case identifiers.
 * Converts digit words (e.g. "zero one zero one seven" -> "01017")
 */
export function extractCaseIdentifier(text) {
  let s = text.toLowerCase().replace(/[-_]/g, ' ');
  for (const [w, d] of Object.entries(DIGIT_WORDS)) {
    s = s.replace(new RegExp(`\\b${w}\\b`, 'g'), d);
  }
  s = s.replace(/(?<=\b\d)\s+(?=\d\b)/g, '');

  const bratsMatch = s.match(/\b(?:brats\s*(?:2021\s*)?)(\d{4,8})\b/i);
  if (bratsMatch) return bratsMatch[1];

  const caseMatch = s.match(/\b(?:case|patient|subject|scan|id)\s*([a-z0-9\s]+?)(?=$|\s+(?:in|on|with|to))/i);
  if (caseMatch) {
    const rawTokens = caseMatch[1].replace(/\s+/g, '');
    const digits = rawTokens.match(/\d+/);
    if (digits) return digits[0];
    return rawTokens;
  }

  const directDigits = s.match(/\b(\d{4,8})\b/);
  if (directDigits) return directDigits[1];

  return null;
}

/**
 * Extracts single or multi-axis coordinates from spoken phrases.
 * Mapping convention:
 * - Z-axis -> Axial (0 - 154)
 * - Y-axis -> Coronal (0 - 239)
 * - X-axis -> Sagittal (0 - 239)
 */
export function extractCoordinates(rawText) {
  const text = rawText.toLowerCase().replace(/[-_]/g, ' ').replace(/[.,;:()]/g, ' ');
  const coords = {};

  // Triple coordinates pattern: "coordinates 40 70 50" or "coordinates to 40 70 50"
  const tripleMatch = text.match(/\b(?:coordinates?|coords?)\s+(?:to\s+)?(\d+)\s+(\d+)\s+(\d+)\b/);
  if (tripleMatch) {
    return {
      x: parseInt(tripleMatch[1], 10),
      y: parseInt(tripleMatch[2], 10),
      z: parseInt(tripleMatch[3], 10),
      isMulti: true,
    };
  }

  // Z / Axial
  const zMatch = text.match(/\b(?:z(?:\s*axis)?|axial(?:\s*slice|\s*plane)?)(?:\s+coordinate)?(?:\s+(?:to|at|is))?\s+([a-z0-9\s]+?)(?=\s+\b(?:x|y|coronal|sagittal|plane|coordinate)\b|$)/i);
  if (zMatch) {
    const val = wordsToNumber(zMatch[1]);
    if (val !== null && !isNaN(val)) coords.z = val;
  }

  // Y / Coronal
  const yMatch = text.match(/\b(?:y(?:\s*axis)?|coronal(?:\s*slice|\s*plane)?)(?:\s+coordinate)?(?:\s+(?:to|at|is))?\s+([a-z0-9\s]+?)(?=\s+\b(?:x|z|axial|sagittal|plane|coordinate)\b|$)/i);
  if (yMatch) {
    const val = wordsToNumber(yMatch[1]);
    if (val !== null && !isNaN(val)) coords.y = val;
  }

  // X / Sagittal
  const xMatch = text.match(/\b(?:x(?:\s*axis)?|sagittal(?:\s*slice|\s*plane)?)(?:\s+coordinate)?(?:\s+(?:to|at|is))?\s+([a-z0-9\s]+?)(?=\s+\b(?:y|z|axial|coronal|plane|coordinate)\b|$)/i);
  if (xMatch) {
    const val = wordsToNumber(xMatch[1]);
    if (val !== null && !isNaN(val)) coords.x = val;
  }

  const keys = Object.keys(coords);
  if (keys.length > 0) {
    return {
      ...coords,
      isMulti: keys.length > 1,
    };
  }

  return null;
}

/**
 * Checks for negation phrases.
 * "Don't open reports", "do not switch to 3d", "never navigate"
 */
function isNegated(text) {
  return /\b(?:don'?t|do not|never|should not|shouldn'?t|please don'?t|stop from)\b/i.test(text);
}

/**
 * Central Allowlisted Natural Language Voice Command Parser.
 * Follows strict priority order:
 * 1. Check negation and stop words FIRST.
 * 2. Strip fillers and normalize.
 * 3. Exact phrase / registered alias matching.
 * 4. Website-wide scrolling controller intents.
 * 5. 3D Workspace, coordinates, case selection, and subregion intents.
 * 6. Other page-specific controls with confirmation rules.
 * 7. Ambiguity detection.
 */
export function parseVoiceCommand(rawTranscript, context = {}) {
  const norm = normalizeTranscript(rawTranscript);
  if (!norm) {
    return { success: false, error: 'Empty speech input' };
  }

  // 1. NEGATION CHECK FIRST: "Don't open reports", "do not go to 3d viewer"
  if (isNegated(norm)) {
    return {
      success: true,
      action: {
        type: 'NO_ACTION',
        intent: 'negation_acknowledged',
        label: 'Negated command ignored',
        feedback: 'Command cancelled as requested.',
      },
    };
  }

  // 2. SPOKEN CONFIRMATION RESPONSES (When awaiting confirmation for training/promotion)
  if (context.pendingConfirmation) {
    if (/\b(?:confirm|yes|proceed|do it|approve|yes proceed|yes confirm)\b/i.test(norm)) {
      return {
        success: true,
        action: {
          type: 'CONFIRM_PENDING_ACTION',
          intent: 'confirm_action',
          pendingType: context.pendingConfirmation.type,
          label: 'Spoken Confirmation Received',
          feedback: 'Confirmation verified. Executing operation.',
        },
      };
    }
    if (/\b(?:cancel|no|abort|don't|stop)\b/i.test(norm)) {
      return {
        success: true,
        action: {
          type: 'CANCEL_PENDING_ACTION',
          intent: 'cancel_action',
          label: 'Action Cancelled by User',
          feedback: 'Operation aborted.',
        },
      };
    }
  }

  // 3. STOP WORDS: "stop", "stop scrolling", "freeze", "pause", "enough", "cancel"
  if (/^(stop|stop scrolling|stop rotating|freeze|freeze view|pause|cancel|enough|halt)$/i.test(norm) ||
      /\b(?:stop scrolling|stop rotating|freeze view|stop all motion)\b/i.test(norm)) {
    return {
      success: true,
      action: {
        type: 'STOP_ALL_MOTION',
        intent: 'stop_all_motion',
        label: 'Stop All Active Motion',
        feedback: 'Stopped active scrolling and 3D rotation.',
      },
    };
  }

  // 4. MANUAL & HELP CONTROLS
  if (/\b(?:close|hide|dismiss)\s+(?:the\s+)?(?:manual|voice\s+manual|help|command\s+panel)\b/i.test(norm)) {
    return {
      success: true,
      action: {
        type: 'CLOSE_MANUAL',
        intent: 'close_manual',
        label: 'Close Voice Control Manual',
        feedback: 'Voice Control Manual closed.',
      },
    };
  }
  if (/\b(?:open|show)\s+(?:the\s+)?(?:voice\s+)?manual\b/i.test(norm) ||
      /^(?:voice\s+)?manual$/i.test(norm) ||
      /\b(?:voice\s+commands?|show\s+commands?|voice\s+help|command\s+guide|help\s+guide)\b/i.test(norm)) {
    return {
      success: true,
      action: {
        type: 'OPEN_MANUAL',
        intent: 'open_manual',
        label: 'Open Voice Control Manual',
        feedback: 'Voice Control Manual opened.',
      },
    };
  }

  // 5. META SYSTEM & NAVIGATION HISTORY
  if (/\b(?:stop\s+listening|mute\s+microphone|turn\s+off\s+microphone|stop\s+voice)\b/i.test(norm)) {
    return {
      success: true,
      action: {
        type: 'STOP_LISTENING',
        intent: 'stop_listening',
        label: 'Stop Voice Recognition',
        feedback: 'Voice recognition stopped.',
      },
    };
  }
  if (/\b(?:reload\s+(?:the\s+)?(?:website|page|app)|refresh\s+(?:this\s+)?(?:page|website|app))\b/i.test(norm)) {
    return {
      success: true,
      action: {
        type: 'RELOAD_WEBSITE',
        intent: 'reload_website',
        label: 'Reload Website',
        feedback: 'Reloading application.',
      },
    };
  }
  if (/\b(?:go\s+back|previous\s+page|back\s+page)\b/i.test(norm) && !/patient|case|slice|mesh/.test(norm)) {
    return {
      success: true,
      action: {
        type: 'NAVIGATE_HISTORY',
        intent: 'navigate_history',
        direction: 'back',
        label: 'Go Back (Navigation History)',
        feedback: 'Navigating to previous page.',
      },
    };
  }
  if (/\b(?:go\s+forward|forward\s+page)\b/i.test(norm) && !/slice/.test(norm)) {
    return {
      success: true,
      action: {
        type: 'NAVIGATE_HISTORY',
        intent: 'navigate_history',
        direction: 'forward',
        label: 'Go Forward (Navigation History)',
        feedback: 'Navigating forward.',
      },
    };
  }
  if (/\b(?:play|show|watch|replay)\s+(?:the\s+)?(?:intro|cinematic\s+video|cinematic\s+intro)\b/i.test(norm)) {
    return {
      success: true,
      action: {
        type: 'PLAY_INTRO',
        intent: 'play_intro',
        label: 'Play 4K Cinematic Intro',
        feedback: 'Playing cinematic intro.',
      },
    };
  }

  // 6. WEBSITE-WIDE SCROLLING INTENTS
  // Continuous Scrolling
  if (/\b(?:scroll\s+faster|faster\s+scrolling|speed\s+up\s+scroll)\b/i.test(norm)) {
    return {
      success: true,
      action: {
        type: 'START_CONTINUOUS_SCROLL',
        intent: 'scroll_continuous_fast',
        speed: SCROLL_CONFIG.fastSpeed,
        label: 'Scroll Continuously (Faster 600px/s)',
        feedback: 'Scrolling faster.',
      },
    };
  }
  if (/\b(?:keep\s+scrolling\s+up|continue\s+scrolling\s+up|scroll\s+continuously\s+up)\b/i.test(norm)) {
    return {
      success: true,
      action: {
        type: 'START_CONTINUOUS_SCROLL',
        intent: 'scroll_continuous_up',
        direction: 'up',
        speed: SCROLL_CONFIG.continuousSpeed,
        label: 'Scroll Continuously Up (300px/s)',
        feedback: 'Scrolling up continuously.',
      },
    };
  }
  if (/\b(?:keep\s+scrolling|continue\s+scrolling|keep\s+going\s+down|scroll\s+continuously|start\s+continuous\s+scroll)\b/i.test(norm)) {
    return {
      success: true,
      action: {
        type: 'START_CONTINUOUS_SCROLL',
        intent: 'scroll_continuous_down',
        direction: 'down',
        speed: SCROLL_CONFIG.continuousSpeed,
        label: 'Scroll Continuously Down (300px/s)',
        feedback: 'Scrolling down continuously.',
      },
    };
  }

  // Cardinal Top / Bottom
  if (/\b(?:scroll\s+to\s+top|go\s+to\s+top|top\s+of\s+page|scroll\s+to\s+(?:the\s+)?beginning|back\s+to\s+top)\b/i.test(norm)) {
    return {
      success: true,
      action: {
        type: 'SCROLL_CARDINAL',
        intent: 'scroll_top',
        position: 'top',
        label: 'Scroll to Top of Page',
        feedback: 'Scrolled to top.',
      },
    };
  }
  if (/\b(?:scroll\s+to\s+bottom|go\s+to\s+bottom|bottom\s+of\s+page|scroll\s+to\s+(?:the\s+)?end)\b/i.test(norm)) {
    return {
      success: true,
      action: {
        type: 'SCROLL_CARDINAL',
        intent: 'scroll_bottom',
        position: 'bottom',
        label: 'Scroll to Bottom of Page',
        feedback: 'Scrolled to bottom.',
      },
    };
  }

  // Explicit pixel scroll: "scroll 300 pixels down", "scroll up by 200 pixels"
  const pixelMatch = norm.match(/\bscroll\s+(?:(up|down)\s+)?(?:by\s+)?(\d+)\s*(?:px|pixels?)(?:\s+(up|down))?\b/i);
  if (pixelMatch) {
    const dir = (pixelMatch[1] || pixelMatch[3] || 'down').toLowerCase();
    const px = parseInt(pixelMatch[2], 10);
    return {
      success: true,
      action: {
        type: 'SCROLL_STEP',
        intent: 'scroll_pixels',
        direction: dir,
        amount: px,
        label: `Scroll ${dir.toUpperCase()} by ${px}px`,
        feedback: `Scrolled ${dir} ${px} pixels.`,
      },
    };
  }

  // Screen ratio scroll: "scroll one screen down", "scroll screen up"
  if (/\bscroll\s+(?:one\s+)?screen\s+(down|up)\b/i.test(norm) || /\bscroll\s+(down|up)\s+(?:one\s+)?screen\b/i.test(norm)) {
    const dir = /up/i.test(norm) ? 'up' : 'down';
    return {
      success: true,
      action: {
        type: 'SCROLL_STEP',
        intent: 'scroll_screen',
        direction: dir,
        isScreen: true,
        label: `Scroll One Screen ${dir.toUpperCase()}`,
        feedback: `Scrolled one screen ${dir}.`,
      },
    };
  }

  // Discrete Page Step Scrolling (Distinguished from MRI slice stepping!)
  if (/\bscroll\s+(down\s+a\s+little|down\s+slightly|a\s+little\s+down)\b/i.test(norm)) {
    return {
      success: true,
      action: {
        type: 'SCROLL_STEP',
        intent: 'scroll_small_down',
        direction: 'down',
        amount: SCROLL_CONFIG.smallStep,
        label: 'Scroll Down a Little (120px)',
        feedback: 'Scrolled down slightly.',
      },
    };
  }
  if (/\bscroll\s+(up\s+a\s+little|up\s+slightly|a\s+little\s+up)\b/i.test(norm)) {
    return {
      success: true,
      action: {
        type: 'SCROLL_STEP',
        intent: 'scroll_small_up',
        direction: 'up',
        amount: SCROLL_CONFIG.smallStep,
        label: 'Scroll Up a Little (120px)',
        feedback: 'Scrolled up slightly.',
      },
    };
  }
  if (/\bscroll\s+(down\s+a\s+lot|a\s+lot\s+down)\b/i.test(norm)) {
    return {
      success: true,
      action: {
        type: 'SCROLL_STEP',
        intent: 'scroll_large_down',
        direction: 'down',
        amount: SCROLL_CONFIG.largeStep,
        label: 'Scroll Down a Lot (900px)',
        feedback: 'Scrolled down.',
      },
    };
  }
  if (/\bscroll\s+(up\s+a\s+lot|a\s+lot\s+up)\b/i.test(norm)) {
    return {
      success: true,
      action: {
        type: 'SCROLL_STEP',
        intent: 'scroll_large_up',
        direction: 'up',
        amount: SCROLL_CONFIG.largeStep,
        label: 'Scroll Up a Lot (900px)',
        feedback: 'Scrolled up.',
      },
    };
  }
  if (/\b(?:scroll\s+down|page\s+down)\b/i.test(norm) && !/slice|layer/.test(norm)) {
    return {
      success: true,
      action: {
        type: 'SCROLL_STEP',
        intent: 'scroll_step_down',
        direction: 'down',
        amount: SCROLL_CONFIG.normalStep,
        label: 'Scroll Page Down (400px)',
        feedback: 'Scrolled page down.',
      },
    };
  }
  if (/\b(?:scroll\s+up|page\s+up)\b/i.test(norm) && !/slice|layer/.test(norm)) {
    return {
      success: true,
      action: {
        type: 'SCROLL_STEP',
        intent: 'scroll_step_up',
        direction: 'up',
        amount: SCROLL_CONFIG.normalStep,
        label: 'Scroll Page Up (400px)',
        feedback: 'Scrolled page up.',
      },
    };
  }

  // 7. MULTI-AXIS & SINGLE-AXIS MRI COORDINATES
  const coordData = extractCoordinates(norm);
  if (coordData) {
    if (coordData.isMulti) {
      const parts = [];
      if (coordData.x !== undefined) parts.push(`X: ${coordData.x}`);
      if (coordData.y !== undefined) parts.push(`Y: ${coordData.y}`);
      if (coordData.z !== undefined) parts.push(`Z: ${coordData.z}`);
      return {
        success: true,
        action: {
          type: 'SET_COORDINATES',
          intent: 'set_coordinates_multi',
          coordinates: { x: coordData.x, y: coordData.y, z: coordData.z },
          label: `Set Multi-Axis Coordinates (${parts.join(', ')})`,
          feedback: `Updated coordinates to ${parts.join(', ')}.`,
        },
      };
    } else {
      if (coordData.z !== undefined) {
        return {
          success: true,
          action: {
            type: 'SET_AXIS_COORDINATE',
            intent: 'set_coordinate_z',
            axis: 'z',
            plane: 'axial',
            value: coordData.z,
            label: `Set Z-Axis (Axial) Coordinate to ${coordData.z}`,
            feedback: `Z-axis coordinate set to ${coordData.z}.`,
          },
        };
      }
      if (coordData.y !== undefined) {
        return {
          success: true,
          action: {
            type: 'SET_AXIS_COORDINATE',
            intent: 'set_coordinate_y',
            axis: 'y',
            plane: 'coronal',
            value: coordData.y,
            label: `Set Y-Axis (Coronal) Coordinate to ${coordData.y}`,
            feedback: `Y-axis coordinate set to ${coordData.y}.`,
          },
        };
      }
      if (coordData.x !== undefined) {
        return {
          success: true,
          action: {
            type: 'SET_AXIS_COORDINATE',
            intent: 'set_coordinate_x',
            axis: 'x',
            plane: 'sagittal',
            value: coordData.x,
            label: `Set X-Axis (Sagittal) Coordinate to ${coordData.x}`,
            feedback: `X-axis coordinate set to ${coordData.x}.`,
          },
        };
      }
    }
  }

  // 8. MRI VIEWPORT & PROJECTIONS
  if (/\b(?:axial\s+view|axial\s+plane|switch\s+to\s+axial|show\s+axial)\b/i.test(norm)) {
    return {
      success: true,
      action: { type: 'SET_LAYOUT', intent: 'set_layout_axial', value: 'axial', axis: 'z', label: 'Switch to Axial View (Z-Axis)' },
    };
  }
  if (/\b(?:coronal\s+view|coronal\s+plane|switch\s+to\s+coronal|show\s+coronal)\b/i.test(norm)) {
    return {
      success: true,
      action: { type: 'SET_LAYOUT', intent: 'set_layout_coronal', value: 'coronal', axis: 'y', label: 'Switch to Coronal View (Y-Axis)' },
    };
  }
  if (/\b(?:sagittal\s+view|sagittal\s+plane|switch\s+to\s+sagittal|show\s+sagittal)\b/i.test(norm)) {
    return {
      success: true,
      action: { type: 'SET_LAYOUT', intent: 'set_layout_sagittal', value: 'sagittal', axis: 'x', label: 'Switch to Sagittal View (X-Axis)' },
    };
  }
  if (/\b(?:quad\s+view|multiplanar\s+view|mpr\s+view|all\s+views)\b/i.test(norm)) {
    return {
      success: true,
      action: { type: 'SET_LAYOUT', intent: 'set_layout_quad', value: 'quad', label: 'Quad MPR Reconstruction (4-View)' },
    };
  }
  if (/\b(?:3d\s+view|three\s+d\s+view|3d\s+model\s+view|surface\s+mesh\s+view)\b/i.test(norm) && !/workspace|viewer/.test(norm)) {
    return {
      success: true,
      action: { type: 'SET_LAYOUT', intent: 'set_layout_3d', value: '3d', label: '3D Anatomical Mesh View' },
    };
  }

  // 9. CASE & PATIENT SELECTION
  if (/\b(?:next\s+case|next\s+patient|show\s+next\s+case|load\s+next\s+case)\b/i.test(norm)) {
    return {
      success: true,
      action: { type: 'SELECT_CASE', intent: 'select_case_next', direction: 'next', label: 'Load Next Case' },
    };
  }
  if (/\b(?:previous\s+case|previous\s+patient|open\s+previous\s+patient|prev\s+case)\b/i.test(norm)) {
    return {
      success: true,
      action: { type: 'SELECT_CASE', intent: 'select_case_prev', direction: 'prev', label: 'Load Previous Case' },
    };
  }
  if (/\b(?:current\s+case|reset\s+case|return\s+to\s+current\s+case)\b/i.test(norm)) {
    return {
      success: true,
      action: { type: 'SELECT_CASE', intent: 'select_case_current', direction: 'current', label: 'Return to Current Case' },
    };
  }
  if (/\b(?:select\s+case|open\s+patient|load\s+case|search\s+for\s+case)\b/i.test(norm)) {
    const caseId = extractCaseIdentifier(norm);
    return {
      success: true,
      action: {
        type: 'SELECT_CASE',
        intent: 'select_case_by_id',
        query: caseId,
        rawQuery: rawTranscript,
        label: `Select Case ${caseId || 'Spoken'}`,
      },
    };
  }

  // 10. MRI MODALITIES
  if (/\b(?:show|switch to|view)?\s*flair\b/i.test(norm)) {
    return { success: true, action: { type: 'SET_MODALITY', intent: 'set_modality_flair', value: 'flair', label: 'FLAIR Sequence' } };
  }
  if (/\b(?:show|switch to|view)?\s*(?:t1ce|t1\s*contrast|t1\s*post\s*contrast)\b/i.test(norm)) {
    return { success: true, action: { type: 'SET_MODALITY', intent: 'set_modality_t1ce', value: 't1ce', label: 'T1ce Contrast Sequence' } };
  }
  if (/\b(?:show|switch to|view)?\s*t1\b/i.test(norm) && !/t1ce|contrast/.test(norm)) {
    return { success: true, action: { type: 'SET_MODALITY', intent: 'set_modality_t1', value: 't1', label: 'T1 Sequence' } };
  }
  if (/\b(?:show|switch to|view)?\s*t2\b/i.test(norm)) {
    return { success: true, action: { type: 'SET_MODALITY', intent: 'set_modality_t2', value: 't2', label: 'T2 Sequence' } };
  }
  if (/\b(?:show|switch to|view)?\s*ct\b/i.test(norm) || /\bcomputed\s+tomography\b/i.test(norm)) {
    return { success: true, action: { type: 'SET_MODALITY', intent: 'set_modality_ct', value: 'ct', label: 'Volumetric CT' } };
  }
  if (/\b(?:cycle\s+modality|next\s+modality|other\s+mri\s+scan)\b/i.test(norm)) {
    return { success: true, action: { type: 'CYCLE_MODALITY', intent: 'cycle_modality', label: 'Cycle to Alternate MRI Modality' } };
  }

  // 11. MRI SLICE STEPPING & CENTER
  if (/\b(?:go to\s+center\s+slice|center\s+slice|middle\s+slice)\b/i.test(norm)) {
    return { success: true, action: { type: 'GOTO_CENTER_SLICE', intent: 'center_slice', label: 'Center Slice Position' } };
  }
  if (/\b(?:reset\s+slice\s+position|reset\s+slice|default\s+slice)\b/i.test(norm)) {
    return { success: true, action: { type: 'RESET_SLICE', intent: 'reset_slice', label: 'Reset Slice Position' } };
  }
  if (/\b(?:move\s+down\s+5\s+slices|slice\s+down|next\s+slice)\b/i.test(norm)) {
    return { success: true, action: { type: 'STEP_SLICE', intent: 'step_slice_next', step: 1, label: 'Next Slice (+1)' } };
  }
  if (/\b(?:move\s+up\s+5\s+slices|slice\s+up|previous\s+slice|prev\s+slice)\b/i.test(norm)) {
    return { success: true, action: { type: 'STEP_SLICE', intent: 'step_slice_prev', step: -1, label: 'Previous Slice (-1)' } };
  }

  // 12. CAMERA ROTATION - BOUNDED ONE-SHOT VS CONTINUOUS
  if (/\b(?:start\s+rotating\s+left|rotate\s+continuously\s+(?:to\s+the\s+)?left|spin\s+left)\b/i.test(norm)) {
    return {
      success: true,
      action: { type: 'START_CONTINUOUS_ROTATION', intent: 'camera_continuous_left', direction: 'left', label: 'Start Continuous Rotation (Left)' },
    };
  }
  if (/\b(?:start\s+rotating(?:\s+right)?|rotate\s+continuously(?:\s+(?:to\s+the\s+)?right)?|spin\s+(?:the\s+)?brain|start\s+continuous\s+rotation)\b/i.test(norm)) {
    return {
      success: true,
      action: { type: 'START_CONTINUOUS_ROTATION', intent: 'camera_continuous_right', direction: 'right', label: 'Start Continuous Rotation (Right)' },
    };
  }
  if (/\b(?:rotate\s+180\s*degrees?|turn\s+180\s*degrees?|flip\s+180)\b/i.test(norm)) {
    return {
      success: true,
      action: { type: 'ROTATE_ONCE', intent: 'camera_rotate_180', direction: '180', degrees: 180, label: 'Rotate 180° Once' },
    };
  }
  if (/\b(?:rotate\s+90\s*degrees?\s*left|turn\s+90\s*degrees?\s*left)\b/i.test(norm)) {
    return {
      success: true,
      action: { type: 'ROTATE_ONCE', intent: 'camera_rotate_90_left', direction: 'left', degrees: 90, label: 'Rotate Left 90° Once' },
    };
  }
  if (/\b(?:rotate\s+90\s*degrees?\s*right|turn\s+90\s*degrees?\s*right)\b/i.test(norm)) {
    return {
      success: true,
      action: { type: 'ROTATE_ONCE', intent: 'camera_rotate_90_right', direction: 'right', degrees: 90, label: 'Rotate Right 90° Once' },
    };
  }
  if (/\b(?:rotate\s+left(?:\s+once)?|turn\s+left(?:\s+once)?)\b/i.test(norm)) {
    return {
      success: true,
      action: { type: 'ROTATE_ONCE', intent: 'camera_rotate_left_15', direction: 'left', degrees: 15, label: 'Rotate Left (15°)' },
    };
  }
  if (/\b(?:rotate\s+right(?:\s+once)?|turn\s+right(?:\s+once)?)\b/i.test(norm)) {
    return {
      success: true,
      action: { type: 'ROTATE_ONCE', intent: 'camera_rotate_right_15', direction: 'right', degrees: 15, label: 'Rotate Right (15°)' },
    };
  }
  if (/\b(?:rotate\s+up(?:\s+once)?|tilt\s+up(?:\s+once)?)\b/i.test(norm)) {
    return {
      success: true,
      action: { type: 'ROTATE_ONCE', intent: 'camera_rotate_up_15', direction: 'up', degrees: 15, label: 'Rotate Up (15°)' },
    };
  }
  if (/\b(?:rotate\s+down(?:\s+once)?|tilt\s+down(?:\s+once)?)\b/i.test(norm)) {
    return {
      success: true,
      action: { type: 'ROTATE_ONCE', intent: 'camera_rotate_down_15', direction: 'down', degrees: 15, label: 'Rotate Down (15°)' },
    };
  }
  if (/\b(?:reset\s+rotation|reset\s+camera|reset\s+the\s+camera|recenter\s+camera)\b/i.test(norm)) {
    return {
      success: true,
      action: { type: 'RESET_ROTATION', intent: 'camera_reset', label: 'Reset Camera & Rotation' },
    };
  }

  // 13. ZOOM & PAN
  if (/\b(?:zoom\s+in|magnify)\b/i.test(norm)) {
    return { success: true, action: { type: 'ZOOM', intent: 'zoom_in', factor: 1.2, label: 'Zoom In (1.2x)' } };
  }
  if (/\b(?:zoom\s+out|shrink)\b/i.test(norm)) {
    return { success: true, action: { type: 'ZOOM', intent: 'zoom_out', factor: 0.83, label: 'Zoom Out (0.83x)' } };
  }
  if (/\b(?:pan\s+left)\b/i.test(norm)) {
    return { success: true, action: { type: 'PAN', intent: 'pan_left', direction: 'left', dx: -40, dy: 0, label: 'Pan Left' } };
  }
  if (/\b(?:pan\s+right)\b/i.test(norm)) {
    return { success: true, action: { type: 'PAN', intent: 'pan_right', direction: 'right', dx: 40, dy: 0, label: 'Pan Right' } };
  }
  if (/\b(?:pan\s+up)\b/i.test(norm)) {
    return { success: true, action: { type: 'PAN', intent: 'pan_up', direction: 'up', dx: 0, dy: -40, label: 'Pan Up' } };
  }
  if (/\b(?:pan\s+down)\b/i.test(norm)) {
    return { success: true, action: { type: 'PAN', intent: 'pan_down', direction: 'down', dx: 0, dy: 40, label: 'Pan Down' } };
  }

  // 14. SEGMENTATION & TUMOR OVERLAYS
  if (/\b(?:show\s+me\s+the\s+tumor|show\s+the\s+tumor|show\s+segmentation|enable\s+segmentation|show\s+overlay)\b/i.test(norm)) {
    return { success: true, action: { type: 'SET_SEGMENTATION', intent: 'show_segmentation', enabled: true, label: 'Show Tumor Segmentation' } };
  }
  if (/\b(?:hide\s+those\s+colored\s+regions|hide\s+colored\s+regions|hide\s+segmentation|disable\s+segmentation|hide\s+overlay)\b/i.test(norm)) {
    return { success: true, action: { type: 'SET_SEGMENTATION', intent: 'hide_segmentation', enabled: false, label: 'Hide Tumor Segmentation' } };
  }
  if (/\b(?:toggle\s+segmentation|toggle\s+overlay)\b/i.test(norm)) {
    return { success: true, action: { type: 'TOGGLE_SEGMENTATION', intent: 'toggle_segmentation', label: 'Toggle Segmentation Overlay' } };
  }
  if (/\b(?:whole\s+tumor|wt)\b/i.test(norm)) {
    return { success: true, action: { type: 'TOGGLE_SUBREGION', intent: 'toggle_wt', key: 'wt', label: 'Toggle Whole Tumor (WT)' } };
  }
  if (/\b(?:tumor\s+core|tc)\b/i.test(norm)) {
    return { success: true, action: { type: 'TOGGLE_SUBREGION', intent: 'toggle_tc', key: 'tc', label: 'Toggle Tumor Core (TC)' } };
  }
  if (/\b(?:enhancing\s+tumor|et)\b/i.test(norm)) {
    return { success: true, action: { type: 'TOGGLE_SUBREGION', intent: 'toggle_et', key: 'et', label: 'Toggle Enhancing Tumor (ET)' } };
  }

  // Opacity
  const opacityMatch = norm.match(/\b(?:set\s+(?:overlay\s+)?opacity\s+to|opacity)\s+([a-z0-9\s]+?)\s*percent\b/i) || norm.match(/\bopacity\s+(\d+)%\b/i);
  if (opacityMatch) {
    const pct = wordsToNumber(opacityMatch[1]);
    if (pct !== null && pct >= 0 && pct <= 100) {
      return { success: true, action: { type: 'SET_OPACITY', intent: 'set_opacity', value: pct / 100, label: `Set Opacity to ${pct}%` } };
    }
  }

  // 15. ADAPTIVE LEARNING CONFIRMATION-REQUIRED ACTIONS
  if (/\b(?:start\s+training|start\s+retraining|train\s+model|trigger\s+fine\s+tuning)\b/i.test(norm)) {
    return {
      success: true,
      action: {
        type: 'REQUEST_CONFIRMATION',
        intent: 'request_start_training',
        pendingType: 'START_TRAINING',
        prompt: 'Are you sure you want to trigger model training on the supervisory dataset? Say "Confirm" to proceed or "Cancel" to abort.',
        label: 'Training Confirmation Required',
      },
    };
  }
  if (/\b(?:promote\s+candidate|promote\s+model\s+candidate|deploy\s+candidate\s+model)\b/i.test(norm)) {
    return {
      success: true,
      action: {
        type: 'REQUEST_CONFIRMATION',
        intent: 'request_promote_candidate',
        pendingType: 'PROMOTE_CANDIDATE',
        prompt: 'Are you sure you want to promote this candidate model to production? Say "Confirm" to proceed or "Cancel" to abort.',
        label: 'Model Promotion Confirmation Required',
      },
    };
  }
  if (/\b(?:rollback\s+model|rollback\s+production|revert\s+model)\b/i.test(norm)) {
    return {
      success: true,
      action: {
        type: 'REQUEST_CONFIRMATION',
        intent: 'request_rollback_model',
        pendingType: 'ROLLBACK_MODEL',
        prompt: 'Are you sure you want to roll back the production model? Say "Confirm" to proceed or "Cancel" to abort.',
        label: 'Rollback Confirmation Required',
      },
    };
  }

  // 16. REPORTS PRINT
  if (/\b(?:print\s+report|export\s+report\s+to\s+pdf|print\s+to\s+pdf)\b/i.test(norm)) {
    return {
      success: true,
      action: { type: 'PRINT_REPORT', intent: 'print_report', label: 'Print Report to PDF' },
    };
  }

  // 17. STRIP FILLERS & MATCH GLOBAL NAVIGATION ROUTES (Priority Match)
  const cleaned = stripFillers(norm);

  // Default aliases matching against canonical routes
  for (const [routeKey, routeDef] of Object.entries(ROUTE_MAP)) {
    for (const alias of routeDef.aliases) {
      // Check exact alias match on cleaned transcript
      if (cleaned === alias || norm === alias) {
        return {
          success: true,
          action: {
            type: 'NAVIGATE',
            intent: `navigate_${routeKey}`,
            tab: routeKey,
            label: `Navigate to ${routeDef.title}`,
            feedback: `Opening ${routeDef.title}.`,
          },
        };
      }
    }
  }

  // Word boundary regex match for registered aliases
  for (const [routeKey, routeDef] of Object.entries(ROUTE_MAP)) {
    for (const alias of routeDef.aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const reg = new RegExp(`\\b${escaped}\\b`, 'i');
      if (reg.test(cleaned) || reg.test(norm)) {
        return {
          success: true,
          action: {
            type: 'NAVIGATE',
            intent: `navigate_${routeKey}`,
            tab: routeKey,
            label: `Navigate to ${routeDef.title}`,
            feedback: `Opening ${routeDef.title}.`,
          },
        };
      }
    }
  }

  // 18. AMBIGUITY DETECTION
  if (/^(show it|move it|change it|zoom|rotate|pan|look|view|switch)$/i.test(norm)) {
    return {
      success: false,
      isAmbiguous: true,
      error: 'Command is ambiguous. Please specify a clear action (e.g., "Rotate left", "Show FLAIR", "Zoom in", "Set Z to 50", "Scroll down").',
      transcript: rawTranscript,
    };
  }

  // Unrecognized Command
  return {
    success: false,
    error: `Unrecognized command: "${rawTranscript}". Say "Open manual" to view all available commands.`,
    transcript: rawTranscript,
  };
}
