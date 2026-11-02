import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { gsap, prefersReducedMotion, MOTION, smoothScrollToTop } from '../utils/motion';

/**
 * PageTransition Component
 * Provides coordinated exit-then-entrance transitions between clinical pages.
 * Never causes blank screens, layout jumps, or flickering.
 * Supports rapid navigation cancellation guard and reduced motion.
 */
export default function PageTransition({ children, pageKey, className = '' }) {
  const containerRef = useRef(null);
  const [displayedContent, setDisplayedContent] = useState({ key: pageKey, node: children });
  const isTransitioningRef = useRef(false);
  const pendingPageRef = useRef({ key: pageKey, node: children });

  pendingPageRef.current = { key: pageKey, node: children };

  useEffect(() => {
    // If the key hasn't changed, keep node updated
    if (pageKey === displayedContent.key) {
      setDisplayedContent({ key: pageKey, node: children });
      return;
    }

    if (prefersReducedMotion() || !containerRef.current) {
      setDisplayedContent({ key: pageKey, node: children });
      smoothScrollToTop();
      return;
    }

    // Kill any active tweens on the container
    gsap.killTweensOf(containerRef.current);
    isTransitioningRef.current = true;

    // Coordinated Exit: fade out & slight translate upward
    gsap.to(containerRef.current, {
      opacity: 0,
      y: -6,
      duration: MOTION.durations.fast,
      ease: MOTION.easings.inOut,
      onComplete: () => {
        // Swap to the most recent pending page
        const latest = pendingPageRef.current;
        setDisplayedContent({ key: latest.key, node: latest.node });
        smoothScrollToTop();

        // Coordinated Entrance: fade in & glide to 0
        gsap.fromTo(
          containerRef.current,
          {
            opacity: 0,
            y: 8,
          },
          {
            opacity: 1,
            y: 0,
            duration: MOTION.durations.normal,
            ease: MOTION.easings.out,
            clearProps: 'all',
            onComplete: () => {
              isTransitioningRef.current = false;
            },
          }
        );
      },
    });

    return () => {
      if (containerRef.current) {
        gsap.killTweensOf(containerRef.current);
      }
    };
  }, [pageKey]);

  // Initial mount entrance animation
  useLayoutEffect(() => {
    if (prefersReducedMotion() || !containerRef.current) return;

    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 8 },
      {
        opacity: 1,
        y: 0,
        duration: MOTION.durations.normal,
        ease: MOTION.easings.out,
        clearProps: 'all',
      }
    );
  }, []);

  return (
    <div
      ref={containerRef}
      className={`h-full w-full min-h-0 ${className}`}
      data-testid="page-transition-container"
    >
      {displayedContent.node}
    </div>
  );
}
