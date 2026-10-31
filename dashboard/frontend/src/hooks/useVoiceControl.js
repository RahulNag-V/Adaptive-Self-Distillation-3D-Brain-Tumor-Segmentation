import { useState, useEffect, useRef, useCallback } from 'react';
import { parseVoiceCommand } from '../services/voiceCommandParser';

/**
 * useVoiceControl Hook
 * Connects browser Web Speech API to NeuroVision AI voice command dispatcher.
 * Handles microphone permissions, speech recognition lifecycle, debouncing,
 * and text-to-speech audio feedback.
 */
export function useVoiceControl({ onCommand, ttsFeedback = true } = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'listening' | 'processing' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [audioFeedbackEnabled, setAudioFeedbackEnabled] = useState(ttsFeedback);

  const recognitionRef = useRef(null);
  const lastExecutedTextRef = useRef('');
  const lastExecutedTimeRef = useRef(0);
  const userStoppedRef = useRef(false);
  const onCommandRef = useRef(onCommand);

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  // Text-To-Speech announcement
  const speakFeedback = useCallback((text) => {
    if (!audioFeedbackEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 0.7;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      // Speech synthesis failure shouldn't disrupt UI
    }
  }, [audioFeedbackEnabled]);

  // Initialize SpeechRecognition instance
  useEffect(() => {
    const SpeechRecognition = typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setStatus('error');
      setErrorMessage('Web Speech API is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
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

      setInterimTranscript(interimStr);

      if (finalStr.trim()) {
        const cleanFinal = finalStr.trim();
        setTranscript(cleanFinal);
        setStatus('processing');

        // Debounce & deduplication check: prevent identical rapid triggers within 900ms
        const now = Date.now();
        if (
          cleanFinal.toLowerCase() === lastExecutedTextRef.current.toLowerCase() &&
          now - lastExecutedTimeRef.current < 900 &&
          !/repeat/.test(cleanFinal.toLowerCase())
        ) {
          setStatus('listening');
          return;
        }

        lastExecutedTextRef.current = cleanFinal;
        lastExecutedTimeRef.current = now;

        // Parse command
        const parsed = parseVoiceCommand(cleanFinal);

        if (parsed.success && parsed.action) {
          setStatus('success');
          setErrorMessage(null);
          const cmdRecord = {
            text: cleanFinal,
            action: parsed.action,
            success: true,
            label: parsed.action.label,
            timestamp: new Date().toLocaleTimeString(),
          };
          setLastCommand(cmdRecord);

          // Execute action via callback
          if (onCommandRef.current) {
            onCommandRef.current(parsed.action, cmdRecord);
          }

          // Voice chime / speech confirmation
          if (parsed.action.type !== 'STOP_LISTENING') {
            speakFeedback(parsed.action.label || 'Command executed');
          } else {
            speakFeedback('Voice control stopped');
          }

          // Reset status back to listening after visual pulse
          setTimeout(() => {
            setIsListening((cur) => {
              if (cur) setStatus('listening');
              return cur;
            });
          }, 1400);
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

          // Reset status back to listening after error display
          setTimeout(() => {
            setIsListening((cur) => {
              if (cur) setStatus('listening');
              return cur;
            });
          }, 2400);
        }
      }
    };

    recognition.onerror = (event) => {
      console.warn('[VoiceControl] Speech recognition error:', event.error);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setPermissionDenied(true);
        setStatus('error');
        setErrorMessage('Microphone access was denied. Please allow microphone permissions in your browser address bar.');
        setIsListening(false);
      } else if (event.error === 'no-speech') {
        // Natural silence timeout - keep listening if user hasn't explicitly stopped
        if (!userStoppedRef.current && isListening) {
          try {
            recognition.stop();
          } catch (e) {}
        }
      } else if (event.error === 'network') {
        setStatus('error');
        setErrorMessage('Network error during speech recognition. An active internet connection may be required by this browser.');
      } else {
        setStatus('error');
        setErrorMessage(`Recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (!userStoppedRef.current && isListening) {
        // Auto-reconnect continuous listening unless user clicked stop
        try {
          recognition.start();
        } catch (e) {
          setIsListening(false);
          setStatus('idle');
        }
      } else {
        setIsListening(false);
        setStatus('idle');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      userStoppedRef.current = true;
      try {
        recognition.abort();
      } catch (e) {}
    };
  }, [speakFeedback]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported) return;
    userStoppedRef.current = false;
    setErrorMessage(null);
    setTranscript('');
    setInterimTranscript('');
    try {
      recognitionRef.current.start();
    } catch (err) {
      if (err.name !== 'InvalidStateError') {
        console.warn('[VoiceControl] start error:', err);
      }
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    userStoppedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // ignore
      }
    }
    setIsListening(false);
    setStatus('idle');
    setInterimTranscript('');
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

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
  };
}

