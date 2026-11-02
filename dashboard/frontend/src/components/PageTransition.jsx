import React, { useRef, useLayoutEffect } from 'react';
import { gsap, prefersReducedMotion, MOTION } from '../utils/motion';

/**
 * PageTransition Component
 * Provides subtle, fluid entrance transitions between clinical pages.
 * Never causes blank screens or layout jumps.
 */
export default function PageTransition({ children, pageKey, className = '' }) {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    if (prefersReducedMotion() || !containerRef.current) return;

    const ctx = gsap.context(() => {
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
          clearProps: 'all', // Clean up inline transforms after animation completes
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [pageKey]);

  return (
    <div
      ref={containerRef}
      key={pageKey}
      className={`h-full w-full min-h-0 ${className}`}
    >
      {children}
    </div>
  );
}
