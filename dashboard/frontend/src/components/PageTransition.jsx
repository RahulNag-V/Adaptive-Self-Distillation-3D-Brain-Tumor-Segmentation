import React, { useRef, useState, useEffect } from 'react';
import PageSkeleton from './skeletons/PageSkeleton';
import { prefersReducedMotion, smoothScrollToTop } from '../utils/motion';

/**
 * Target skeleton loading duration: approximately 1.2 seconds.
 * Transition duration: 250ms fade.
 */
const SKELETON_TARGET_MS = 1200;
const SKELETON_FADE_MS = 250;

/**
 * PageTransition Component
 * Provides Apple-inspired, premium mint-toned skeleton loading across application routes.
 * CRITICAL RULE: Home page ('overview') must NEVER display a skeleton loader.
 */
export default function PageTransition({ children, pageKey, className = '' }) {
  // CRITICAL: Home page ('overview') never uses a skeleton
  const isHome = pageKey === 'overview' || pageKey === 'home' || !pageKey;

  // Track skeleton display state for non-home routes
  const [isSkeletonVisible, setIsSkeletonVisible] = useState(() => !isHome);
  const [skeletonTab, setSkeletonTab] = useState(() => (isHome ? null : pageKey));
  const [fadePhase, setFadePhase] = useState('idle'); // 'idle' | 'fading'
  const activeTimerRef = useRef(null);
  const fadeTimerRef = useRef(null);

  useEffect(() => {
    // Clear any existing timers on route/tab change
    if (activeTimerRef.current) clearTimeout(activeTimerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

    // CRITICAL: If navigating to Home, bypass skeleton completely with zero delay
    if (pageKey === 'overview' || pageKey === 'home' || !pageKey) {
      setIsSkeletonVisible(false);
      setSkeletonTab(null);
      setFadePhase('idle');
      smoothScrollToTop();
      return;
    }

    // Navigating to a non-home route: activate page-specific skeleton
    setIsSkeletonVisible(true);
    setSkeletonTab(pageKey);
    setFadePhase('idle');
    smoothScrollToTop();

    const reducedMotion = prefersReducedMotion();
    const duration = reducedMotion ? 400 : SKELETON_TARGET_MS;
    const fadeDuration = reducedMotion ? 0 : SKELETON_FADE_MS;

    activeTimerRef.current = setTimeout(() => {
      // Start smooth crossfade from skeleton to actual content
      setFadePhase('fading');

      fadeTimerRef.current = setTimeout(() => {
        setIsSkeletonVisible(false);
        setFadePhase('idle');
      }, fadeDuration);
    }, duration);

    return () => {
      if (activeTimerRef.current) clearTimeout(activeTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [pageKey]);

  // If on Home, render children directly with zero overhead and zero delay
  if (isHome) {
    return (
      <div
        className={`h-full w-full min-h-0 flex-1 flex flex-col ${className}`}
        data-testid="page-transition-container"
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={`h-full w-full min-h-0 flex-1 flex flex-col relative ${className}`}
      data-testid="page-transition-container"
      aria-busy={isSkeletonVisible}
    >
      {/* 1. Page-Specific Skeleton Overlay with gentle shimmer */}
      {isSkeletonVisible && (
        <div
          className={`w-full h-full min-h-0 flex-1 z-30 transition-opacity ${
            fadePhase === 'fading' ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            transitionDuration: `${SKELETON_FADE_MS}ms`,
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          aria-hidden={fadePhase === 'fading'}
          data-testid="page-skeleton-overlay"
        >
          <PageSkeleton tab={skeletonTab} />
        </div>
      )}

      {/* 2. Destination Page Content (Pre-mounted for zero-lag reveal) */}
      <div
        className={`w-full h-full min-h-0 flex-1 flex flex-col transition-opacity ${
          isSkeletonVisible && fadePhase !== 'fading'
            ? 'opacity-0 pointer-events-none absolute inset-0 overflow-hidden'
            : fadePhase === 'fading'
            ? 'opacity-100 pointer-events-none'
            : 'opacity-100'
        }`}
        style={{
          transitionDuration: `${SKELETON_FADE_MS}ms`,
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        data-testid="page-content-wrapper"
      >
        {children}
      </div>
    </div>
  );
}
