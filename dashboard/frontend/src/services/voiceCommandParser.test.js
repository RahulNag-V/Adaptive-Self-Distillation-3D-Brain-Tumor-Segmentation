/**
 * Comprehensive Automated Verification Suite for Intelligent Voice Control
 * Covers full website navigation, negation, stop words, website-wide scrolling,
 * 3D Workspace, multi-coordinates, camera controls, case selection, safety confirmation,
 * and the Voice Control Manual.
 */

import {
  parseVoiceCommand,
  extractCoordinates,
  extractCaseIdentifier,
  wordsToNumber,
  normalizeTranscript,
  stripFillers,
} from './voiceCommandParser.js';
import { ROUTE_MAP, SCROLL_CONFIG, COMMAND_REGISTRY } from './commandRegistry.js';
import { scrollController } from './scrollController.js';

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

console.log('--- STARTING COMPREHENSIVE VOICE CONTROL AUTOMATED VERIFICATION ---');

// 1. Spoken Word & Digit Normalization
assert(wordsToNumber('50') === 50, 'wordsToNumber direct digits');
assert(wordsToNumber('seventy') === 70, 'wordsToNumber seventy');
assert(wordsToNumber('one hundred fifty') === 150, 'wordsToNumber one hundred fifty');
assert(wordsToNumber('forty two') === 42, 'wordsToNumber forty two');
assert(wordsToNumber('zero') === 0, 'wordsToNumber zero');

// Case ID Extraction
assert(extractCaseIdentifier('BraTS 2021 0 1 0 1 8 1 7') === '0101817', 'extractCaseIdentifier spaced digits');
assert(extractCaseIdentifier('open patient 01017') === '01017', 'extractCaseIdentifier direct patient digits');
assert(extractCaseIdentifier('select case 01018') === '01018', 'extractCaseIdentifier case digits');
assert(extractCaseIdentifier('patient zero one zero one seven') === '01017', 'extractCaseIdentifier spoken digits');

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

// 3. Negation & Stop Words Checked First (Critical Rules)
const negationTests = [
  "Don't open reports",
  "Do not switch to 3D",
  "Please don't navigate to analytics",
  "Never open the settings",
];
for (const phrase of negationTests) {
  const res = parseVoiceCommand(phrase);
  assert(res.success && res.action.type === 'NO_ACTION', `Negation handled: "${phrase}"`);
}

const stopTests = [
  ['stop', 'STOP_ALL_MOTION'],
  ['stop scrolling', 'STOP_ALL_MOTION'],
  ['stop rotating', 'STOP_ALL_MOTION'],
  ['freeze view', 'STOP_ALL_MOTION'],
  ['pause', 'STOP_ALL_MOTION'],
  ['enough', 'STOP_ALL_MOTION'],
  ['cancel', 'STOP_ALL_MOTION'],
];
for (const [phrase, expectedType] of stopTests) {
  const res = parseVoiceCommand(phrase);
  assert(res.success && res.action.type === expectedType, `Stop phrase: "${phrase}" -> ${expectedType}`);
}

// 4. Full Website Navigation across All 11 Verified Routes
const allRouteTests = [
  ['Open overview', 'overview'],
  ['Take me to the dashboard', 'overview'],
  ['Go to home page', 'overview'],
  ['Open 3D workspace', 'viewer'],
  ['Go to 3D viewer', 'viewer'],
  ['Show brain scan', 'viewer'],
  ['Open AI segmentation', 'upload'],
  ['New scan analysis', 'upload'],
  ['I want to upload a scan', 'upload'],
  ['Open model lab', 'models'],
  ['Show model benchmarks', 'models'],
  ['Open analytics', 'analytics'],
  ['Show training dynamics', 'analytics'],
  ['Open adaptive learning', 'adaptive'],
  ['Show adaptive dashboard', 'adaptive'],
  ['Open 2D pathology', 'classify'],
  ['Go to classification', 'classify'],
  ['Open reports', 'reports'],
  ['Show patient report', 'reports'],
  ['Open settings', 'settings'],
  ['Go to preferences', 'settings'],
  ['Open about and viva', 'about'],
  ['Show viva defense guide', 'about'],
  ['Show my results', 'results'],
  ['Open quantitative results', 'results'],
];
for (const [phrase, expectedTab] of allRouteTests) {
  const res = parseVoiceCommand(phrase);
  assert(res.success && res.action.type === 'NAVIGATE' && res.action.tab === expectedTab, `Route Navigation: "${phrase}" -> ${expectedTab}`);
}

// 5. Website-Wide Scrolling Commands
const scrollTests = [
  ['Scroll down', 'SCROLL_STEP', 'down', SCROLL_CONFIG.normalStep],
  ['Scroll up', 'SCROLL_STEP', 'up', SCROLL_CONFIG.normalStep],
  ['Page down', 'SCROLL_STEP', 'down', SCROLL_CONFIG.normalStep],
  ['Page up', 'SCROLL_STEP', 'up', SCROLL_CONFIG.normalStep],
  ['Scroll down a little', 'SCROLL_STEP', 'down', SCROLL_CONFIG.smallStep],
  ['Scroll up slightly', 'SCROLL_STEP', 'up', SCROLL_CONFIG.smallStep],
  ['Scroll down a lot', 'SCROLL_STEP', 'down', SCROLL_CONFIG.largeStep],
  ['Scroll up a lot', 'SCROLL_STEP', 'up', SCROLL_CONFIG.largeStep],
  ['Scroll one screen down', 'SCROLL_STEP', 'down', null, true],
  ['Scroll screen up', 'SCROLL_STEP', 'up', null, true],
  ['Scroll to top', 'SCROLL_CARDINAL', 'top'],
  ['Scroll to bottom', 'SCROLL_CARDINAL', 'bottom'],
  ['Keep scrolling down', 'START_CONTINUOUS_SCROLL', 'down', SCROLL_CONFIG.continuousSpeed],
  ['Continue scrolling up', 'START_CONTINUOUS_SCROLL', 'up', SCROLL_CONFIG.continuousSpeed],
  ['Scroll faster', 'START_CONTINUOUS_SCROLL', null, SCROLL_CONFIG.fastSpeed],
  ['Scroll 300 pixels down', 'SCROLL_STEP', 'down', 300],
  ['Scroll up by 250 px', 'SCROLL_STEP', 'up', 250],
];
for (const [phrase, expectedType, expectedDir, expectedAmount, isScreen] of scrollTests) {
  const res = parseVoiceCommand(phrase);
  assert(res.success && res.action.type === expectedType, `Scroll intent: "${phrase}" -> ${expectedType}`);
  if (expectedType === 'SCROLL_STEP') {
    if (expectedDir) assert(res.action.direction === expectedDir, `Scroll direction for "${phrase}"`);
    if (expectedAmount) assert(res.action.amount === expectedAmount, `Scroll amount for "${phrase}"`);
    if (isScreen) assert(res.action.isScreen === true, `Scroll isScreen for "${phrase}"`);
  } else if (expectedType === 'SCROLL_CARDINAL') {
    assert(res.action.position === expectedDir, `Cardinal position for "${phrase}"`);
  } else if (expectedType === 'START_CONTINUOUS_SCROLL') {
    if (expectedDir) assert(res.action.direction === expectedDir, `Continuous dir for "${phrase}"`);
    if (expectedAmount) assert(res.action.speed === expectedAmount, `Continuous speed for "${phrase}"`);
  }
}

// 6. Voice Control Manual Commands
assert(parseVoiceCommand('Open manual').action.type === 'OPEN_MANUAL', 'Open manual phrase');
assert(parseVoiceCommand('Show voice help').action.type === 'OPEN_MANUAL', 'Show voice help phrase');
assert(parseVoiceCommand('Voice commands guide').action.type === 'OPEN_MANUAL', 'Voice commands guide phrase');
assert(parseVoiceCommand('Close manual').action.type === 'CLOSE_MANUAL', 'Close manual phrase');

// 7. 3D Workspace Views & Modalities
assert(parseVoiceCommand('Switch to axial view').action.value === 'axial', 'Switch to axial');
assert(parseVoiceCommand('Show coronal plane').action.value === 'coronal', 'Show coronal');
assert(parseVoiceCommand('Switch to sagittal').action.value === 'sagittal', 'Switch to sagittal');
assert(parseVoiceCommand('Quad view').action.value === 'quad', 'Quad view');
assert(parseVoiceCommand('Show FLAIR').action.value === 'flair', 'Modality FLAIR');
assert(parseVoiceCommand('Switch to T1ce').action.value === 't1ce', 'Modality T1ce');
assert(parseVoiceCommand('Show T1 contrast').action.value === 't1ce', 'Modality T1 contrast alias');
assert(parseVoiceCommand('Show T2').action.value === 't2', 'Modality T2');
assert(parseVoiceCommand('Cycle modality').action.type === 'CYCLE_MODALITY', 'Cycle modality');

// 8. 3D Camera Rotation (One-shot vs Continuous)
assert(parseVoiceCommand('Rotate left once').action.type === 'ROTATE_ONCE' && parseVoiceCommand('Rotate left once').action.degrees === 15, 'Rotate left once (15°)');
assert(parseVoiceCommand('Rotate 90 degrees right').action.type === 'ROTATE_ONCE' && parseVoiceCommand('Rotate 90 degrees right').action.degrees === 90, 'Rotate 90 degrees right');
assert(parseVoiceCommand('Rotate 180 degrees').action.type === 'ROTATE_ONCE' && parseVoiceCommand('Rotate 180 degrees').action.degrees === 180, 'Rotate 180 degrees');
assert(parseVoiceCommand('Start rotating left').action.type === 'START_CONTINUOUS_ROTATION', 'Start continuous rotation left');
assert(parseVoiceCommand('Reset camera').action.type === 'RESET_ROTATION', 'Reset camera');

// 9. Case Selection
assert(parseVoiceCommand('Show next case').action.direction === 'next', 'Case next');
assert(parseVoiceCommand('Open previous patient').action.direction === 'prev', 'Case prev');
assert(parseVoiceCommand('Select case BraTS 2021 01017').action.query === '01017', 'Case exact ID 01017');

// 10. Safety Confirmation Commands
const trainReq = parseVoiceCommand('Start training');
assert(trainReq.success && trainReq.action.type === 'REQUEST_CONFIRMATION' && trainReq.action.pendingType === 'START_TRAINING', 'Start training requires confirmation');

const promoteReq = parseVoiceCommand('Promote candidate');
assert(promoteReq.success && promoteReq.action.type === 'REQUEST_CONFIRMATION' && promoteReq.action.pendingType === 'PROMOTE_CANDIDATE', 'Promote candidate requires confirmation');

const rollbackReq = parseVoiceCommand('Rollback model');
assert(rollbackReq.success && rollbackReq.action.type === 'REQUEST_CONFIRMATION' && rollbackReq.action.pendingType === 'ROLLBACK_MODEL', 'Rollback requires confirmation');

// Test Confirming when confirmation is pending:
const confirmedRes = parseVoiceCommand('Confirm', { pendingConfirmation: { type: 'START_TRAINING' } });
assert(confirmedRes.success && confirmedRes.action.type === 'CONFIRM_PENDING_ACTION', 'Spoken confirmation accepted');

const cancelRes = parseVoiceCommand('Cancel', { pendingConfirmation: { type: 'START_TRAINING' } });
assert(cancelRes.success && cancelRes.action.type === 'CANCEL_PENDING_ACTION', 'Spoken cancellation accepted');

// 11. Ambiguity Detection
const amb1 = parseVoiceCommand('move it');
assert(amb1.isAmbiguous && !amb1.success, 'Ambiguity detection for "move it"');
const amb2 = parseVoiceCommand('change it');
assert(amb2.isAmbiguous && !amb2.success, 'Ambiguity detection for "change it"');

// 12. Scroll Controller Unit Checks
assert(typeof scrollController.scrollStep === 'function', 'scrollController.scrollStep exists');
assert(typeof scrollController.startContinuousScroll === 'function', 'scrollController.startContinuousScroll exists');
assert(typeof scrollController.stopContinuousScroll === 'function', 'scrollController.stopContinuousScroll exists');
scrollController.startContinuousScroll({ direction: 'down', speed: 300 });
assert(scrollController.isContinuousActive === true, 'scrollController continuous active');
scrollController.stopContinuousScroll();
assert(scrollController.isContinuousActive === false, 'scrollController stopped');

console.log('----------------------------------------------------');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('✅ ALL TESTS PASSED WITH 0 FAILURES!');
}
