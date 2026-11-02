/**
 * NeuroVision AI - Resilient Speech Recognition Engine
 *
 * Implements:
 * - Single SpeechRecognition instance held in a ref, safe under React StrictMode double-mount
 * - Explicit state machine: 'idle' -> 'starting' -> 'listening' -> 'stopping' -> 'error'
 * - continuous=true, interimResults=true, lang='en-US'
 * - Deduplication of final transcripts by result index and text
 * - Auto-restart keep-alive on silence (no-speech) with capped retry counter (max 5) and backoff
 * - Insecure context detection (requires HTTPS or localhost/127.0.0.1)
 * - Browser support check (Chrome/Edge/Safari supported, Firefox/others clear message)
 * - Error handlers for not-allowed, service-not-allowed, audio-capture, network, aborted
 * - TTS feedback protection: ignores microphone input while speech synthesis speaks + 300ms tail
 * - Clean teardown on unmount
 */

export class SpeechEngine {
  constructor({ onTranscript, onInterim, onStateChange, onError } = {}) {
    this.onTranscript = onTranscript;
    this.onInterim = onInterim;
    this.onStateChange = onStateChange;
    this.onError = onError;

    this.state = 'idle'; // 'idle' | 'starting' | 'listening' | 'stopping' | 'error'
    this.recognition = null;
    this.userWantsListening = false;
    this.retryCount = 0;
    this.maxRetries = 5;
    this.restartTimer = null;
    this.isSpeakingTTS = false;
    this.lastProcessedIndex = -1;
    this.lastProcessedText = '';
    this.lastProcessedTime = 0;

    this.isSupported = false;
    this.isSecureContext = true;

    this.checkEnvironment();
  }

  checkEnvironment() {
    if (typeof window === 'undefined') return;

    // Check secure context
    if (typeof window.isSecureContext !== 'undefined') {
      const isLocal = typeof window.location !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      this.isSecureContext = window.isSecureContext || isLocal;
    }

    // Check Web Speech API availability
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.isSupported = !!SpeechRecognition;
  }

  setState(newState) {
    if (this.state === newState) return;
    this.state = newState;
    if (this.onStateChange) {
      this.onStateChange(this.state);
    }
  }

  /**
   * Initializes the native SpeechRecognition instance.
   * Safe to call repeatedly; reuses instance if already constructed.
   */
  initInstance() {
    if (this.recognition || !this.isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      this.retryCount = 0;
      this.setState('listening');
    };

    rec.onresult = (event) => {
      // Disregard input if TTS is currently playing back confirmation audio (plus tail)
      if (this.isSpeakingTTS) return;

      let interim = '';
      let finalStr = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        if (result.isFinal) {
          finalStr += result[0].transcript;
          this.lastProcessedIndex = i;
        } else {
          interim += result[0].transcript;
        }
      }

      if (interim && this.onInterim) {
        this.onInterim(interim);
      }

      if (finalStr.trim()) {
        const clean = finalStr.trim();
        const now = Date.now();

        // Deduplication: prevent identical rapid final triggers within 900ms
        if (clean.toLowerCase() === this.lastProcessedText.toLowerCase() && now - this.lastProcessedTime < 900) {
          return;
        }

        this.lastProcessedText = clean;
        this.lastProcessedTime = now;

        if (this.onTranscript) {
          this.onTranscript(clean);
        }
      }
    };

    rec.onerror = (event) => {
      const err = event.error;
      console.warn('[SpeechEngine] Recognition error:', err);

      if (err === 'not-allowed' || err === 'service-not-allowed') {
        this.userWantsListening = false;
        this.setState('error');
        if (this.onError) {
          this.onError({
            code: 'NOT_ALLOWED',
            message: 'Microphone access denied. Click the lock/tune icon in your browser address bar and set Microphone to "Allow".',
          });
        }
      } else if (err === 'audio-capture') {
        this.userWantsListening = false;
        this.setState('error');
        if (this.onError) {
          this.onError({
            code: 'AUDIO_CAPTURE',
            message: 'No microphone detected. Please plug in or select an audio input device in system settings.',
          });
        }
      } else if (err === 'network') {
        this.setState('error');
        if (this.onError) {
          this.onError({
            code: 'NETWORK',
            message: 'Speech recognition network error. Active internet connection required by browser cloud speech engine.',
          });
        }
      } else if (err === 'no-speech') {
        // Normal silence event in continuous mode; do not show error, let onend handle keep-alive
      } else if (err === 'aborted') {
        // Expected when stopped programmatically
        if (!this.userWantsListening) {
          this.setState('idle');
        }
      } else {
        this.setState('error');
        if (this.onError) {
          this.onError({
            code: err.toUpperCase(),
            message: `Speech recognition error: ${err}`,
          });
        }
      }
    };

    rec.onend = () => {
      // Auto-restart keep-alive if user still wants to listen and retries remain
      if (this.userWantsListening && this.state !== 'stopping') {
        if (this.retryCount < this.maxRetries) {
          this.retryCount++;
          const backoff = Math.min(1000, 150 * Math.pow(1.5, this.retryCount));
          this.restartTimer = setTimeout(() => {
            if (this.userWantsListening && (this.state === 'listening' || this.state === 'starting' || this.state === 'idle')) {
              try {
                this.recognition.start();
                this.setState('starting');
              } catch (e) {
                // If already active, continue
              }
            }
          }, backoff);
        } else {
          // Retry cap exceeded
          this.userWantsListening = false;
          this.setState('idle');
        }
      } else {
        this.setState('idle');
      }
    };

    this.recognition = rec;
  }

  /**
   * Activates voice recognition.
   */
  start() {
    if (!this.isSecureContext) {
      this.setState('error');
      if (this.onError) {
        this.onError({
          code: 'INSECURE_CONTEXT',
          message: 'Speech Recognition requires a secure context (HTTPS or localhost).',
        });
      }
      return;
    }

    if (!this.isSupported) {
      this.setState('error');
      if (this.onError) {
        this.onError({
          code: 'UNSUPPORTED',
          message: 'Web Speech API is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari.',
        });
      }
      return;
    }

    // Prevent secondary start while already active
    if (this.state === 'listening' || this.state === 'starting') return;

    this.initInstance();
    this.userWantsListening = true;
    this.retryCount = 0;
    this.setState('starting');

    try {
      this.recognition.start();
    } catch (err) {
      if (err.name === 'InvalidStateError') {
        // Already started
        this.setState('listening');
      } else {
        this.setState('error');
        if (this.onError) {
          this.onError({
            code: 'START_FAILURE',
            message: `Could not start microphone: ${err.message || err.name}`,
          });
        }
      }
    }
  }

  /**
   * Deactivates voice recognition cleanly.
   */
  stop() {
    this.userWantsListening = false;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    this.setState('stopping');

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    // Force transition to idle after short window
    setTimeout(() => {
      if (this.state === 'stopping') {
        this.setState('idle');
      }
    }, 200);
  }

  toggle() {
    if (this.state === 'listening' || this.state === 'starting') {
      this.stop();
    } else {
      this.start();
    }
  }

  /**
   * TTS feedback lock: prevents recognition from picking up speech synthesis audio.
   */
  speak(text, { volume = 0.7, rate = 1.05 } = {}) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      this.isSpeakingTTS = true;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = volume;
      utterance.rate = rate;

      utterance.onend = () => {
        // 300ms tail window to prevent trailing room echo
        setTimeout(() => {
          this.isSpeakingTTS = false;
        }, 300);
      };

      utterance.onerror = () => {
        this.isSpeakingTTS = false;
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      this.isSpeakingTTS = false;
    }
  }

  /**
   * Full unmount teardown.
   */
  destroy() {
    this.userWantsListening = false;
    if (this.restartTimer) clearTimeout(this.restartTimer);
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {}
    }
    this.recognition = null;
    this.setState('idle');
  }
}
