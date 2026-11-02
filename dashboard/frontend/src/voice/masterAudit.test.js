/**
 * Master Test Suite for NeuroVision AI Voice Assistant
 * Tests Section 23 (Lifecycle), Section 24 (Patient Search & missing patient 28),
 * Section 25 (Brain Appearance Presets 1-4), Section 7 (Slice clamping feedback),
 * Section 5 (Fullscreen maximize/restore), and Section 10 (Sidebar toggle).
 */

import assert from 'node:assert';
import { parseVoiceCommand, parseSpokenNumber } from './parser.js';
import { COMMAND_REGISTRY } from './registry.js';

console.log('====================================================');
console.log('  RUNNING MASTER PROMPT SPECIFICATION TEST SUITE    ');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(err);
    failCount++;
  }
}

// ---------------------------------------------------------------------
// TEST GROUP 1: Spoken Numbers & Word-to-Number Parsing
// ---------------------------------------------------------------------
console.log('[Test Group 1: Spoken Numbers & Word-to-Number Parsing]');

test('Parses zero', () => {
  assert.strictEqual(parseSpokenNumber('zero'), 0);
});

test('Parses direct integers', () => {
  assert.strictEqual(parseSpokenNumber('75'), 75);
  assert.strictEqual(parseSpokenNumber('120'), 120);
});

test('Parses spoken single and compound numbers', () => {
  assert.strictEqual(parseSpokenNumber('twenty eight'), 28);
  assert.strictEqual(parseSpokenNumber('twenty-eight'), 28);
  assert.strictEqual(parseSpokenNumber('seventy five'), 75);
  assert.strictEqual(parseSpokenNumber('one hundred twenty'), 120);
});

// ---------------------------------------------------------------------
// TEST GROUP 2: Section 23 - Lifecycle States & Status Queries
// ---------------------------------------------------------------------
console.log('\n[Test Group 2: Section 23 - Assistant Lifecycle & Queries]');

test('Handles status query: "Are you listening?"', () => {
  const res = parseVoiceCommand('Are you listening?');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'STATUS_QUERY');
  assert.strictEqual(res.action.query, 'is_listening');
});

test('Handles status query: "What is your current status?"', () => {
  const res = parseVoiceCommand('What is your current status?');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'STATUS_QUERY');
  assert.strictEqual(res.action.query, 'current_status');
});

test('Handles lifecycle activation: "Activate voice assistant"', () => {
  const res = parseVoiceCommand('Activate voice assistant');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'ASSISTANT_LIFECYCLE');
  assert.strictEqual(res.action.operation, 'start');
});

test('Handles lifecycle pause: "Pause voice assistance"', () => {
  const res = parseVoiceCommand('Pause voice assistance');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'ASSISTANT_LIFECYCLE');
  assert.strictEqual(res.action.operation, 'pause');
});

test('Handles lifecycle resume: "Resume voice assistance"', () => {
  const res = parseVoiceCommand('Resume voice assistance');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'ASSISTANT_LIFECYCLE');
  assert.strictEqual(res.action.operation, 'resume');
});

test('Handles lifecycle closure: "Close voice assistant"', () => {
  const res = parseVoiceCommand('Close voice assistant');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'ASSISTANT_LIFECYCLE');
  assert.strictEqual(res.action.operation, 'close');
});

// ---------------------------------------------------------------------
// TEST GROUP 3: Section 24 - Patient Search, Selection & Missing Case 28
// ---------------------------------------------------------------------
console.log('\n[Test Group 3: Section 24 - Patient Search & Missing Case 28]');

test('Parses patient query by number: "Open patient 28"', () => {
  const res = parseVoiceCommand('Open patient 28');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'SELECT_CASE');
  assert.strictEqual(res.action.query, '28');
});

test('Parses patient query by spoken words: "select patient twenty eight"', () => {
  const res = parseVoiceCommand('select patient twenty eight');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'SELECT_CASE');
  assert.strictEqual(res.action.query, '28');
});

test('Parses exact BraTS ID: "open case BraTS2021_01018"', () => {
  const res = parseVoiceCommand('open case BraTS2021_01018');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'SELECT_CASE');
  assert.ok(res.action.query.includes('01018'));
});

test('Handles patient list request: "what patients are available?"', () => {
  const res = parseVoiceCommand('what patients are available?');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'SELECT_CASE');
  assert.strictEqual(res.action.query, 'list');
});

// ---------------------------------------------------------------------
// TEST GROUP 4: Section 25 - Brain Appearance Presets 1 to 4
// ---------------------------------------------------------------------
console.log('\n[Test Group 4: Section 25 - Brain Appearance Presets 1 to 4]');

test('Option 1: Anatomical Regions', () => {
  const r1 = parseVoiceCommand('anatomical regions');
  const r2 = parseVoiceCommand('option 1');
  assert.strictEqual(r1.action.type, 'SET_BRAIN_APPEARANCE');
  assert.strictEqual(r1.action.mode, 'regions');
  assert.strictEqual(r2.action.mode, 'regions');
});

test('Option 2: Natural Anatomy', () => {
  const r1 = parseVoiceCommand('natural anatomy');
  const r2 = parseVoiceCommand('option 2');
  assert.strictEqual(r1.action.type, 'SET_BRAIN_APPEARANCE');
  assert.strictEqual(r1.action.mode, 'natural');
  assert.strictEqual(r2.action.mode, 'natural');
});

test('Option 3: Anatomical Contrast', () => {
  const r1 = parseVoiceCommand('anatomical contrast');
  const r2 = parseVoiceCommand('option 3');
  assert.strictEqual(r1.action.type, 'SET_BRAIN_APPEARANCE');
  assert.strictEqual(r1.action.mode, 'contrast');
  assert.strictEqual(r2.action.mode, 'contrast');
});

test('Option 4: Original Appearance', () => {
  const r1 = parseVoiceCommand('original appearance');
  const r2 = parseVoiceCommand('option 4');
  assert.strictEqual(r1.action.type, 'SET_BRAIN_APPEARANCE');
  assert.strictEqual(r1.action.mode, 'original');
  assert.strictEqual(r2.action.mode, 'original');
});

test('Cycles brain appearance next and previous', () => {
  const nextRes = parseVoiceCommand('next appearance');
  const prevRes = parseVoiceCommand('previous appearance');
  assert.strictEqual(nextRes.action.type, 'SET_BRAIN_APPEARANCE');
  assert.strictEqual(nextRes.action.mode, 'cycle');
  assert.strictEqual(nextRes.action.direction, 'next');
  assert.strictEqual(prevRes.action.type, 'SET_BRAIN_APPEARANCE');
  assert.strictEqual(prevRes.action.mode, 'cycle');
  assert.strictEqual(prevRes.action.direction, 'prev');
});

test('Prompts when appearance change query is ambiguous', () => {
  const res = parseVoiceCommand('change brain appearance');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'PROMPT_APPEARANCE_SELECTION');
  assert.ok(res.action.feedback.includes('1: Anatomical Regions'));
  assert.ok(res.action.feedback.includes('2: Natural Anatomy'));
  assert.ok(res.action.feedback.includes('3: Anatomical Contrast'));
  assert.ok(res.action.feedback.includes('4: Original Appearance'));
});

// ---------------------------------------------------------------------
// TEST GROUP 5: Section 7 - Numerical Slices with Boundary Clamping
// ---------------------------------------------------------------------
console.log('\n[Test Group 5: Section 7 - Numerical Slices & Clamping Feedback]');

test('In-bounds axial slice: "axial slice 75"', () => {
  const res = parseVoiceCommand('axial slice 75');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'SET_AXIS_COORDINATE');
  assert.strictEqual(res.action.axis, 'z');
  assert.strictEqual(res.action.value, 75);
  assert.strictEqual(res.action.feedback, 'Axial slice set to 75');
});

test('Clamps out-of-bounds axial slice: "axial slice 200" clamped to 154', () => {
  const res = parseVoiceCommand('axial slice 200');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'SET_AXIS_COORDINATE');
  assert.strictEqual(res.action.axis, 'z');
  assert.strictEqual(res.action.value, 154);
  assert.strictEqual(res.action.feedback, 'Axial slice clamped to maximum boundary of 154.');
});

test('In-bounds coronal slice: "coronal slice 120"', () => {
  const res = parseVoiceCommand('coronal slice 120');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'SET_AXIS_COORDINATE');
  assert.strictEqual(res.action.axis, 'y');
  assert.strictEqual(res.action.value, 120);
});

test('Clamps out-of-bounds coronal slice: "coronal slice 300" clamped to 239', () => {
  const res = parseVoiceCommand('coronal slice 300');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'SET_AXIS_COORDINATE');
  assert.strictEqual(res.action.axis, 'y');
  assert.strictEqual(res.action.value, 239);
  assert.strictEqual(res.action.feedback, 'Coronal slice clamped to maximum boundary of 239.');
});

test('Relative slice stepping: "step forward 5 slices"', () => {
  const res = parseVoiceCommand('step forward 5 slices');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'STEP_SLICE');
  assert.strictEqual(res.action.step, 5);
});

test('Relative slice stepping: "step back 3 slices"', () => {
  const res = parseVoiceCommand('step back 3 slices');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'STEP_SLICE');
  assert.strictEqual(res.action.step, -3);
});

// ---------------------------------------------------------------------
// TEST GROUP 6: Section 5 & 10 - Fullscreen & Sidebar Layout
// ---------------------------------------------------------------------
console.log('\n[Test Group 6: Section 5 & 10 - Fullscreen & Sidebar Layout]');

test('Maximize viewer layout: "maximize viewer"', () => {
  const res = parseVoiceCommand('maximize viewer');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'FULLSCREEN');
  assert.strictEqual(res.action.enabled, true);
});

test('Restore viewer layout: "minimize viewer"', () => {
  const res = parseVoiceCommand('minimize viewer');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'FULLSCREEN');
  assert.strictEqual(res.action.enabled, false);
});

test('Collapse sidebar: "collapse sidebar"', () => {
  const res = parseVoiceCommand('collapse sidebar');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'TOGGLE_SIDEBAR');
  assert.strictEqual(res.action.collapsed, true);
});

test('Expand sidebar: "expand sidebar"', () => {
  const res = parseVoiceCommand('expand sidebar');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'TOGGLE_SIDEBAR');
  assert.strictEqual(res.action.collapsed, false);
});

console.log('====================================================');
console.log(`TOTAL MASTER TESTS: ${passCount + failCount} | PASSED: ${passCount} | FAILED: ${failCount}`);
if (failCount === 0) {
  console.log('✅ ALL MASTER PROMPT SPECIFICATION TESTS PASSED!');
}
console.log('====================================================\n');

process.exit(failCount === 0 ? 0 : 1);
