/**
 * Comprehensive Automated Verification Suite for Intelligent Voice Control
 * Covers full website navigation, X/Y/Z axes, multi-coordinates, case selection,
 * 3D mesh rendering, continuous vs one-shot rotation, and menu controls.
 */

import {
  parseVoiceCommand,
  extractCoordinates,
  extractCaseIdentifier,
  wordsToNumber,
} from './voiceCommandParser.js';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
  } else {
    failedTests++;
    console.error(`❌ FAIL: ${message}`);
  }
}

console.log('--- STARTING VOICE CONTROL AUTOMATED VERIFICATION ---');

// 1. Spoken Word & Digit Normalization
assert(wordsToNumber('50') === 50, 'wordsToNumber direct digits');
assert(wordsToNumber('seventy') === 70, 'wordsToNumber seventy');
assert(wordsToNumber('one hundred fifty') === 150, 'wordsToNumber one hundred fifty');
assert(wordsToNumber('forty two') === 42, 'wordsToNumber forty two');

// Case ID Extraction
assert(extractCaseIdentifier('BraTS 2021 0 1 0 1 8 1 7') === '0101817', 'extractCaseIdentifier spaced digits');
assert(extractCaseIdentifier('open patient 01017') === '01017', 'extractCaseIdentifier direct patient digits');
assert(extractCaseIdentifier('select case 01018') === '01018', 'extractCaseIdentifier case digits');

// 2. Multi-Coordinate Extraction
const coords1 = extractCoordinates('Set the Z-axis coordinate to 50 and the Y-axis coordinate to 70.');
assert(coords1 && coords1.z === 50 && coords1.y === 70, 'Multi-coord Z 50 and Y 70');

const coords2 = extractCoordinates('Set X to 40, Y to 70, and Z to 50.');
assert(coords2 && coords2.x === 40 && coords2.y === 70 && coords2.z === 50, 'Triple coord X 40, Y 70, Z 50');

const coords3 = extractCoordinates('Move the brain view to coordinates 40, 70, 50.');
assert(coords3 && coords3.x === 40 && coords3.y === 70 && coords3.z === 50, 'Coordinates 40 70 50 pattern');

const coords4 = extractCoordinates('Show the slice at Z 50.');
assert(coords4 && coords4.z === 50, 'Show slice at Z 50');

const coords5 = extractCoordinates('Move the sagittal plane to coordinate 60.');
assert(coords5 && coords5.x === 60, 'Move sagittal plane to 60');

// 3. Full Website Navigation
const navTests = [
  ['Open the overview.', 'overview'],
  ['Take me to the dashboard.', 'overview'],
  ['Go to home page', 'overview'],
  ['I want to upload a scan.', 'upload'],
  ['Open the 3D viewer.', 'viewer'],
  ['Show adaptive learning.', 'adaptive'],
  ['Go to classification.', 'classify'],
  ['Show my results.', 'results'],
  ['Open about.', 'about'],
  ['Play cinematic intro', 'PLAY_INTRO'],
];
for (const [phrase, expected] of navTests) {
  const res = parseVoiceCommand(phrase);
  if (expected === 'PLAY_INTRO') {
    assert(res.success && res.action.type === 'PLAY_INTRO', `Navigation: ${phrase}`);
  } else {
    assert(res.success && res.action.type === 'NAVIGATE' && res.action.tab === expected, `Navigation: ${phrase} -> ${expected}`);
  }
}

// 4. Natural Language Variations & Conversational Phrasing
const convTests = [
  ['Can you show me the axial view?', 'SET_LAYOUT', 'axial'],
  ['Let us look at the other MRI scan.', 'CYCLE_MODALITY', null],
  ['Move a little further down.', 'STEP_SLICE', -5],
  ['Show me the tumor.', 'SET_SEGMENTATION', true],
  ['Hide those colored regions.', 'SET_SEGMENTATION', false],
  ['Take me back to the overview.', 'NAVIGATE', 'overview'],
  ['Open the menu.', 'TOGGLE_MENU', true],
  ['Close this panel.', 'CLOSE_HELP_MODAL', null],
  ['Switch to the previous patient.', 'SELECT_CASE', 'prev'],
  ['Reload the website.', 'RELOAD_WEBSITE', null],
];
for (const [phrase, expectedType, expectedVal] of convTests) {
  const res = parseVoiceCommand(phrase);
  assert(res.success && res.action.type === expectedType, `Conversational: ${phrase} -> ${expectedType}`);
}

// 5. Direct Axis Commands (Z -> Axial, Y -> Coronal, X -> Sagittal)
const axisTests = [
  ['Show the Z-axis.', 'SET_LAYOUT', 'axial'],
  ['Switch to axial.', 'SET_LAYOUT', 'axial'],
  ['Open the Y-axis view.', 'SET_LAYOUT', 'coronal'],
  ['Show the X-axis.', 'SET_LAYOUT', 'sagittal'],
  ['Switch to sagittal.', 'SET_LAYOUT', 'sagittal'],
  ['Move along the Z-axis.', 'SET_LAYOUT', 'axial'],
  ['Set the X-axis coordinate to 50.', 'SET_AXIS_COORDINATE', 50],
  ['Set the Y-axis coordinate to 70.', 'SET_AXIS_COORDINATE', 70],
  ['Set the Z-axis coordinate to 50.', 'SET_AXIS_COORDINATE', 50],
];
for (const [phrase, expectedType, expectedVal] of axisTests) {
  const res = parseVoiceCommand(phrase);
  assert(res.success && res.action.type === expectedType, `Axis: ${phrase} -> ${expectedType}`);
}

// 6. Case Selection Commands
const caseTests = [
  ['Show the next case.', 'SELECT_CASE', 'next'],
  ['Open the previous patient.', 'SELECT_CASE', 'prev'],
  ['Select case BraTS 2021 0101817.', 'SELECT_CASE', '0101817'],
  ['Open patient 0101817.', 'SELECT_CASE', '0101817'],
  ['Search for case 0101817.', 'SELECT_CASE', '0101817'],
  ['Load the next available case.', 'SELECT_CASE', 'next'],
  ['Return to the current case.', 'SELECT_CASE', 'current'],
];
for (const [phrase, expectedType, expectedVal] of caseTests) {
  const res = parseVoiceCommand(phrase);
  assert(res.success && res.action.type === expectedType, `Case: ${phrase}`);
  if (expectedVal === 'next' || expectedVal === 'prev' || expectedVal === 'current') {
    assert(res.action.direction === expectedVal, `Case direction: ${expectedVal}`);
  } else if (expectedVal) {
    assert(res.action.query === expectedVal, `Case query: ${expectedVal}`);
  }
}

// 7. Menu, Panel, History, and Sidebar Controls
const menuTests = [
  ['Open the menu.', 'TOGGLE_MENU', true],
  ['Close the menu.', 'TOGGLE_MENU', false],
  ['Expand the sidebar.', 'TOGGLE_SIDEBAR', false],
  ['Collapse the sidebar.', 'TOGGLE_SIDEBAR', true],
  ['Open the settings.', 'OPEN_SETTINGS', null],
  ['Close the settings.', 'CLOSE_SETTINGS', null],
  ['Show the command panel.', 'OPEN_HELP_MODAL', null],
  ['Hide the command panel.', 'CLOSE_HELP_MODAL', null],
  ['Enter full screen.', 'FULLSCREEN', true],
  ['Exit full screen.', 'FULLSCREEN', false],
  ['Go back.', 'NAVIGATE_HISTORY', 'back'],
  ['Go forward.', 'NAVIGATE_HISTORY', 'forward'],
  ['Reload the website.', 'RELOAD_WEBSITE', null],
  ['Refresh this page.', 'RELOAD_WEBSITE', null],
];
for (const [phrase, expectedType] of menuTests) {
  const res = parseVoiceCommand(phrase);
  assert(res.success && res.action.type === expectedType, `Menu: ${phrase} -> ${expectedType}`);
}

// 8. Rotation: One-Shot vs Continuous vs Stop
const rotTests = [
  ['Rotate left once.', 'ROTATE_ONCE', 'left'],
  ['Rotate right once.', 'ROTATE_ONCE', 'right'],
  ['Rotate up once.', 'ROTATE_ONCE', 'up'],
  ['Rotate down once.', 'ROTATE_ONCE', 'down'],
  ['Start rotating left.', 'START_CONTINUOUS_ROTATION', 'left'],
  ['Rotate continuously to the right.', 'START_CONTINUOUS_ROTATION', 'right'],
  ['Stop rotating.', 'STOP_ROTATION', null],
  ['Stop movement.', 'STOP_ROTATION', null],
  ['Freeze the view.', 'STOP_ROTATION', null],
  ['Cancel rotation.', 'STOP_ROTATION', null],
];
for (const [phrase, expectedType, dir] of rotTests) {
  const res = parseVoiceCommand(phrase);
  assert(res.success && res.action.type === expectedType, `Rotation: ${phrase} -> ${expectedType}`);
  if (dir) {
    assert(res.action.direction === dir, `Rotation direction: ${dir}`);
  }
}

// 9. 3D Mesh, Layers and Volumetric Rendering Distinction
const meshTests = [
  ['Show layers.', 'SHOW_LAYERS_PANEL'],
  ['Hide the layers.', 'HIDE_LAYERS_PANEL'],
  ['Turn on the mesh.', 'TOGGLE_MESH'],
  ['Show the surface.', 'TOGGLE_MESH'],
  ['Hide the 3D model.', 'TOGGLE_MESH'],
  ['Show the volumetric rendering.', 'UNSUPPORTED_FEATURE'],
  ['Switch to volumetric mode.', 'UNSUPPORTED_FEATURE'],
  ['Go back to mesh mode.', 'SET_RENDER_MODE'],
];
for (const [phrase, expectedType] of meshTests) {
  const res = parseVoiceCommand(phrase);
  assert(res.success && res.action.type === expectedType, `Mesh/Render: ${phrase} -> ${expectedType}`);
}

// 10. Ambiguity Handling
const amb1 = parseVoiceCommand('move it');
assert(amb1.isAmbiguous && !amb1.success, 'Ambiguity detection for "move it"');
const amb2 = parseVoiceCommand('change it');
assert(amb2.isAmbiguous && !amb2.success, 'Ambiguity detection for "change it"');

console.log('----------------------------------------------------');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('✅ ALL TESTS PASSED WITH 0 FAILURES!');
}
