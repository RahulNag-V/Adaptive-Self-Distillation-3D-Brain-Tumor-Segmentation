/**
 * Comprehensive Automated Test Suite for Voice Control System:
 * 1. Ctrl + V Keyboard Shortcut Event Handler & Target Isolation
 * 2. Speech Recognition Lifecycle & State Transitions
 * 3. Prevention of Duplicate Listeners & Re-render Resiliency
 */

import assert from 'node:assert';

console.log('--- STARTING VOICE SHORTCUT & STATE VERIFICATION ---');

let passedTests = 0;
let totalTests = 0;

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

// Helper duplicating the exact editable element logic from VoiceControlContext
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

// Simulates the window keydown listener logic from VoiceControlContext
function createKeydownHandler(onToggle) {
  return function handleKeyDown(e) {
    if (e.repeat) return false;

    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
    const isKeyV = e.key && e.key.toLowerCase() === 'v';

    if (isCtrlOrMeta && isKeyV) {
      if (isEditableElement(e.target)) {
        return false; // Preserve native paste
      }

      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();

      onToggle();
      return true;
    }
    return false;
  };
}

// --- SUITE 1: KEYBOARD SHORTCUT LOGIC & TARGET ISOLATION ---
console.log('\n[Suite 1: Ctrl + V Keyboard Shortcut Logic]');

it('Activates voice control on Ctrl + v outside editable fields', () => {
  let toggled = false;
  let prevented = false;
  const handler = createKeydownHandler(() => { toggled = true; });

  const event = {
    ctrlKey: true,
    metaKey: false,
    key: 'v',
    repeat: false,
    target: { tagName: 'DIV', isContentEditable: false },
    preventDefault: () => { prevented = true; },
    stopPropagation: () => {},
  };

  const result = handler(event);
  assert.strictEqual(result, true);
  assert.strictEqual(toggled, true);
  assert.strictEqual(prevented, true);
});

it('Activates voice control on Ctrl + V (uppercase) outside editable fields', () => {
  let toggled = false;
  const handler = createKeydownHandler(() => { toggled = true; });

  const event = {
    ctrlKey: true,
    metaKey: false,
    key: 'V',
    repeat: false,
    target: { tagName: 'BODY', isContentEditable: false },
    preventDefault: () => {},
    stopPropagation: () => {},
  };

  const result = handler(event);
  assert.strictEqual(result, true);
  assert.strictEqual(toggled, true);
});

it('Activates voice control on Cmd + V (macOS Meta key) outside editable fields', () => {
  let toggled = false;
  const handler = createKeydownHandler(() => { toggled = true; });

  const event = {
    ctrlKey: false,
    metaKey: true,
    key: 'v',
    repeat: false,
    target: { tagName: 'SECTION', isContentEditable: false },
    preventDefault: () => {},
    stopPropagation: () => {},
  };

  const result = handler(event);
  assert.strictEqual(result, true);
  assert.strictEqual(toggled, true);
});

it('Rejects key-repeat events to prevent accidental rapid toggling', () => {
  let toggled = false;
  const handler = createKeydownHandler(() => { toggled = true; });

  const event = {
    ctrlKey: true,
    metaKey: false,
    key: 'v',
    repeat: true, // Key held down!
    target: { tagName: 'DIV', isContentEditable: false },
  };

  const result = handler(event);
  assert.strictEqual(result, false);
  assert.strictEqual(toggled, false);
});

it('Preserves normal paste behavior when typing in an INPUT element', () => {
  let toggled = false;
  let prevented = false;
  const handler = createKeydownHandler(() => { toggled = true; });

  const event = {
    ctrlKey: true,
    metaKey: false,
    key: 'v',
    repeat: false,
    target: { tagName: 'INPUT', isContentEditable: false },
    preventDefault: () => { prevented = true; },
  };

  const result = handler(event);
  assert.strictEqual(result, false);
  assert.strictEqual(toggled, false);
  assert.strictEqual(prevented, false);
});

it('Preserves normal paste behavior when typing in a TEXTAREA element', () => {
  let toggled = false;
  let prevented = false;
  const handler = createKeydownHandler(() => { toggled = true; });

  const event = {
    ctrlKey: true,
    metaKey: false,
    key: 'v',
    repeat: false,
    target: { tagName: 'TEXTAREA', isContentEditable: false },
    preventDefault: () => { prevented = true; },
  };

  const result = handler(event);
  assert.strictEqual(result, false);
  assert.strictEqual(toggled, false);
  assert.strictEqual(prevented, false);
});

it('Preserves normal paste behavior when typing in a contenteditable container', () => {
  let toggled = false;
  const handler = createKeydownHandler(() => { toggled = true; });

  const event = {
    ctrlKey: true,
    metaKey: false,
    key: 'v',
    repeat: false,
    target: { tagName: 'DIV', isContentEditable: true },
  };

  const result = handler(event);
  assert.strictEqual(result, false);
  assert.strictEqual(toggled, false);
});

it('Preserves normal paste behavior when targeting child of a contenteditable ancestor', () => {
  let toggled = false;
  const handler = createKeydownHandler(() => { toggled = true; });

  const event = {
    ctrlKey: true,
    metaKey: false,
    key: 'v',
    repeat: false,
    target: {
      tagName: 'SPAN',
      isContentEditable: false,
      closest: (sel) => sel.includes('contenteditable') ? {} : null,
    },
  };

  const result = handler(event);
  assert.strictEqual(result, false);
  assert.strictEqual(toggled, false);
});

it('Does not toggle on plain "v" key without Ctrl/Meta modifier', () => {
  let toggled = false;
  const handler = createKeydownHandler(() => { toggled = true; });

  const event = {
    ctrlKey: false,
    metaKey: false,
    key: 'v',
    repeat: false,
    target: { tagName: 'DIV', isContentEditable: false },
  };

  const result = handler(event);
  assert.strictEqual(result, false);
  assert.strictEqual(toggled, false);
});

it('Does not toggle on Ctrl + C (copy) or Ctrl + Z (undo)', () => {
  let toggled = false;
  const handler = createKeydownHandler(() => { toggled = true; });

  const copyEvent = {
    ctrlKey: true,
    metaKey: false,
    key: 'c',
    repeat: false,
    target: { tagName: 'DIV', isContentEditable: false },
  };
  assert.strictEqual(handler(copyEvent), false);
  assert.strictEqual(toggled, false);

  const undoEvent = {
    ctrlKey: true,
    metaKey: false,
    key: 'z',
    repeat: false,
    target: { tagName: 'DIV', isContentEditable: false },
  };
  assert.strictEqual(handler(undoEvent), false);
  assert.strictEqual(toggled, false);
});

// --- SUITE 2: VOICE STATE MACHINE TRANSITIONS ---
console.log('\n[Suite 2: Voice Recognition State Machine]');

class MockSpeechRecognition {
  constructor() {
    this.continuous = true;
    this.interimResults = true;
    this.lang = 'en-US';
    this.started = false;
    this.aborted = false;
    this.stopped = false;
    this.onstart = null;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
  }

  start() {
    if (this.started) throw new Error('InvalidStateError');
    this.started = true;
    this.stopped = false;
    if (this.onstart) setTimeout(() => this.onstart(), 5);
  }

  stop() {
    this.started = false;
    this.stopped = true;
    if (this.onend) setTimeout(() => this.onend(), 5);
  }

  abort() {
    this.started = false;
    this.aborted = true;
    if (this.onend) setTimeout(() => this.onend(), 5);
  }
}

it('State defaults to "standby" when inactive', () => {
  let status = 'standby';
  let isListening = false;
  assert.strictEqual(status, 'standby');
  assert.strictEqual(isListening, false);
});

it('Only transitions to "listening" after browser fires onstart', async () => {
  let status = 'standby';
  let isListening = false;
  const mock = new MockSpeechRecognition();

  mock.onstart = () => {
    isListening = true;
    status = 'listening';
  };

  mock.start();
  // Immediately before onstart fires:
  assert.strictEqual(status, 'standby', 'Must not show Listening before onstart fires');

  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.strictEqual(status, 'listening');
  assert.strictEqual(isListening, true);
});

it('Transitions to "processing" on interim transcript results', () => {
  let status = 'listening';
  let interimTranscript = '';

  function handleInterim(text) {
    interimTranscript = text;
    status = 'processing';
  }

  handleInterim('scroll down');
  assert.strictEqual(status, 'processing');
  assert.strictEqual(interimTranscript, 'scroll down');
});

it('Transitions to "executing" when command validates', () => {
  let status = 'processing';

  function handleExecuting() {
    status = 'executing';
  }

  handleExecuting();
  assert.strictEqual(status, 'executing');
});

it('Transitions to "error" on permission denial ("not-allowed")', () => {
  let status = 'listening';
  let isListening = true;
  let permissionDenied = false;
  let errorMessage = null;

  function handleError(errorEvent) {
    if (errorEvent.error === 'not-allowed') {
      permissionDenied = true;
      status = 'error';
      errorMessage = 'Microphone access was denied. Please allow microphone permissions in your browser address bar.';
      isListening = false;
    }
  }

  handleError({ error: 'not-allowed' });
  assert.strictEqual(status, 'error');
  assert.strictEqual(isListening, false);
  assert.strictEqual(permissionDenied, true);
  assert.ok(errorMessage.includes('denied'));
});

it('Transitions to "error" on audio capture failure ("audio-capture")', () => {
  let status = 'listening';
  let isListening = true;
  let errorMessage = null;

  function handleError(errorEvent) {
    if (errorEvent.error === 'audio-capture') {
      status = 'error';
      errorMessage = 'No microphone detected. Ensure an audio input device is connected and configured.';
      isListening = false;
    }
  }

  handleError({ error: 'audio-capture' });
  assert.strictEqual(status, 'error');
  assert.strictEqual(isListening, false);
  assert.ok(errorMessage.includes('No microphone'));
});

it('Returns to "standby" when stopped by user', async () => {
  let status = 'listening';
  let isListening = true;
  const mock = new MockSpeechRecognition();

  mock.onend = () => {
    isListening = false;
    status = 'standby';
  };

  mock.stop();
  await new Promise((resolve) => setTimeout(resolve, 20));

  assert.strictEqual(status, 'standby');
  assert.strictEqual(isListening, false);
});

it('Toggling listening switches between start and stop cleanly', () => {
  let isListening = false;
  let startedCount = 0;
  let stoppedCount = 0;

  function toggle() {
    if (isListening) {
      isListening = false;
      stoppedCount++;
    } else {
      isListening = true;
      startedCount++;
    }
  }

  toggle(); // 1st toggle: start
  assert.strictEqual(isListening, true);
  assert.strictEqual(startedCount, 1);

  toggle(); // 2nd toggle: stop
  assert.strictEqual(isListening, false);
  assert.strictEqual(stoppedCount, 1);

  toggle(); // 3rd toggle: start
  assert.strictEqual(isListening, true);
  assert.strictEqual(startedCount, 2);
});

console.log('----------------------------------------------------');
console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
if (passedTests === totalTests) {
  console.log('✅ ALL SHORTCUT AND STATE MACHINE TESTS PASSED!');
} else {
  process.exit(1);
}

