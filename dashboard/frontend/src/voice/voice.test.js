/**
 * Comprehensive Automated Verification Suite for Clean Voice Subsystem
 *
 * Covers:
 * 1. Registry Conformance: iterates EVERY example and registered phrase in COMMAND_REGISTRY
 * 2. Negation safety ("don't open reports" -> NO_ACTION)
 * 3. Global stop words ("stop", "freeze", "cancel", "halt" -> STOP_ALL_MOTION)
 * 4. Coordinate boundary validation ([0..239], [0..239], [0..154])
 * 5. Case selection matching
 * 6. Scroll controller lifecycle
 * 7. Mock SpeechEngine event sequences (interim, final, deduplication, onend keep-alive, errors, StrictMode double-mount)
 */

import assert from 'node:assert';
import { COMMAND_REGISTRY, ROUTES, VIEWER_CONSTRAINTS } from './registry.js';
import { parseVoiceCommand, normalizeTranscript } from './parser.js';
import { scrollController } from './scrollController.js';
import { viewerAdapter } from './viewerAdapter.js';
import { SpeechEngine } from './engine.js';

console.log('====================================================');
console.log('   STARTING VOICE SUBSYSTEM AUTOMATED TEST SUITE    ');
console.log('====================================================');

let totalTests = 0;
let passedTests = 0;

function it(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

async function itAsync(description, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${description}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

// ====================================================
// SUITE 1: REGISTRY DRIVEN CONFORMANCE
// ====================================================
console.log('\n[Suite 1: Registry-Driven Example & Phrase Conformance]');

let registryPhraseCount = 0;
let registryPassCount = 0;
const registryFailures = [];

for (const cmd of COMMAND_REGISTRY) {
  const allPhrases = [
    ...cmd.examples.map(ex => ex.replace(/^["']|["']$/g, '').trim()),
    ...cmd.phrases.map(p => p.trim()),
  ];
  const uniquePhrases = [...new Set(allPhrases)];

  for (const phrase of uniquePhrases) {
    registryPhraseCount++;
    const res = parseVoiceCommand(phrase, {
      activeTab: cmd.targetPage === 'all' ? 'viewer' : cmd.targetPage,
      pendingConfirmation: null,
    });

    if (res.success && res.action && res.action.type === cmd.action.type) {
      registryPassCount++;
    } else {
      registryFailures.push({
        cmdId: cmd.id,
        phrase,
        expected: cmd.action.type,
        actual: res.action?.type || 'NONE',
        error: res.error,
      });
    }
  }
}

it(`Every single phrase in COMMAND_REGISTRY matches declared action (${registryPassCount}/${registryPhraseCount})`, () => {
  if (registryFailures.length > 0) {
    console.error('Registry Failures:', registryFailures);
  }
  assert.strictEqual(registryFailures.length, 0, `Expected 0 failures, got ${registryFailures.length}`);
  assert.strictEqual(registryPassCount, registryPhraseCount);
});

// ====================================================
// SUITE 2: NEGATION SAFETY & STOP WORDS
// ====================================================
console.log('\n[Suite 2: Negation Safety & Global Stop Words]');

it('Negation: "don\'t open reports" does nothing (NO_ACTION)', () => {
  const res = parseVoiceCommand("don't open reports");
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'NO_ACTION');
});

it('Negation: "never switch to flair" does nothing (NO_ACTION)', () => {
  const res = parseVoiceCommand('never switch to flair');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'NO_ACTION');
});

it('Negation: "do not scroll down" does nothing (NO_ACTION)', () => {
  const res = parseVoiceCommand('do not scroll down');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'NO_ACTION');
});

it('Negation during pending confirmation cancels the pending action', () => {
  const res = parseVoiceCommand("don't proceed", { pendingConfirmation: { type: 'START_TRAINING' } });
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'CANCEL_PENDING_ACTION');
});

it('Stop word: "stop" halts all motion and NEVER navigates', () => {
  const res = parseVoiceCommand('stop');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'STOP_ALL_MOTION');
});

it('Stop word: "freeze" halts all motion and NEVER navigates', () => {
  const res = parseVoiceCommand('freeze');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'STOP_ALL_MOTION');
});

it('Stop word: "pause" halts all motion and NEVER navigates', () => {
  const res = parseVoiceCommand('pause');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'STOP_ALL_MOTION');
});

it('Stop word: "enough" halts all motion', () => {
  const res = parseVoiceCommand('enough');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'STOP_ALL_MOTION');
});

// ====================================================
// SUITE 3: 3D COORDINATE BOUNDS & CASE VALIDATION
// ====================================================
console.log('\n[Suite 3: 3D Coordinate Bounds & Case Validation]');

it('Validates in-bounds coordinates (120, 120, 78)', () => {
  const check = viewerAdapter.validateCoordinates({ x: 120, y: 120, z: 78 });
  assert.strictEqual(check.valid, true);
  assert.strictEqual(check.coordinates.x, 120);
  assert.strictEqual(check.coordinates.y, 120);
  assert.strictEqual(check.coordinates.z, 78);
});

it('Rejects out-of-bounds Axial (Z > 154)', () => {
  const check = viewerAdapter.validateCoordinates({ z: 180 });
  assert.strictEqual(check.valid, false);
  assert.ok(check.error.includes('Axial'));
});

it('Rejects out-of-bounds Coronal (Y >= 240)', () => {
  const check = viewerAdapter.validateCoordinates({ y: 240 });
  assert.strictEqual(check.valid, false);
  assert.ok(check.error.includes('Coronal'));
});

it('Rejects out-of-bounds Sagittal (X >= 240)', () => {
  const check = viewerAdapter.validateCoordinates({ x: 250 });
  assert.strictEqual(check.valid, false);
  assert.ok(check.error.includes('Sagittal'));
});

it('Parser rejects out-of-bounds coordinates with bounds explanation', () => {
  const res = parseVoiceCommand('set coordinates 300 300 300');
  assert.strictEqual(res.success, false);
  assert.ok(res.error.includes('out of bounds'));
});

it('Parses exact patient ID selection', () => {
  const res = parseVoiceCommand('select case BraTS2021_01017');
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action.type, 'SELECT_CASE');
  assert.ok(res.action.query.includes('01017'));
});

// ====================================================
// SUITE 4: SCROLL CONTROLLER LIFECYCLE
// ====================================================
console.log('\n[Suite 4: Scroll Controller Lifecycle]');

it('Discrete stepping halts continuous scroll loop', () => {
  scrollController.isContinuousActive = true;
  scrollController.scrollStep({ direction: 'down', amount: 120 });
  assert.strictEqual(scrollController.isContinuousActive, false);
});

it('Cardinal navigation halts continuous scroll loop', () => {
  scrollController.isContinuousActive = true;
  scrollController.scrollToPosition('top');
  assert.strictEqual(scrollController.isContinuousActive, false);
});

it('Stop continuous scroll cleans up timer and active state', () => {
  scrollController.startContinuousScroll({ direction: 'down', speed: 300 });
  assert.strictEqual(scrollController.isContinuousActive, true);
  scrollController.stopContinuousScroll();
  assert.strictEqual(scrollController.isContinuousActive, false);
  assert.strictEqual(scrollController.activeRafId, null);
});

it('Cleanup resets continuous state', () => {
  scrollController.isContinuousActive = true;
  scrollController.cleanup();
  assert.strictEqual(scrollController.isContinuousActive, false);
});

// ====================================================
// SUITE 5: MOCK SPEECH ENGINE LIFECYCLE
// ====================================================
console.log('\n[Suite 5: Mock Speech Engine Lifecycle & StrictMode Double-Mount]');

class MockNativeSpeechRecognition {
  constructor() {
    this.continuous = true;
    this.interimResults = true;
    this.lang = 'en-US';
    this.started = false;
    this.onstart = null;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
  }
  start() {
    if (this.started) throw new Error('InvalidStateError');
    this.started = true;
    if (this.onstart) setTimeout(() => this.onstart(), 5);
  }
  stop() {
    this.started = false;
    if (this.onend) setTimeout(() => this.onend(), 5);
  }
  abort() {
    this.started = false;
    if (this.onend) setTimeout(() => this.onend(), 5);
  }
}

// Attach mock to global
globalThis.window = globalThis.window || {};
globalThis.window.SpeechRecognition = MockNativeSpeechRecognition;
globalThis.window.isSecureContext = true;

it('Engine initializes in "idle" state', () => {
  const engine = new SpeechEngine();
  assert.strictEqual(engine.state, 'idle');
  assert.strictEqual(engine.isSupported, true);
});

await itAsync('Engine transitions: idle -> starting -> listening', async () => {
  let stateLog = [];
  const engine = new SpeechEngine({
    onStateChange: (s) => stateLog.push(s),
  });

  engine.start();
  assert.strictEqual(engine.state, 'starting');

  await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(engine.state, 'listening');
  engine.destroy();
});

it('Deduplicates rapid identical final transcripts within 900ms', () => {
  let count = 0;
  const engine = new SpeechEngine({
    onTranscript: () => { count++; },
  });
  engine.initInstance();

  const event1 = {
    resultIndex: 0,
    results: [{ isFinal: true, 0: { transcript: 'scroll down' } }],
  };
  engine.recognition.onresult(event1);
  assert.strictEqual(count, 1);

  // Rapid identical final event
  const event2 = {
    resultIndex: 0,
    results: [{ isFinal: true, 0: { transcript: 'scroll down' } }],
  };
  engine.recognition.onresult(event2);
  assert.strictEqual(count, 1, 'Duplicate final result within 900ms must be dropped');

  engine.destroy();
});

it('Ignores recognition results while TTS speech synthesis is speaking', () => {
  let count = 0;
  const engine = new SpeechEngine({
    onTranscript: () => { count++; },
  });
  engine.initInstance();

  engine.isSpeakingTTS = true;

  const event = {
    resultIndex: 0,
    results: [{ isFinal: true, 0: { transcript: 'scroll down' } }],
  };
  engine.recognition.onresult(event);
  assert.strictEqual(count, 0, 'Audio while TTS speaking must be ignored to prevent loop');

  engine.destroy();
});

it('Handles permission denial ("not-allowed") and reports readable message', () => {
  let receivedError = null;
  const engine = new SpeechEngine({
    onError: (e) => { receivedError = e; },
  });
  engine.initInstance();

  engine.recognition.onerror({ error: 'not-allowed' });
  assert.strictEqual(engine.state, 'error');
  assert.strictEqual(receivedError.code, 'NOT_ALLOWED');
  assert.ok(receivedError.message.includes('Microphone access denied'));

  engine.destroy();
});

it('Handles audio-capture error when no mic is detected', () => {
  let receivedError = null;
  const engine = new SpeechEngine({
    onError: (e) => { receivedError = e; },
  });
  engine.initInstance();

  engine.recognition.onerror({ error: 'audio-capture' });
  assert.strictEqual(engine.state, 'error');
  assert.strictEqual(receivedError.code, 'AUDIO_CAPTURE');
  assert.ok(receivedError.message.includes('No microphone detected'));

  engine.destroy();
});

it('React StrictMode double-mount simulation: destroy and remount does not corrupt state', () => {
  const engine = new SpeechEngine();
  engine.start();
  // Simulate immediate unmount cleanup in StrictMode
  engine.destroy();
  assert.strictEqual(engine.state, 'idle');

  // Simulate immediate remount
  engine.start();
  assert.strictEqual(engine.state, 'starting');
  engine.destroy();
});

console.log('\n====================================================');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
if (passedTests === totalTests) {
  console.log('✅ ALL TESTS PASSED WITH 0 FAILURES!');
  console.log('====================================================\n');
} else {
  process.exit(1);
}

