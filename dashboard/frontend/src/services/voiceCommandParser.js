/**
 * NeuroVision AI - Voice Command Parser Service
 * Converts natural speech transcripts into structured, validated MRI viewer actions.
 */

// Number words map for conversion
const NUMBER_WORDS = {
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

/**
 * Convert spoken words into numeric values (e.g. "seventy five" -> 75, "one hundred fifty" -> 150)
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
 * Normalizes speech transcript: lowercases, strips trailing punctuation, cleans fillers.
 */
export function normalizeTranscript(raw) {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .trim()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Categorized Command Definitions & Regex Matchers
 */
export function parseVoiceCommand(rawTranscript) {
  const text = normalizeTranscript(rawTranscript);
  if (!text) {
    return { success: false, error: 'Empty speech input' };
  }

  // 1. MRI Modalities
  if (/\b(show|switch to|view)?\s*flair\b/.test(text)) {
    return { success: true, action: { type: 'SET_MODALITY', value: 'flair', label: 'FLAIR Sequence' } };
  }
  if (/\b(show|switch to|view)?\s*t1ce\b/.test(text) || /\bt1\s*(contrast|ce|post\s*contrast)\b/.test(text)) {
    return { success: true, action: { type: 'SET_MODALITY', value: 't1ce', label: 'T1ce Contrast Sequence' } };
  }
  if (/\b(show|switch to|view)?\s*t1\b/.test(text) && !/t1ce|contrast/.test(text)) {
    return { success: true, action: { type: 'SET_MODALITY', value: 't1', label: 'T1 Sequence' } };
  }
  if (/\b(show|switch to|view)?\s*t2\b/.test(text)) {
    return { success: true, action: { type: 'SET_MODALITY', value: 't2', label: 'T2 Sequence' } };
  }
  if (/\b(show|switch to|view)?\s*ct\b/.test(text) || /\bcomputed tomography\b/.test(text)) {
    return { success: true, action: { type: 'SET_MODALITY', value: 'ct', label: 'Volumetric CT' } };
  }

  // 2. Anatomical Planes & View Layout
  if (/\b(switch to|show|view)?\s*axial(\s*(view|plane))?\b/.test(text)) {
    return { success: true, action: { type: 'SET_LAYOUT', value: 'axial', label: 'Axial Plane (Transverse)' } };
  }
  if (/\b(switch to|show|view)?\s*coronal(\s*(view|plane))?\b/.test(text)) {
    return { success: true, action: { type: 'SET_LAYOUT', value: 'coronal', label: 'Coronal Plane (Frontal)' } };
  }
  if (/\b(switch to|show|view)?\s*sagittal(\s*(view|plane))?\b/.test(text)) {
    return { success: true, action: { type: 'SET_LAYOUT', value: 'sagittal', label: 'Sagittal Plane (Lateral)' } };
  }
  if (/\b(switch to|show|view)?\s*(3d|three d|model)(\s*(view|brain))?\b/.test(text)) {
    return { success: true, action: { type: 'SET_LAYOUT', value: '3d', label: '3D Volumetric Mesh' } };
  }
  if (/\b(switch to|show|view)?\s*(quad|multiplanar|mpr|all views)(\s*(view|mpr))?\b/.test(text)) {
    return { success: true, action: { type: 'SET_LAYOUT', value: 'quad', label: 'Quad MPR Reconstruction' } };
  }

  // 3. Slice Navigation
  if (/\b(go to\s+center\s+slice|center\s+slice|middle\s+slice)\b/.test(text)) {
    return { success: true, action: { type: 'GOTO_CENTER_SLICE', label: 'Center Slice Position' } };
  }
  if (/\b(reset\s+slice\s+position|reset\s+slice|default\s+slice)\b/.test(text)) {
    return { success: true, action: { type: 'RESET_SLICE', label: 'Reset Slice Position' } };
  }

  // Specific slice jumping (e.g. "go to slice 50", "slice 120", "jump to slice eighty")
  const sliceMatch = text.match(/\b(?:go to\s+slice|jump to\s+slice|slice\s+number|slice)\s+([a-z0-9\s]+)\b/);
  if (sliceMatch && !/up|down|next|prev|forward|backward/.test(sliceMatch[1])) {
    const num = wordsToNumber(sliceMatch[1]);
    if (num !== null && !isNaN(num) && num >= 0) {
      return { success: true, action: { type: 'GOTO_SLICE', index: num, label: `Go to Slice ${num}` } };
    }
  }

  // Stepping relative slices (e.g. "move forward 10 slices", "forward 5 slices")
  const forwardStepMatch = text.match(/\b(?:move\s+forward|forward|skip|advance)\s+([a-z0-9\s]+?)\s*slices?\b/);
  if (forwardStepMatch) {
    const num = wordsToNumber(forwardStepMatch[1]) || 10;
    return { success: true, action: { type: 'STEP_SLICE', step: num, label: `Move Forward ${num} Slices` } };
  }

  // Stepping backward relative slices (e.g. "move backward 10 slices", "back 5 slices")
  const backwardStepMatch = text.match(/\b(?:move\s+backward|backward|back|rewind)\s+([a-z0-9\s]+?)\s*slices?\b/);
  if (backwardStepMatch) {
    const num = wordsToNumber(backwardStepMatch[1]) || 10;
    return { success: true, action: { type: 'STEP_SLICE', step: -num, label: `Move Backward ${num} Slices` } };
  }

  if (/\b(next\s+slice|slice\s+up|scroll\s+forward|forward\s+slice)\b/.test(text)) {
    return { success: true, action: { type: 'STEP_SLICE', step: 1, label: 'Next Slice (+1)' } };
  }
  if (/\b(previous\s+slice|prev\s+slice|slice\s+down|scroll\s+backward|back\s+slice)\b/.test(text)) {
    return { success: true, action: { type: 'STEP_SLICE', step: -1, label: 'Previous Slice (-1)' } };
  }

  // 4. Rotation Controls
  if (/\b(rotate\s+180\s*degrees?|turn\s+180\s*degrees?|rotate\s+180|flip\s+180)\b/.test(text)) {
    return { success: true, action: { type: 'ROTATE', direction: '180', degrees: 180, label: 'Rotate 180°' } };
  }
  if (/\b(rotate\s+90\s*degrees?\s*left|turn\s+90\s*degrees?\s*left|rotate\s+left\s+90)\b/.test(text)) {
    return { success: true, action: { type: 'ROTATE', direction: 'left', degrees: 90, label: 'Rotate Left 90°' } };
  }
  if (/\b(rotate\s+90\s*degrees?\s*right|turn\s+90\s*degrees?\s*right|rotate\s+right\s+90)\b/.test(text)) {
    return { success: true, action: { type: 'ROTATE', direction: 'right', degrees: 90, label: 'Rotate Right 90°' } };
  }
  if (/\b(rotate\s+left|turn\s+left)\b/.test(text)) {
    return { success: true, action: { type: 'ROTATE', direction: 'left', degrees: 15, label: 'Rotate Left (15°)' } };
  }
  if (/\b(rotate\s+right|turn\s+right)\b/.test(text)) {
    return { success: true, action: { type: 'ROTATE', direction: 'right', degrees: 15, label: 'Rotate Right (15°)' } };
  }
  if (/\b(rotate\s+up|tilt\s+up)\b/.test(text)) {
    return { success: true, action: { type: 'ROTATE', direction: 'up', degrees: 15, label: 'Rotate Up (15°)' } };
  }
  if (/\b(rotate\s+down|tilt\s+down)\b/.test(text)) {
    return { success: true, action: { type: 'ROTATE', direction: 'down', degrees: 15, label: 'Rotate Down (15°)' } };
  }
  if (/\b(reset\s+rotation|reset\s+angle|recenter\s+rotation)\b/.test(text)) {
    return { success: true, action: { type: 'RESET_ROTATION', label: 'Reset Rotation' } };
  }

  // 3D Camera Angles
  if (/\b(superior\s+(view|aspect)|top\s+(view|aspect))\b/.test(text)) {
    return { success: true, action: { type: 'SET_CAMERA_ANGLE', angle: 'superior', label: 'Superior Aspect (Top View)' } };
  }
  if (/\b(inferior\s+(view|aspect)|bottom\s+(view|aspect)|underside)\b/.test(text)) {
    return { success: true, action: { type: 'SET_CAMERA_ANGLE', angle: 'inferior', label: 'Inferior Aspect (Bottom View)' } };
  }
  if (/\b(lateral\s+(view|aspect)|side\s+(view|aspect))\b/.test(text)) {
    return { success: true, action: { type: 'SET_CAMERA_ANGLE', angle: 'lateral', label: 'Lateral Aspect (Right Side)' } };
  }
  if (/\b(anterior\s+(view|aspect)|front\s+(view|aspect))\b/.test(text)) {
    return { success: true, action: { type: 'SET_CAMERA_ANGLE', angle: 'anterior', label: 'Anterior Aspect (Front View)' } };
  }
  if (/\b(posterior\s+(view|aspect)|back\s+(view|aspect))\b/.test(text)) {
    return { success: true, action: { type: 'SET_CAMERA_ANGLE', angle: 'posterior', label: 'Posterior Aspect (Back View)' } };
  }

  // 5. Zoom & Pan & View Controls
  if (/\b(zoom\s+in\s+twice|double\s+zoom)\b/.test(text)) {
    return { success: true, action: { type: 'ZOOM', factor: 1.44, label: 'Zoom In Twice (1.44x)' } };
  }
  const zoomPercentMatch = text.match(/\bzoom\s+(?:to\s+)?([a-z0-9\s]+?)\s*percent\b/) || text.match(/\bzoom\s+(\d+)%\b/);
  if (zoomPercentMatch) {
    const pct = wordsToNumber(zoomPercentMatch[1]);
    if (pct !== null && pct > 0) {
      return { success: true, action: { type: 'SET_ZOOM', percent: pct, label: `Zoom to ${pct}%` } };
    }
  }
  if (/\b(zoom\s+in|magnify)\b/.test(text)) {
    return { success: true, action: { type: 'ZOOM', factor: 1.2, label: 'Zoom In (1.2x)' } };
  }
  if (/\b(zoom\s+out|shrink)\b/.test(text)) {
    return { success: true, action: { type: 'ZOOM', factor: 0.83, label: 'Zoom Out (0.83x)' } };
  }

  if (/\b(pan\s+left)\b/.test(text)) {
    return { success: true, action: { type: 'PAN', direction: 'left', dx: -40, dy: 0, label: 'Pan Left' } };
  }
  if (/\b(pan\s+right)\b/.test(text)) {
    return { success: true, action: { type: 'PAN', direction: 'right', dx: 40, dy: 0, label: 'Pan Right' } };
  }
  if (/\b(pan\s+up)\b/.test(text)) {
    return { success: true, action: { type: 'PAN', direction: 'up', dx: 0, dy: -40, label: 'Pan Up' } };
  }
  if (/\b(pan\s+down)\b/.test(text)) {
    return { success: true, action: { type: 'PAN', direction: 'down', dx: 0, dy: 40, label: 'Pan Down' } };
  }

  if (/\b(center\s+the\s+view|center\s+view|recenter\s+view|fit\s+to\s+view)\b/.test(text)) {
    return { success: true, action: { type: 'CENTER_VIEW', label: 'Fit to View & Center' } };
  }
  if (/\b(reset\s+view|reset\s+all\s+views)\b/.test(text)) {
    return { success: true, action: { type: 'RESET_VIEW', label: 'Reset All Viewport Controls' } };
  }

  // Full Screen / Maximize
  if (/\b(enter\s+full\s*screen|enter\s+fullscreen|maximize\s+view|maximize|fullscreen)\b/.test(text)) {
    return { success: true, action: { type: 'FULLSCREEN', enabled: true, label: 'Enter Fullscreen Mode' } };
  }
  if (/\b(exit\s+full\s*screen|exit\s+fullscreen|minimize\s+view|minimize|exit\s+maximize)\b/.test(text)) {
    return { success: true, action: { type: 'FULLSCREEN', enabled: false, label: 'Exit Fullscreen Mode' } };
  }

  // 6. Segmentation & Overlay Controls
  if (/\b(compare\s+ground\s+truth\s+and\s+prediction|compare\s+masks|compare\s+segmentation)\b/.test(text)) {
    return { success: true, action: { type: 'COMPARE_MASKS', label: 'Compare Prediction vs Ground Truth' } };
  }
  if (/\b(show\s+ground\s+truth|view\s+ground\s+truth|ground\s+truth)\b/.test(text)) {
    return { success: true, action: { type: 'SET_SEG_SOURCE', value: 'ground_truth', label: 'Ground Truth Mask' } };
  }
  if (/\b(show\s+prediction|view\s+prediction|ai\s+prediction|model\s+prediction)\b/.test(text)) {
    return { success: true, action: { type: 'SET_SEG_SOURCE', value: 'prediction', label: 'UNETR Prediction Mask' } };
  }
  if (/\b(show\s+corrected|view\s+corrected|human\s+corrections)\b/.test(text)) {
    return { success: true, action: { type: 'SET_SEG_SOURCE', value: 'corrected', label: 'Doctor Corrected Mask' } };
  }

  if (/\b(show\s+segmentation|enable\s+segmentation|show\s+overlay|enable\s+overlay)\b/.test(text)) {
    return { success: true, action: { type: 'SET_SEGMENTATION', enabled: true, label: 'Show Tumor Segmentation' } };
  }
  if (/\b(hide\s+segmentation|disable\s+segmentation|hide\s+overlay|disable\s+overlay)\b/.test(text)) {
    return { success: true, action: { type: 'SET_SEGMENTATION', enabled: false, label: 'Hide Tumor Segmentation' } };
  }
  if (/\b(toggle\s+segmentation|toggle\s+overlay)\b/.test(text)) {
    return { success: true, action: { type: 'TOGGLE_SEGMENTATION', label: 'Toggle Segmentation Overlay' } };
  }

  // Opacity controls
  const opacityMatch = text.match(/\b(?:set\s+(?:overlay\s+)?opacity\s+to|opacity)\s+([a-z0-9\s]+?)\s*percent\b/) || text.match(/\bopacity\s+(\d+)%\b/);
  if (opacityMatch) {
    const pct = wordsToNumber(opacityMatch[1]);
    if (pct !== null && pct >= 0 && pct <= 100) {
      return { success: true, action: { type: 'SET_OPACITY', value: pct / 100, label: `Set Opacity to ${pct}%` } };
    }
  }
  if (/\b(increase\s+(overlay\s+)?opacity|more\s+opacity)\b/.test(text)) {
    return { success: true, action: { type: 'STEP_OPACITY', delta: 0.1, label: 'Increase Opacity (+10%)' } };
  }
  if (/\b(decrease\s+(overlay\s+)?opacity|less\s+opacity)\b/.test(text)) {
    return { success: true, action: { type: 'STEP_OPACITY', delta: -0.1, label: 'Decrease Opacity (-10%)' } };
  }
  if (/\b(reset\s+overlay|reset\s+opacity)\b/.test(text)) {
    return { success: true, action: { type: 'RESET_OVERLAY', label: 'Reset Opacity to 85%' } };
  }

  // Subregions (WT, TC, ET)
  if (/\b(whole\s+tumor|wt)\b/.test(text)) {
    return { success: true, action: { type: 'TOGGLE_SUBREGION', key: 'wt', label: 'Toggle Whole Tumor (WT)' } };
  }
  if (/\b(tumor\s+core|tc)\b/.test(text)) {
    return { success: true, action: { type: 'TOGGLE_SUBREGION', key: 'tc', label: 'Toggle Tumor Core (TC)' } };
  }
  if (/\b(enhancing\s+tumor|et)\b/.test(text)) {
    return { success: true, action: { type: 'TOGGLE_SUBREGION', key: 'et', label: 'Toggle Enhancing Tumor (ET)' } };
  }

  // 7. Image Adjustment Commands (Display layer filters)
  if (/\b(increase\s+brightness|more\s+brightness|brighter)\b/.test(text)) {
    return { success: true, action: { type: 'STEP_BRIGHTNESS', delta: 15, label: 'Increase Brightness (+15%)' } };
  }
  if (/\b(decrease\s+brightness|less\s+brightness|darker)\b/.test(text)) {
    return { success: true, action: { type: 'STEP_BRIGHTNESS', delta: -15, label: 'Decrease Brightness (-15%)' } };
  }
  if (/\b(increase\s+contrast|more\s+contrast|higher\s+contrast)\b/.test(text)) {
    return { success: true, action: { type: 'STEP_CONTRAST', delta: 15, label: 'Increase Contrast (+15%)' } };
  }
  if (/\b(decrease\s+contrast|less\s+contrast|lower\s+contrast)\b/.test(text)) {
    return { success: true, action: { type: 'STEP_CONTRAST', delta: -15, label: 'Decrease Contrast (-15%)' } };
  }
  if (/\b(reset\s+image\s+adjustments|reset\s+brightness|reset\s+contrast)\b/.test(text)) {
    return { success: true, action: { type: 'RESET_ADJUSTMENTS', label: 'Reset Brightness & Contrast' } };
  }
  if (/\b(show\s+current\s+coordinates|show\s+coordinates|current\s+coordinates|where\s+am\s+i)\b/.test(text)) {
    return { success: true, action: { type: 'SHOW_COORDINATES', label: 'Display Voxel Coordinates' } };
  }

  // 8. Meta Voice Commands
  if (/\b(repeat\s+last\s+command|repeat)\b/.test(text)) {
    return { success: true, action: { type: 'REPEAT_LAST_COMMAND', label: 'Repeat Last Command' } };
  }
  if (/\b(stop\s+listening|mute\s+microphone|turn\s+off\s+microphone|stop\s+voice)\b/.test(text)) {
    return { success: true, action: { type: 'STOP_LISTENING', label: 'Stop Listening' } };
  }

  // 9. Platform Navigation
  if (/\b(go to|open)\s+(3d\s+)?viewer\b/.test(text)) {
    return { success: true, action: { type: 'NAVIGATE', tab: 'viewer', label: 'Navigate to 3D Viewer' } };
  }
  if (/\b(go to|open)\s+upload\b/.test(text) || /\bupload\s+scan\b/.test(text)) {
    return { success: true, action: { type: 'NAVIGATE', tab: 'upload', label: 'Navigate to Upload Scan' } };
  }
  if (/\b(go to|open)\s+overview\b/.test(text)) {
    return { success: true, action: { type: 'NAVIGATE', tab: 'overview', label: 'Navigate to Overview' } };
  }
  if (/\b(go to|open)\s+classify\b/.test(text) || /\b(go to|open)\s+classification\b/.test(text)) {
    return { success: true, action: { type: 'NAVIGATE', tab: 'classify', label: 'Navigate to 2D Classification' } };
  }
  if (/\b(go to|open)\s+results\b/.test(text)) {
    return { success: true, action: { type: 'NAVIGATE', tab: 'results', label: 'Navigate to Results & Metrics' } };
  }
  if (/\b(go to|open)\s+adaptive(\s+learning)?\b/.test(text)) {
    return { success: true, action: { type: 'NAVIGATE', tab: 'adaptive', label: 'Navigate to Adaptive Learning' } };
  }
  if (/\b(go to|open)\s+about\b/.test(text)) {
    return { success: true, action: { type: 'NAVIGATE', tab: 'about', label: 'Navigate to About Specifications' } };
  }
  if (/\b(play\s+intro|show\s+intro|replay\s+intro)\b/.test(text)) {
    return { success: true, action: { type: 'PLAY_INTRO', label: 'Play 4K Cinematic Intro' } };
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
    category: 'MRI Modality',
    color: 'teal',
    commands: [
      { speech: 'Show FLAIR', effect: 'Switches display to Fluid Attenuated Inversion Recovery' },
      { speech: 'Show T1', effect: 'Switches display to T1-weighted structural scan' },
      { speech: 'Show T1ce', effect: 'Switches display to T1 contrast-enhanced sequence' },
      { speech: 'Show T2', effect: 'Switches display to T2-weighted structural scan' },
      { speech: 'Show CT', effect: 'Displays volumetric CT if available' },
    ],
  },
  {
    category: 'Anatomical Planes & Layout',
    color: 'cyan',
    commands: [
      { speech: 'Switch to axial view', effect: 'Displays Transverse horizontal plane (Z-axis)' },
      { speech: 'Switch to coronal view', effect: 'Displays Frontal vertical plane (Y-axis)' },
      { speech: 'Switch to sagittal view', effect: 'Displays Lateral vertical plane (X-axis)' },
      { speech: 'Switch to 3D view', effect: 'Expands 3D anatomical brain model' },
      { speech: 'Switch to quad view', effect: 'Returns to synchronized 4-panel MPR layout' },
    ],
  },
  {
    category: 'Slice Navigation',
    color: 'emerald',
    commands: [
      { speech: 'Next slice', effect: 'Steps forward by 1 slice' },
      { speech: 'Previous slice', effect: 'Steps backward by 1 slice' },
      { speech: 'Move forward 10 slices', effect: 'Advances slice index by +10' },
      { speech: 'Move backward 10 slices', effect: 'Rewinds slice index by -10' },
      { speech: 'Go to slice 75', effect: 'Jumps directly to designated slice number' },
      { speech: 'Go to center slice', effect: 'Snaps to anatomical center of volume' },
      { speech: 'Reset slice position', effect: 'Resets all slice coordinates to default midpoint' },
    ],
  },
  {
    category: 'Rotation Controls',
    color: 'indigo',
    commands: [
      { speech: 'Rotate left / right', effect: 'Rotates active slice or 3D view by 15°' },
      { speech: 'Rotate up / down', effect: 'Tilts 3D camera elevation angle' },
      { speech: 'Rotate 90 degrees right / left', effect: 'Rotates view by 90°' },
      { speech: 'Rotate 180 degrees', effect: 'Flips orientation by 180°' },
      { speech: 'Reset rotation', effect: 'Restores default 0° rotation and camera orientation' },
      { speech: 'Superior / Inferior view', effect: 'Snaps 3D camera to Top or Bottom anatomical aspect' },
      { speech: 'Anterior / Posterior view', effect: 'Snaps 3D camera to Front or Back aspect' },
    ],
  },
  {
    category: 'Zoom, Pan & Viewport',
    color: 'blue',
    commands: [
      { speech: 'Zoom in / Zoom out', effect: 'Increases or decreases magnification' },
      { speech: 'Zoom in twice', effect: 'Applies 1.44x double magnification' },
      { speech: 'Zoom to 150 percent', effect: 'Sets exact zoom level (bounded 40% - 500%)' },
      { speech: 'Pan left / right / up / down', effect: 'Offsets viewport position' },
      { speech: 'Center the view', effect: 'Centers MRI slice and fits to viewport' },
      { speech: 'Reset view', effect: 'Resets pan, zoom, and rotation' },
      { speech: 'Enter full screen / Exit full screen', effect: 'Toggles full-screen maximized mode' },
    ],
  },
  {
    category: 'Segmentation & Overlays',
    color: 'rose',
    commands: [
      { speech: 'Show / Hide segmentation', effect: 'Toggles visibility of colored tumor masks' },
      { speech: 'Increase / Decrease opacity', effect: 'Adjusts overlay transparency by 10%' },
      { speech: 'Set overlay opacity to 50 percent', effect: 'Sets exact opacity percentage' },
      { speech: 'Show ground truth', effect: 'Loads expert annotated ground truth mask' },
      { speech: 'Show prediction', effect: 'Loads UNETR model inference output' },
      { speech: 'Compare ground truth and prediction', effect: 'Opens Dice & HD95 comparison panel' },
      { speech: 'Whole tumor / Tumor core / Enhancing', effect: 'Toggles individual BraTS subregions' },
    ],
  },
  {
    category: 'Image Adjustments & Platform',
    color: 'amber',
    commands: [
      { speech: 'Increase / Decrease brightness', effect: 'Adjusts display layer brightness (+/- 15%)' },
      { speech: 'Increase / Decrease contrast', effect: 'Adjusts display layer contrast (+/- 15%)' },
      { speech: 'Reset image adjustments', effect: 'Restores baseline 100% brightness and contrast' },
      { speech: 'Show current coordinates', effect: 'Announces active voxel XYZ coordinates' },
      { speech: 'Go to upload / results / overview', effect: 'Navigates directly between platform tabs' },
      { speech: 'Stop listening', effect: 'Deactivates voice recognition microphone' },
    ],
  },
];
