/**
 * NeuroVision AI - Intelligent Voice Command Parser Service
 * Converts natural human language into validated, allowlisted clinical application actions.
 */

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
 * Converts spoken words or digits into integers.
 * Handles "seventy five" -> 75, "one hundred twenty" -> 120, "50" -> 50.
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
 * Normalizes speech transcript: lowercases, cleans punctuation and extra whitespace.
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
 * Extracts case / patient identifiers from natural speech.
 * Handles "BraTS 2021 0 1 0 1 8 1 7", "case 01017", "patient zero one zero one eight", etc.
 */
export function extractCaseIdentifier(text) {
  let s = text.toLowerCase().replace(/[-_]/g, ' ');
  // Convert individual digit words
  for (const [w, d] of Object.entries(DIGIT_WORDS)) {
    s = s.replace(new RegExp(`\\b${w}\\b`, 'g'), d);
  }

  // Collapse consecutive single digits separated by whitespace (e.g. "0 1 0 1 8" -> "01018")
  s = s.replace(/(?<=\b\d)\s+(?=\d\b)/g, '');

  // Look for BraTS pattern or case/patient followed by digits
  const bratsMatch = s.match(/\b(?:brats\s*(?:2021\s*)?)(\d{4,8})\b/i);
  if (bratsMatch) {
    return bratsMatch[1];
  }

  const directDigits = s.match(/\b(\d{4,8})\b/);
  if (directDigits) {
    return directDigits[1];
  }

  const caseMatch = s.match(/\b(?:case|patient|subject|scan|id)\s*([a-z0-9\s]+?)(?=$|\s+(?:in|on|with|to))/i);
  if (caseMatch) {
    const rawTokens = caseMatch[1].replace(/\s+/g, '');
    const digits = rawTokens.match(/\d+/);
    if (digits) return digits[0];
    return rawTokens;
  }

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

  // 1. Triple coordinate pattern: "coordinates 40 70 50" or "to coordinates 40 70 50" or "40, 70, 50"
  const tripleMatch = text.match(/\b(?:coordinates?|coords?)\s+(?:to\s+)?(\d+)\s+(\d+)\s+(\d+)\b/);
  if (tripleMatch) {
    return {
      x: parseInt(tripleMatch[1], 10),
      y: parseInt(tripleMatch[2], 10),
      z: parseInt(tripleMatch[3], 10),
      isMulti: true,
    };
  }

  // 2. Multi-axis patterns: "Set X to 40, Y to 70, and Z to 50", "axial to 50 and coronal to 70"
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
 * Centralized Natural-Language Intent Parser
 * Converts transcripts into strongly typed actions with explicit validation.
 */
export function parseVoiceCommand(rawTranscript) {
  const text = normalizeTranscript(rawTranscript);
  if (!text) {
    return { success: false, error: 'Empty speech input' };
  }

  // Detect ambiguous commands that lack specific target/direction
  if (/^(show it|move it|change it|zoom|rotate|pan|look|view)$/.test(text)) {
    return {
      success: false,
      isAmbiguous: true,
      error: 'Command is ambiguous. Please specify an action (e.g., "Rotate left", "Show FLAIR", "Zoom in", "Set Z to 50").',
      transcript: rawTranscript,
    };
  }

  // 1. Full Website Navigation (Section 1)
  if (/\b(?:take me to|navigate to|open|go to|show|view)?\s*(?:the\s+)?(?:overview|dashboard|home\s*page|home)\b/.test(text) && !/menu|sidebar|panel/.test(text)) {
    return { success: true, action: { type: 'NAVIGATE', tab: 'overview', label: 'Navigate to Overview Dashboard' } };
  }
  if (/\b(?:take me to|navigate to|open|go to|show|i want to\s+)?\s*(?:upload|upload\s+scan|ingest(?:\s+scan)?|new\s+scan)\b/.test(text)) {
    return { success: true, action: { type: 'NAVIGATE', tab: 'upload', label: 'Navigate to Upload Scan' } };
  }
  if (/\b(?:take me to|navigate to|open|go to|show)?\s*(?:the\s+)?(?:3d\s+viewer|mri\s+viewer|viewer|workstation|brain\s+viewer)\b/.test(text) && !/mesh|mode|model|volumetric|close/.test(text)) {
    return { success: true, action: { type: 'NAVIGATE', tab: 'viewer', label: 'Navigate to 3D Viewer Workstation' } };
  }
  if (/\b(?:take me to|navigate to|open|go to|show)?\s*(?:adaptive\s+learning|adaptive\s+dashboard|adaptive|retraining)\b/.test(text)) {
    return { success: true, action: { type: 'NAVIGATE', tab: 'adaptive', label: 'Navigate to Adaptive Learning' } };
  }
  if (/\b(?:take me to|navigate to|open|go to|show)?\s*(?:2d\s+)?classification\b/.test(text) || /\bgo to classify\b/.test(text)) {
    return { success: true, action: { type: 'NAVIGATE', tab: 'classify', label: 'Navigate to 2D Classification' } };
  }
  if (/\b(?:take me to|navigate to|open|go to|show)?\s*(?:my\s+)?results\b/.test(text) || /\bquantitative\s+(?:results|report)\b/.test(text)) {
    return { success: true, action: { type: 'NAVIGATE', tab: 'results', label: 'Navigate to Results & Quantitative Report' } };
  }
  if (/\b(?:take me to|navigate to|open|go to|show)?\s*(?:about|specifications|research\s+methodology)\b/.test(text) && !/close/.test(text)) {
    return { success: true, action: { type: 'NAVIGATE', tab: 'about', label: 'Navigate to About Specifications' } };
  }
  if (/\b(?:play|show|watch|replay)\s+(?:the\s+)?(?:intro|cinematic\s+video|cinematic\s+intro)\b/.test(text)) {
    return { success: true, action: { type: 'PLAY_INTRO', label: 'Play 4K Cinematic Intro' } };
  }

  // 2. Menu, Panel, Sidebar & Website Reload Controls (Sections 7 & 8)
  if (/\b(reload\s+(?:the\s+)?(?:website|page|app)|refresh\s+(?:this\s+)?(?:page|website|app))\b/.test(text)) {
    return { success: true, action: { type: 'RELOAD_WEBSITE', label: 'Reload Website' } };
  }
  if (/\b(go\s+back|previous\s+page|back\s+page)\b/.test(text) && !/patient|case|slice|mesh/.test(text)) {
    return { success: true, action: { type: 'NAVIGATE_HISTORY', direction: 'back', label: 'Go Back (Navigation History)' } };
  }
  if (/\b(go\s+forward|forward\s+page)\b/.test(text) && !/slice/.test(text)) {
    return { success: true, action: { type: 'NAVIGATE_HISTORY', direction: 'forward', label: 'Go Forward (Navigation History)' } };
  }
  if (/\b(expand\s+(?:the\s+)?sidebar|open\s+(?:the\s+)?sidebar)\b/.test(text)) {
    return { success: true, action: { type: 'TOGGLE_SIDEBAR', collapsed: false, label: 'Expand Sidebar' } };
  }
  if (/\b(collapse\s+(?:the\s+)?sidebar|close\s+(?:the\s+)?sidebar)\b/.test(text)) {
    return { success: true, action: { type: 'TOGGLE_SIDEBAR', collapsed: true, label: 'Collapse Sidebar' } };
  }
  if (/\b(open\s+(?:the\s+)?menu|show\s+(?:the\s+)?menu)\b/.test(text)) {
    return { success: true, action: { type: 'TOGGLE_MENU', open: true, label: 'Open Mobile Menu' } };
  }
  if (/\b(close\s+(?:the\s+)?menu|hide\s+(?:the\s+)?menu)\b/.test(text)) {
    return { success: true, action: { type: 'TOGGLE_MENU', open: false, label: 'Close Mobile Menu' } };
  }
  if (/\b(show\s+(?:the\s+)?command\s+panel|show\s+commands|voice\s+commands|voice\s+help|open\s+command\s+panel)\b/.test(text)) {
    return { success: true, action: { type: 'OPEN_HELP_MODAL', label: 'Open Voice Command Reference' } };
  }
  if (/\b(hide\s+(?:the\s+)?command\s+panel|close\s+(?:the\s+)?command\s+panel|close\s+(?:this\s+)?panel|close\s+help)\b/.test(text)) {
    return { success: true, action: { type: 'CLOSE_HELP_MODAL', label: 'Close Command Panel' } };
  }
  if (/\b(?:open|show)\s+(?:the\s+)?settings\b/.test(text)) {
    return { success: true, action: { type: 'OPEN_SETTINGS', label: 'Open Settings Panel' } };
  }
  if (/\b(?:close|hide)\s+(?:the\s+)?settings\b/.test(text)) {
    return { success: true, action: { type: 'CLOSE_SETTINGS', label: 'Close Settings Panel' } };
  }

  // 3. Multi-Coordinate and Single-Axis Commands (Sections 4 & 5)
  // Check for multi-coordinate or coordinate assignment phrases
  const coordData = extractCoordinates(text);
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
          coordinates: { x: coordData.x, y: coordData.y, z: coordData.z },
          label: `Set Multi-Axis Coordinates (${parts.join(', ')})`,
          feedback: `Updated coordinates to ${parts.join(', ')}.`,
        },
      };
    } else {
      // Single coordinate
      if (coordData.z !== undefined) {
        return {
          success: true,
          action: {
            type: 'SET_AXIS_COORDINATE',
            axis: 'z',
            plane: 'axial',
            value: coordData.z,
            label: `Set Z-Axis (Axial) Coordinate to ${coordData.z}`,
            feedback: `Z-axis coordinate updated to ${coordData.z}.`,
          },
        };
      }
      if (coordData.y !== undefined) {
        return {
          success: true,
          action: {
            type: 'SET_AXIS_COORDINATE',
            axis: 'y',
            plane: 'coronal',
            value: coordData.y,
            label: `Set Y-Axis (Coronal) Coordinate to ${coordData.y}`,
            feedback: `Y-axis coordinate updated to ${coordData.y}.`,
          },
        };
      }
      if (coordData.x !== undefined) {
        return {
          success: true,
          action: {
            type: 'SET_AXIS_COORDINATE',
            axis: 'x',
            plane: 'sagittal',
            value: coordData.x,
            label: `Set X-Axis (Sagittal) Coordinate to ${coordData.x}`,
            feedback: `X-axis coordinate updated to ${coordData.x}.`,
          },
        };
      }
    }
  }

  // Direct Axis / Plane Switching (Section 4)
  if (/\b(?:show\s+(?:the\s+)?z\s*axis|switch\s+to\s+axial|move\s+along\s+(?:the\s+)?z\s*axis|axial\s+view|axial\s+plane)\b/.test(text)) {
    return { success: true, action: { type: 'SET_LAYOUT', value: 'axial', axis: 'z', label: 'Switch to Axial View (Z-Axis)' } };
  }
  if (/\b(?:open\s+(?:the\s+)?y\s*axis\s*view|show\s+(?:the\s+)?y\s*axis|switch\s+to\s+coronal|move\s+along\s+(?:the\s+)?y\s*axis|coronal\s+view|coronal\s+plane)\b/.test(text)) {
    return { success: true, action: { type: 'SET_LAYOUT', value: 'coronal', axis: 'y', label: 'Switch to Coronal View (Y-Axis)' } };
  }
  if (/\b(?:show\s+(?:the\s+)?x\s*axis|switch\s+to\s+sagittal|move\s+along\s+(?:the\s+)?x\s*axis|sagittal\s+view|sagittal\s+plane)\b/.test(text)) {
    return { success: true, action: { type: 'SET_LAYOUT', value: 'sagittal', axis: 'x', label: 'Switch to Sagittal View (X-Axis)' } };
  }
  if (/\b(?:switch to|show|view)?\s*(?:3d|three d|model)(\s*(?:view|brain))?\b/.test(text) && !/mesh|mode|rendering/.test(text)) {
    return { success: true, action: { type: 'SET_LAYOUT', value: '3d', label: '3D Anatomical Mesh View' } };
  }
  if (/\b(?:switch to|show|view)?\s*(?:quad|multiplanar|mpr|all views)(\s*(?:view|mpr))?\b/.test(text)) {
    return { success: true, action: { type: 'SET_LAYOUT', value: 'quad', label: 'Quad MPR Reconstruction (4-View)' } };
  }

  // 4. Case and Dataset Selection (Section 6)
  if (/\b(?:show\s+the\s+next\s+case|load\s+the\s+next\s+available\s+case|next\s+case|next\s+patient)\b/.test(text)) {
    return { success: true, action: { type: 'SELECT_CASE', direction: 'next', label: 'Load Next Case' } };
  }
  if (/\b(?:open\s+(?:the\s+)?previous\s+patient|previous\s+case|previous\s+patient|switch\s+to\s+(?:the\s+)?previous\s+patient)\b/.test(text)) {
    return { success: true, action: { type: 'SELECT_CASE', direction: 'prev', label: 'Load Previous Case' } };
  }
  if (/\b(?:return\s+to\s+(?:the\s+)?current\s+case|current\s+case|reset\s+case)\b/.test(text)) {
    return { success: true, action: { type: 'SELECT_CASE', direction: 'current', label: 'Return to Current Case' } };
  }
  if (/\b(?:select\s+case|open\s+patient|search\s+for\s+case|load\s+case)\b/.test(text)) {
    const caseId = extractCaseIdentifier(text);
    return {
      success: true,
      action: {
        type: 'SELECT_CASE',
        query: caseId,
        rawQuery: rawTranscript,
        label: `Select Case ${caseId || 'Spoken'}`,
      },
    };
  }

  // 5. MRI Modalities & Sequences
  if (/\b(?:show|switch to|view|look at)?\s*flair\b/.test(text)) {
    return { success: true, action: { type: 'SET_MODALITY', value: 'flair', label: 'FLAIR Sequence' } };
  }
  if (/\b(?:show|switch to|view|look at)?\s*t1ce\b/.test(text) || /\bt1\s*(?:contrast|ce|post\s*contrast)\b/.test(text)) {
    return { success: true, action: { type: 'SET_MODALITY', value: 't1ce', label: 'T1ce Contrast Sequence' } };
  }
  if (/\b(?:show|switch to|view|look at)?\s*t1\b/.test(text) && !/t1ce|contrast/.test(text)) {
    return { success: true, action: { type: 'SET_MODALITY', value: 't1', label: 'T1 Sequence' } };
  }
  if (/\b(?:show|switch to|view|look at)?\s*t2\b/.test(text)) {
    return { success: true, action: { type: 'SET_MODALITY', value: 't2', label: 'T2 Sequence' } };
  }
  if (/\b(?:show|switch to|view|look at)?\s*ct\b/.test(text) || /\bcomputed tomography\b/.test(text)) {
    return { success: true, action: { type: 'SET_MODALITY', value: 'ct', label: 'Volumetric CT' } };
  }
  if (/\blet(?:'s|\s+us)?\s+look\s+at\s+the\s+other\s+mri\s+scan\b/.test(text)) {
    return { success: true, action: { type: 'CYCLE_MODALITY', label: 'Cycle to Alternate MRI Modality' } };
  }

  // 6. Slice Navigation & Relative Stepping
  if (/\b(?:go to\s+center\s+slice|center\s+slice|middle\s+slice)\b/.test(text)) {
    return { success: true, action: { type: 'GOTO_CENTER_SLICE', label: 'Center Slice Position' } };
  }
  if (/\b(?:reset\s+slice\s+position|reset\s+slice|default\s+slice)\b/.test(text)) {
    return { success: true, action: { type: 'RESET_SLICE', label: 'Reset Slice Position' } };
  }
  if (/\b(?:move\s+a\s+little\s+further\s+down|move\s+further\s+down|scroll\s+down|slice\s+down)\b/.test(text)) {
    return { success: true, action: { type: 'STEP_SLICE', step: -5, label: 'Move Down 5 Slices' } };
  }
  if (/\b(?:move\s+a\s+little\s+further\s+up|move\s+further\s+up|scroll\s+up|slice\s+up)\b/.test(text)) {
    return { success: true, action: { type: 'STEP_SLICE', step: 5, label: 'Move Up 5 Slices' } };
  }
  const sliceMatch = text.match(/\b(?:go to\s+slice|jump to\s+slice|slice\s+number|slice)\s+([a-z0-9\s]+)\b/);
  if (sliceMatch && !/up|down|next|prev|forward|backward|at/.test(sliceMatch[1])) {
    const num = wordsToNumber(sliceMatch[1]);
    if (num !== null && !isNaN(num) && num >= 0) {
      return { success: true, action: { type: 'GOTO_SLICE', index: num, label: `Go to Slice ${num}` } };
    }
  }
  const forwardStepMatch = text.match(/\b(?:move\s+forward|forward|skip|advance)\s+([a-z0-9\s]+?)\s*slices?\b/);
  if (forwardStepMatch) {
    const num = wordsToNumber(forwardStepMatch[1]) || 10;
    return { success: true, action: { type: 'STEP_SLICE', step: num, label: `Move Forward ${num} Slices` } };
  }
  const backwardStepMatch = text.match(/\b(?:move\s+backward|backward|back|rewind)\s+([a-z0-9\s]+?)\s*slices?\b/);
  if (backwardStepMatch) {
    const num = wordsToNumber(backwardStepMatch[1]) || 10;
    return { success: true, action: { type: 'STEP_SLICE', step: -num, label: `Move Backward ${num} Slices` } };
  }
  if (/\b(next\s+slice|forward\s+slice)\b/.test(text)) {
    return { success: true, action: { type: 'STEP_SLICE', step: 1, label: 'Next Slice (+1)' } };
  }
  if (/\b(previous\s+slice|prev\s+slice|back\s+slice)\b/.test(text)) {
    return { success: true, action: { type: 'STEP_SLICE', step: -1, label: 'Previous Slice (-1)' } };
  }

  // 7. Rotation Controls - Discrete One-Shot vs Continuous (Section 9)
  // Continuous rotation start
  if (/\b(?:start\s+rotating\s+left|rotate\s+continuously\s+(?:to\s+the\s+)?left|spin\s+left)\b/.test(text)) {
    return { success: true, action: { type: 'START_CONTINUOUS_ROTATION', direction: 'left', label: 'Start Continuous Rotation (Left)' } };
  }
  if (/\b(?:start\s+rotating(?:\s+right)?|rotate\s+continuously(?:\s+(?:to\s+the\s+)?right)?|spin\s+(?:the\s+)?brain|start\s+continuous\s+rotation)\b/.test(text)) {
    return { success: true, action: { type: 'START_CONTINUOUS_ROTATION', direction: 'right', label: 'Start Continuous Rotation (Right)' } };
  }

  // Stop continuous rotation
  if (/\b(?:stop\s+rotating|stop\s+rotation|stop\s+movement|freeze\s+the\s+view|freeze\s+rotation|cancel\s+rotation|stop\s+spinning|pause\s+rotation)\b/.test(text)) {
    return { success: true, action: { type: 'STOP_ROTATION', label: 'Stop Rotation Movement' } };
  }

  // Discrete one-shot rotations (MUST execute once and STOP)
  if (/\b(?:rotate\s+180\s*degrees?|turn\s+180\s*degrees?|rotate\s+180|flip\s+180)\b/.test(text)) {
    return { success: true, action: { type: 'ROTATE_ONCE', direction: '180', degrees: 180, label: 'Rotate 180° Once' } };
  }
  if (/\b(?:rotate\s+90\s*degrees?\s*left|turn\s+90\s*degrees?\s*left|rotate\s+left\s+90)\b/.test(text)) {
    return { success: true, action: { type: 'ROTATE_ONCE', direction: 'left', degrees: 90, label: 'Rotate Left 90° Once' } };
  }
  if (/\b(?:rotate\s+90\s*degrees?\s*right|turn\s+90\s*degrees?\s*right|rotate\s+right\s+90)\b/.test(text)) {
    return { success: true, action: { type: 'ROTATE_ONCE', direction: 'right', degrees: 90, label: 'Rotate Right 90° Once' } };
  }
  if (/\b(?:rotate\s+left(?:\s+once)?|turn\s+left(?:\s+once)?)\b/.test(text)) {
    return { success: true, action: { type: 'ROTATE_ONCE', direction: 'left', degrees: 15, label: 'Rotate Left (15°)' } };
  }
  if (/\b(?:rotate\s+right(?:\s+once)?|turn\s+right(?:\s+once)?)\b/.test(text)) {
    return { success: true, action: { type: 'ROTATE_ONCE', direction: 'right', degrees: 15, label: 'Rotate Right (15°)' } };
  }
  if (/\b(?:rotate\s+up(?:\s+once)?|tilt\s+up(?:\s+once)?)\b/.test(text)) {
    return { success: true, action: { type: 'ROTATE_ONCE', direction: 'up', degrees: 15, label: 'Rotate Up (15°)' } };
  }
  if (/\b(?:rotate\s+down(?:\s+once)?|tilt\s+down(?:\s+once)?)\b/.test(text)) {
    return { success: true, action: { type: 'ROTATE_ONCE', direction: 'down', degrees: 15, label: 'Rotate Down (15°)' } };
  }
  if (/\b(?:reset\s+rotation|reset\s+camera|reset\s+the\s+camera|recenter\s+camera|recenter\s+rotation)\b/.test(text)) {
    return { success: true, action: { type: 'RESET_ROTATION', label: 'Reset Camera & Rotation' } };
  }

  // 3D Cardinal Camera Presets
  if (/\b(?:superior\s+(?:view|aspect)|top\s+(?:view|aspect))\b/.test(text)) {
    return { success: true, action: { type: 'SET_CAMERA_ANGLE', angle: 'superior', label: 'Superior Aspect (Top View)' } };
  }
  if (/\b(?:inferior\s+(?:view|aspect)|bottom\s+(?:view|aspect)|underside)\b/.test(text)) {
    return { success: true, action: { type: 'SET_CAMERA_ANGLE', angle: 'inferior', label: 'Inferior Aspect (Bottom View)' } };
  }
  if (/\b(?:lateral\s+(?:view|aspect)|side\s+(?:view|aspect))\b/.test(text)) {
    return { success: true, action: { type: 'SET_CAMERA_ANGLE', angle: 'lateral', label: 'Lateral Aspect (Right Side)' } };
  }
  if (/\b(?:anterior\s+(?:view|aspect)|front\s+(?:view|aspect))\b/.test(text)) {
    return { success: true, action: { type: 'SET_CAMERA_ANGLE', angle: 'anterior', label: 'Anterior Aspect (Front View)' } };
  }
  if (/\b(?:posterior\s+(?:view|aspect)|back\s+(?:view|aspect))\b/.test(text)) {
    return { success: true, action: { type: 'SET_CAMERA_ANGLE', angle: 'posterior', label: 'Posterior Aspect (Back View)' } };
  }

  // 8. 3D Mesh, Layers & Volumetric Rendering (Section 3)
  if (/\b(?:show\s+(?:the\s+)?volumetric\s+rendering|switch\s+to\s+volumetric\s+mode|volumetric\s+rendering)\b/.test(text)) {
    return {
      success: true,
      action: {
        type: 'UNSUPPORTED_FEATURE',
        feature: 'volumetric_rendering',
        label: 'Volumetric Rendering Notice',
        message: 'Volumetric raymarching is unavailable in the current viewer. The 3D viewer renders high-fidelity Marching Cubes isosurfaces and anatomical cortical surface meshes.',
      },
    };
  }
  if (/\b(?:go\s+back\s+to\s+mesh\s+mode|switch\s+to\s+mesh\s+mode|surface\s+mode)\b/.test(text)) {
    return {
      success: true,
      action: {
        type: 'SET_RENDER_MODE',
        mode: 'mesh',
        label: 'Active Mode: Surface Mesh',
        message: 'Active 3D rendering mode is surface mesh.',
      },
    };
  }
  if (/\b(?:turn\s+on\s+(?:the\s+)?mesh|show\s+(?:the\s+)?mesh|show\s+(?:the\s+)?surface)\b/.test(text)) {
    return { success: true, action: { type: 'TOGGLE_MESH', visible: true, target: 'all', label: 'Show 3D Surface Mesh' } };
  }
  if (/\b(?:hide\s+(?:the\s+)?mesh|hide\s+(?:the\s+)?3d\s+model|turn\s+off\s+(?:the\s+)?mesh)\b/.test(text)) {
    return { success: true, action: { type: 'TOGGLE_MESH', visible: false, target: 'all', label: 'Hide 3D Surface Mesh' } };
  }
  if (/\b(?:show\s+layers|open\s+(?:the\s+)?layers(?:\s+panel)?)\b/.test(text)) {
    return { success: true, action: { type: 'SHOW_LAYERS_PANEL', label: 'Show Layers Inspector' } };
  }
  if (/\b(?:hide\s+(?:the\s+)?layers|close\s+(?:the\s+)?layers(?:\s+panel)?)\b/.test(text)) {
    return { success: true, action: { type: 'HIDE_LAYERS_PANEL', label: 'Hide Layers Inspector' } };
  }

  // 3D Rendering Appearances
  if (/\b(?:switch to\s+)?anatomical\s+regions\b/.test(text) || /\bmulti\s*shade\s*lobes\b/.test(text)) {
    return { success: true, action: { type: 'SET_BRAIN_APPEARANCE', mode: 'regions', label: 'Anatomical Regions (Lobes)' } };
  }
  if (/\b(?:switch to\s+)?natural\s+anatomy\b/.test(text) || /\bnatural\s+cortex\b/.test(text)) {
    return { success: true, action: { type: 'SET_BRAIN_APPEARANCE', mode: 'natural', label: 'Natural Anatomy Cortex' } };
  }
  if (/\b(?:switch to\s+)?(?:anatomical\s+)?contrast\s*(?:mode)?\b/.test(text) || /\bhigh\s+relief\b/.test(text)) {
    return { success: true, action: { type: 'SET_BRAIN_APPEARANCE', mode: 'contrast', label: 'Anatomical Contrast (High Relief)' } };
  }
  if (/\b(?:switch to\s+)?original\s+appearance\b/.test(text) || /\bclinical\s+neutral\b/.test(text)) {
    return { success: true, action: { type: 'SET_BRAIN_APPEARANCE', mode: 'original', label: 'Original Clinical Appearance' } };
  }

  // 9. Zoom, Pan & Viewport Controls
  if (/\b(?:zoom\s+in\s+twice|double\s+zoom)\b/.test(text)) {
    return { success: true, action: { type: 'ZOOM', factor: 1.44, label: 'Zoom In Twice (1.44x)' } };
  }
  const zoomPercentMatch = text.match(/\bzoom\s+(?:to\s+)?([a-z0-9\s]+?)\s*percent\b/) || text.match(/\bzoom\s+(\d+)%\b/);
  if (zoomPercentMatch) {
    const pct = wordsToNumber(zoomPercentMatch[1]);
    if (pct !== null && pct > 0) {
      return { success: true, action: { type: 'SET_ZOOM', percent: pct, label: `Zoom to ${pct}%` } };
    }
  }
  if (/\b(?:zoom\s+in|magnify)\b/.test(text)) {
    return { success: true, action: { type: 'ZOOM', factor: 1.2, label: 'Zoom In (1.2x)' } };
  }
  if (/\b(?:zoom\s+out|shrink)\b/.test(text)) {
    return { success: true, action: { type: 'ZOOM', factor: 0.83, label: 'Zoom Out (0.83x)' } };
  }
  if (/\b(?:pan\s+left)\b/.test(text)) {
    return { success: true, action: { type: 'PAN', direction: 'left', dx: -40, dy: 0, label: 'Pan Left' } };
  }
  if (/\b(?:pan\s+right)\b/.test(text)) {
    return { success: true, action: { type: 'PAN', direction: 'right', dx: 40, dy: 0, label: 'Pan Right' } };
  }
  if (/\b(?:pan\s+up)\b/.test(text)) {
    return { success: true, action: { type: 'PAN', direction: 'up', dx: 0, dy: -40, label: 'Pan Up' } };
  }
  if (/\b(?:pan\s+down)\b/.test(text)) {
    return { success: true, action: { type: 'PAN', direction: 'down', dx: 0, dy: 40, label: 'Pan Down' } };
  }
  if (/\b(?:center\s+the\s+view|center\s+view|recenter\s+view|fit\s+to\s+view)\b/.test(text)) {
    return { success: true, action: { type: 'CENTER_VIEW', label: 'Fit to View & Center' } };
  }
  if (/\b(?:reset\s+view|reset\s+all\s+views)\b/.test(text)) {
    return { success: true, action: { type: 'RESET_VIEW', label: 'Reset All Viewport Controls' } };
  }
  if (/\b(?:enter\s+full\s*screen|enter\s+fullscreen|maximize\s+view|maximize|fullscreen)\b/.test(text)) {
    return { success: true, action: { type: 'FULLSCREEN', enabled: true, label: 'Enter Fullscreen Mode' } };
  }
  if (/\b(?:exit\s+full\s*screen|exit\s+fullscreen|minimize\s+view|minimize|exit\s+maximize)\b/.test(text)) {
    return { success: true, action: { type: 'FULLSCREEN', enabled: false, label: 'Exit Fullscreen Mode' } };
  }

  // 10. Segmentation & Tumor Controls
  if (/\b(?:show\s+me\s+the\s+tumor|show\s+the\s+tumor|show\s+segmentation|enable\s+segmentation|show\s+overlay|enable\s+overlay)\b/.test(text)) {
    return { success: true, action: { type: 'SET_SEGMENTATION', enabled: true, label: 'Show Tumor Segmentation' } };
  }
  if (/\b(?:hide\s+those\s+colored\s+regions|hide\s+colored\s+regions|hide\s+segmentation|disable\s+segmentation|hide\s+overlay|disable\s+overlay)\b/.test(text)) {
    return { success: true, action: { type: 'SET_SEGMENTATION', enabled: false, label: 'Hide Tumor Segmentation' } };
  }
  if (/\b(?:toggle\s+segmentation|toggle\s+overlay)\b/.test(text)) {
    return { success: true, action: { type: 'TOGGLE_SEGMENTATION', label: 'Toggle Segmentation Overlay' } };
  }
  if (/\b(?:compare\s+ground\s+truth\s+and\s+prediction|compare\s+masks|compare\s+segmentation)\b/.test(text)) {
    return { success: true, action: { type: 'COMPARE_MASKS', label: 'Compare Prediction vs Ground Truth' } };
  }
  if (/\b(?:show\s+ground\s+truth|view\s+ground\s+truth|ground\s+truth)\b/.test(text)) {
    return { success: true, action: { type: 'SET_SEG_SOURCE', value: 'ground_truth', label: 'Ground Truth Mask' } };
  }
  if (/\b(?:show\s+prediction|view\s+prediction|ai\s+prediction|model\s+prediction)\b/.test(text)) {
    return { success: true, action: { type: 'SET_SEG_SOURCE', value: 'prediction', label: 'UNETR Prediction Mask' } };
  }
  if (/\b(?:show\s+corrected|view\s+corrected|human\s+corrections)\b/.test(text)) {
    return { success: true, action: { type: 'SET_SEG_SOURCE', value: 'corrected', label: 'Doctor Corrected Mask' } };
  }

  // Opacity controls
  const opacityMatch = text.match(/\b(?:set\s+(?:overlay\s+)?opacity\s+to|opacity)\s+([a-z0-9\s]+?)\s*percent\b/) || text.match(/\bopacity\s+(\d+)%\b/);
  if (opacityMatch) {
    const pct = wordsToNumber(opacityMatch[1]);
    if (pct !== null && pct >= 0 && pct <= 100) {
      return { success: true, action: { type: 'SET_OPACITY', value: pct / 100, label: `Set Opacity to ${pct}%` } };
    }
  }
  if (/\b(?:increase\s+(?:overlay\s+)?opacity|more\s+opacity)\b/.test(text)) {
    return { success: true, action: { type: 'STEP_OPACITY', delta: 0.1, label: 'Increase Opacity (+10%)' } };
  }
  if (/\b(?:decrease\s+(?:overlay\s+)?opacity|less\s+opacity)\b/.test(text)) {
    return { success: true, action: { type: 'STEP_OPACITY', delta: -0.1, label: 'Decrease Opacity (-10%)' } };
  }
  if (/\b(?:reset\s+overlay|reset\s+opacity)\b/.test(text)) {
    return { success: true, action: { type: 'RESET_OVERLAY', label: 'Reset Opacity to 85%' } };
  }

  // Subregions (WT, TC, ET)
  if (/\b(?:whole\s+tumor|wt)\b/.test(text)) {
    return { success: true, action: { type: 'TOGGLE_SUBREGION', key: 'wt', label: 'Toggle Whole Tumor (WT)' } };
  }
  if (/\b(?:tumor\s+core|tc)\b/.test(text)) {
    return { success: true, action: { type: 'TOGGLE_SUBREGION', key: 'tc', label: 'Toggle Tumor Core (TC)' } };
  }
  if (/\b(?:enhancing\s+tumor|et)\b/.test(text)) {
    return { success: true, action: { type: 'TOGGLE_SUBREGION', key: 'et', label: 'Toggle Enhancing Tumor (ET)' } };
  }

  // 11. Image Adjustments & Coordinates
  if (/\b(?:increase\s+brightness|more\s+brightness|brighter)\b/.test(text)) {
    return { success: true, action: { type: 'STEP_BRIGHTNESS', delta: 15, label: 'Increase Brightness (+15%)' } };
  }
  if (/\b(?:decrease\s+brightness|less\s+brightness|darker)\b/.test(text)) {
    return { success: true, action: { type: 'STEP_BRIGHTNESS', delta: -15, label: 'Decrease Brightness (-15%)' } };
  }
  if (/\b(?:increase\s+contrast|more\s+contrast|higher\s+contrast)\b/.test(text)) {
    return { success: true, action: { type: 'STEP_CONTRAST', delta: 15, label: 'Increase Contrast (+15%)' } };
  }
  if (/\b(?:decrease\s+contrast|less\s+contrast|lower\s+contrast)\b/.test(text)) {
    return { success: true, action: { type: 'STEP_CONTRAST', delta: -15, label: 'Decrease Contrast (-15%)' } };
  }
  if (/\b(?:reset\s+image\s+adjustments|reset\s+brightness|reset\s+contrast)\b/.test(text)) {
    return { success: true, action: { type: 'RESET_ADJUSTMENTS', label: 'Reset Brightness & Contrast' } };
  }
  if (/\b(?:show\s+current\s+coordinates|show\s+coordinates|current\s+coordinates|where\s+am\s+i)\b/.test(text)) {
    return { success: true, action: { type: 'SHOW_COORDINATES', label: 'Announce Coordinates' } };
  }

  // 12. Meta Voice Controls
  if (/\b(?:repeat\s+last\s+command|repeat)\b/.test(text)) {
    return { success: true, action: { type: 'REPEAT_LAST_COMMAND', label: 'Repeat Last Command' } };
  }
  if (/\b(?:stop\s+listening|mute\s+microphone|turn\s+off\s+microphone|stop\s+voice)\b/.test(text)) {
    return { success: true, action: { type: 'STOP_LISTENING', label: 'Stop Voice Recognition' } };
  }

  // Unrecognized command
  return {
    success: false,
    error: `Unrecognized command: "${rawTranscript}". Say "Show commands" or check the help guide.`,
    transcript: rawTranscript,
  };
}

/**
 * Categorized Voice Commands Guide for Help Panel
 */
export const VOICE_COMMANDS_HELP = [
  {
    category: 'Website Navigation',
    color: 'teal',
    commands: [
      { speech: 'Open the overview / dashboard', effect: 'Navigates to the platform overview dashboard' },
      { speech: 'I want to upload a scan', effect: 'Navigates to the multi-modal scan ingestion pipeline' },
      { speech: 'Open the 3D viewer', effect: 'Opens the 3D MPR volumetric neuroimaging workstation' },
      { speech: 'Show adaptive learning', effect: 'Opens the active-learning annotation & retraining hub' },
      { speech: 'Go to classification', effect: 'Opens the 2D EfficientNet slice classifier' },
      { speech: 'Show my results', effect: 'Opens quantitative validation metrics and report' },
      { speech: 'Open about', effect: 'Displays model architecture, research, and citations' },
      { speech: 'Play cinematic intro', effect: 'Launches the 4K cinematic animation video' },
    ],
  },
  {
    category: 'X, Y, Z Coordinates',
    color: 'blue',
    commands: [
      { speech: 'Set Z-axis coordinate to 50', effect: 'Directly jumps Axial slice to coordinate 50' },
      { speech: 'Set Y-axis coordinate to 70', effect: 'Directly jumps Coronal slice to coordinate 70' },
      { speech: 'Set X-axis coordinate to 50', effect: 'Directly jumps Sagittal slice to coordinate 50' },
      { speech: 'Set Z to 50 and Y to 70', effect: 'Atomically updates Axial (Z) and Coronal (Y) coordinates' },
      { speech: 'Set X to 40, Y to 70, and Z to 50', effect: 'Atomically updates all three spatial orthogonal coordinates' },
      { speech: 'Move brain view to coordinates 40, 70, 50', effect: 'Aligns 3D crosshair reticle to exact voxel index' },
      { speech: 'Show slice at Z 50', effect: 'Selects Axial plane and positions slice at coordinate 50' },
    ],
  },
  {
    category: 'Case & Dataset Selection',
    color: 'indigo',
    commands: [
      { speech: 'Show the next case', effect: 'Loads the next verified patient from the BraTS cohort' },
      { speech: 'Open the previous patient', effect: 'Navigates back to the preceding patient dataset' },
      { speech: 'Select case BraTS 2021 01018', effect: 'Searches and loads specified patient volume' },
      { speech: 'Open patient 01017', effect: 'Matches spoken digits against loaded patient repository' },
      { speech: 'Return to the current case', effect: 'Restores the baseline active patient selection' },
    ],
  },
  {
    category: 'Rotation & Camera Movement',
    color: 'emerald',
    commands: [
      { speech: 'Rotate left / right once', effect: 'Executes one discrete 15° step and stops immediately' },
      { speech: 'Rotate up / down once', effect: 'Tilts camera elevation by 15° once and stops' },
      { speech: 'Rotate 90 degrees right / left', effect: 'Turns view by exactly 90° once and stops' },
      { speech: 'Start rotating left / right', effect: 'Initiates smooth continuous camera orbit' },
      { speech: 'Stop rotating / Freeze view', effect: 'Immediately halts any ongoing continuous rotation' },
      { speech: 'Reset camera / rotation', effect: 'Restores default isometric camera viewpoint' },
      { speech: 'Superior / Inferior view', effect: 'Snaps 3D camera to Top or Bottom anatomical aspect' },
      { speech: 'Anterior / Posterior view', effect: 'Snaps 3D camera to Front or Back anatomical aspect' },
    ],
  },
  {
    category: '3D Mesh & Rendering Modes',
    color: 'cyan',
    commands: [
      { speech: 'Turn on / show the mesh', effect: 'Enables 3D anatomical brain cortex surface mesh' },
      { speech: 'Hide the 3D model / mesh', effect: 'Hides brain surface mesh to focus solely on tumor' },
      { speech: 'Show volumetric rendering', effect: 'Reports volumetric raymarching vs surface mesh status' },
      { speech: 'Go back to mesh mode', effect: 'Confirms active WebGL surface mesh rendering' },
      { speech: 'Switch to anatomical regions', effect: 'Displays multi-shade lobes (frontal, parietal, etc.)' },
      { speech: 'Switch to natural anatomy', effect: 'Applies realistic warm pink-beige cerebral cortex' },
      { speech: 'Switch to contrast mode', effect: 'Amplifies sulcal relief and gyral crest contrast' },
    ],
  },
  {
    category: 'Menu, Sidebar & Panels',
    color: 'amber',
    commands: [
      { speech: 'Expand / Collapse sidebar', effect: 'Toggles full sidebar vs compact icon navigation rail' },
      { speech: 'Open / Close menu', effect: 'Toggles mobile responsive drawer' },
      { speech: 'Show / Hide command panel', effect: 'Toggles this voice command reference modal' },
      { speech: 'Enter / Exit full screen', effect: 'Maximizes active viewport to fullscreen or restores layout' },
      { speech: 'Reload the website', effect: 'Performs clean browser reload without looping' },
      { speech: 'Go back / Go forward', effect: 'Navigates through application history' },
    ],
  },
  {
    category: 'Segmentation & Overlays',
    color: 'rose',
    commands: [
      { speech: 'Show me the tumor', effect: 'Enables colored BraTS segmentation overlays' },
      { speech: 'Hide those colored regions', effect: 'Hides segmentation overlays to inspect raw MRI voxels' },
      { speech: 'Increase / Decrease opacity', effect: 'Modulates overlay transparency by 10%' },
      { speech: 'Set overlay opacity to 50 percent', effect: 'Sets exact overlay opacity' },
      { speech: 'Show ground truth / prediction', effect: 'Switches between human annotation and UNETR model' },
      { speech: 'Compare ground truth and prediction', effect: 'Opens differential Dice/HD95 comparison modal' },
      { speech: 'Toggle whole tumor / core / enhancing', effect: 'Toggles individual BraTS tumor subregions' },
    ],
  },
];
