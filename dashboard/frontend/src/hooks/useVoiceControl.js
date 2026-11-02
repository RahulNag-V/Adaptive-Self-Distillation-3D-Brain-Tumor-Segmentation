import { useState, useEffect, useRef, useCallback } from 'react';
import { parseVoiceCommand } from '../services/voiceCommandParser';

/**
 * useVoiceControl Hook
 * Connects browser Web Speech API to NeuroVision AI voice command dispatcher.
 * Handles microphone permissions, speech recognition lifecycle, debouncing,
 * interim vs final results, prevention of TTS audio feedback loop, and true execution state tracking.
 */
export function useVoiceControl({ onCommand, ttsFeedback = true, getContext } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState(null);
  // Status: 'standby' | 'listening' | 'processing' | 'executing' | 'success' | 'error' | 'unsupported'
  const [status, setStatus] = useState('standby');
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState(ttsFeedback);

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const lastExecutedTextRef = useRef('');
  const lastExecutedTimeRef = useRef(0);
  const userStoppedRef = useRef(true);
  const isSpeakingRef = useRef(false);
  const onCommandRef = useRef(onCommand);
  const getContextRef = useRef(getContext);
  const processAndDispatchRef = useRef(null);

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    getContextRef.current = getContext;
  }, [getContext]);

  // Text-To-Speech announcement with microphone loop guard
  const speakFeedback = useCallback((text) => {
    if (!audioFeedbackEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      isSpeakingRef.current = true;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 0.7;

      utterance.onend = () => {
        // Small guard window so microphone doesn't catch trailing echo
        setTimeout(() => {
          isSpeakingRef.current = false;
        }, 300);
      };

      utterance.onerror = () => {
        isSpeakingRef.current = false;
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      isSpeakingRef.current = false;
    }
  }, [audioFeedbackEnabled]);

  // Execute an allowlisted action through the pipeline
  const processAndDispatch = useCallback(async (cleanFinal) => {
    // If TTS is currently speaking its own confirmation, IGNORE audio to prevent self-trigger loop
    if (isSpeakingRef.current) {
      console.log('[VoiceControl] Ignored speech while TTS audio is playing.');
      return;
    }

    setStatus('processing');
    const now = Date.now();

    // Deduplication check: prevent identical rapid final triggers within 900ms
    if (
      cleanFinal.toLowerCase() === lastExecutedTextRef.current.toLowerCase() &&
      now - lastExecutedTimeRef.current < 900 &&
      !/repeat/.test(cleanFinal.toLowerCase())
    ) {
      if (isListeningRef.current) setStatus('listening');
      return;
    }

    lastExecutedTextRef.current = cleanFinal;
    lastExecutedTimeRef.current = now;

    setStatus('processing');
    const currentContext = getContextRef.current ? getContextRef.current() : {};
    const parsed = parseVoiceCommand(cleanFinal, currentContext);

    if (parsed.success && parsed.action) {
      setStatus('executing');
      setErrorMessage(null);

      const cmdRecord = {
        text: cleanFinal,
        action: parsed.action,
        success: true,
        label: parsed.action.label,
        timestamp: new Date().toLocaleTimeString(),
      };
      setLastCommand(cmdRecord);

      try {
        // Execute through callback
        if (onCommandRef.current) {
          await Promise.resolve(onCommandRef.current(parsed.action, cmdRecord));
        }

        // Only report success after action execution finishes!
        setStatus('success');

        // Audio feedback
        if (parsed.action.type !== 'STOP_LISTENING' && parsed.action.type !== 'NO_ACTION') {
          speakFeedback(parsed.action.feedback || parsed.action.label || 'Command executed');
        } else if (parsed.action.type === 'STOP_LISTENING') {
          speakFeedback('Voice control stopped');
        }

        // Pulse back to listening state if still listening
        setTimeout(() => {
          if (isListeningRef.current) {
            setStatus('listening');
          } else {
            setStatus('standby');
          }
        }, 1200);
      } catch (err) {
        console.error('[VoiceControl] Dispatch execution failed:', err);
        setStatus('error');
        setErrorMessage(`Execution error: ${err.message || 'Action failed'}`);
        setTimeout(() => {
          if (isListeningRef.current) {
            setStatus('listening');
          } else {
            setStatus('standby');
          }
        }, 2200);
      }
    } else {
      setStatus('error');
      const errorMsg = parsed.error || `Unrecognized command: "${cleanFinal}"`;
      setErrorMessage(errorMsg);
      setLastCommand({
        text: cleanFinal,
        action: null,
        success: false,
        error: errorMsg,
        timestamp: new Date().toLocaleTimeString(),
      });

      // Pulse back to listening after showing error
      setTimeout(() => {
        if (isListeningRef.current) {
          setStatus('listening');
        } else {
          setStatus('standby');
        }
      }, 2400);
    }
  }, [speakFeedback]);

  // Keep ref up to date to prevent closure capture issues
  useEffect(() => {
    processAndDispatchRef.current = processAndDispatch;
  }, [processAndDispatch]);

  // Initialize SpeechRecognition instance exactly once on mount
  useEffect(() => {
    const SpeechRecognition = typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setStatus('unsupported');
      setErrorMessage('Web Speech API is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    // Do NOT show "Listening" until browser confirms onstart
    recognition.onstart = () => {
      isListeningRef.current = true;
      userStoppedRef.current = false;
      setIsListening(true);
      setStatus('listening');
      setErrorMessage(null);
      setPermissionDenied(false);
    };

    recognition.onresult = (event) => {
      let finalStr = '';
      let interimStr = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalStr += item[0].transcript;
        } else {
          interimStr += item[0].transcript;
        }
      }

      if (interimStr) {
        setInterimTranscript(interimStr);
        setStatus('processing');
      }

      // Execute ONLY final recognition results, once each!
      if (finalStr.trim()) {
        const cleanFinal = finalStr.trim();
        setTranscript(cleanFinal);
        setInterimTranscript('');
        if (processAndDispatchRef.current) {
          processAndDispatchRef.current(cleanFinal);
        }
      }
    };

    recognition.onerror = (event) => {
      const err = event.error;
      console.warn('[VoiceControl] Speech recognition event error:', err);
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        userStoppedRef.current = true;
        isListeningRef.current = false;
        setPermissionDenied(true);
        setStatus('error');
        setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser address bar.');
        setIsListening(false);
      } else if (err === 'audio-capture') {
        userStoppedRef.current = true;
        isListeningRef.current = false;
        setStatus('error');
        setErrorMessage('No microphone detected. Ensure an audio input device is connected and configured.');
        setIsListening(false);
      } else if (err === 'no-speech') {
        // In continuous recognition, silence is normal - do not kill the session
      } else if (err === 'network') {
        setStatus('error');
        setErrorMessage('Network error during speech recognition. Active internet connection required by browser engine.');
      } else if (err === 'aborted') {
        if (userStoppedRef.current) {
          isListeningRef.current = false;
          setIsListening(false);
          setStatus('standby');
        }
      } else {
        setStatus('error');
        setErrorMessage(`Recognition error: ${err}`);
      }
    };

    recognition.onend = () => {
      // Keep-alive for continuous recognition: restart if user did not explicitly stop
      if (!userStoppedRef.current && isListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {
          isListeningRef.current = false;
          setIsListening(false);
          setStatus('standby');
        }
      } else {
        isListeningRef.current = false;
        setIsListening(false);
        setStatus('standby');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      userStoppedRef.current = true;
      isListeningRef.current = false;
      try {
        recognition.abort();
      } catch (e) {}
    };
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setStatus('unsupported');
      setErrorMessage('Speech Recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }
    if (!recognitionRef.current) return;
    // Prevent overlapping sessions
    if (isListeningRef.current) return;

    userStoppedRef.current = false;
    setErrorMessage(null);
    setTranscript('');
    setInterimTranscript('');
    try {
      recognitionRef.current.start();
    } catch (err) {
      if (err.name === 'InvalidStateError') {
        isListeningRef.current = true;
        setIsListening(true);
        setStatus('listening');
      } else {
        console.warn('[VoiceControl] start error:', err);
        setStatus('error');
        setErrorMessage(`Could not start microphone: ${err.message || err.name}`);
      }
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    userStoppedRef.current = true;
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
    }
    setIsListening(false);
    setStatus('standby');
    setInterimTranscript('');
  }, []);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  return {
    isListening,
    transcript: interimTranscript || transcript,
    lastCommand,
    status,
    errorMessage,
    isSupported,
    permissionDenied,
    audioFeedbackEnabled,
    setAudioFeedbackEnabled,
    startListening,
    stopListening,
    toggleListening,
    processAndDispatch, // Expose for testing and synthetic input
  };
}
