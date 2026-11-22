import React, { useState, useEffect, useMemo } from 'react';

/**
 * HandwritingText Component
 * 
 * Implements a premium, progressive letter-by-letter digital handwriting reveal effect:
 * - Each character reveals with an angled stroke wipe from left to right (natural writing direction).
 * - Staggers letter reveals (15–35ms) with smooth continuous stroke duration (150–220ms).
 * - Preserves original typography, weight, color, line-height, letter-spacing, and word wrapping.
 * - Words are wrapped to guarantee natural CSS word-breaking without awkward character splits.
 * - Accessible: Screen readers receive full text via aria-label with role="text".
 * - Respects prefers-reduced-motion (renders instantly without animation).
 * - Plays once on mount/reload; settles into static, GPU-free text upon completion.
 */
export default function HandwritingText({
  text = '',
  delay = 0,
  stagger = 0.025,
  duration = 0.18,
  className = '',
  style = {},
  as: Component = 'span',
  onComplete,
}) {
  const [isCompleted, setIsCompleted] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);

  // Check for prefers-reduced-motion on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mq.matches) {
        setPrefersReduced(true);
        setIsCompleted(true);
      }
      const handler = (e) => {
        if (e.matches) {
          setPrefersReduced(true);
          setIsCompleted(true);
        }
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, []);

  // Calculate total animation duration and settle into pure static DOM after completion
  useEffect(() => {
    if (prefersReduced) return;

    const charCount = text.length;
    const totalTimeMs = (delay + charCount * stagger + duration + 0.15) * 1000;

    const timer = setTimeout(() => {
      setIsCompleted(true);
      if (onComplete) onComplete();
    }, totalTimeMs);

    return () => clearTimeout(timer);
  }, [text, delay, stagger, duration, prefersReduced, onComplete]);

  // Pre-split text into words and tokens to preserve standard word-wrapping
  const renderedTokens = useMemo(() => {
    if (!text) return null;

    // If reduced motion or already completed, return plain text for maximum performance
    if (prefersReduced || isCompleted) {
      return text;
    }

    // Split text preserving whitespace delimiters
    const tokens = text.split(/(\s+)/).filter(Boolean);
    let globalCharIndex = 0;

    return tokens.map((token, tokenIdx) => {
      // If whitespace, render transparent space and advance index slightly
      if (/^\s+$/.test(token)) {
        globalCharIndex += 0.8;
        return (
          <span key={`space-${tokenIdx}`} className="inline whitespace-pre">
            {token}
          </span>
        );
      }

      // Word token: wrap in inline-block whitespace-nowrap to prevent mid-word breaks
      const chars = Array.from(token);
      const wordElements = chars.map((char, charIdx) => {
        const charDelay = delay + globalCharIndex * stagger;
        globalCharIndex += 1;

        return (
          <span
            key={`char-${tokenIdx}-${charIdx}`}
            className="handwriting-char"
            style={{
              animationDelay: `${charDelay.toFixed(3)}s`,
              animationDuration: `${duration.toFixed(3)}s`,
            }}
          >
            {char}
          </span>
        );
      });

      return (
        <span
          key={`word-${tokenIdx}`}
          className="inline-block whitespace-nowrap"
        >
          {wordElements}
        </span>
      );
    });
  }, [text, delay, stagger, duration, prefersReduced, isCompleted]);

  // Static finished state: clean text without extra spans
  if (isCompleted || prefersReduced) {
    return (
      <Component className={className} style={style}>
        {text}
      </Component>
    );
  }

  return (
    <Component
      className={className}
      style={style}
      aria-label={text}
      role="text"
    >
      <span aria-hidden="true" className="inline">
        {renderedTokens}
      </span>
    </Component>
  );
}
