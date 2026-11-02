/**
 * NeuroVision AI - Motion & Animation Design Engine
 * Standardized GSAP configuration, ScrollTrigger registration, and reduced-motion guard.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins safely in browser environment
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Checks if user has requested reduced motion in their OS or browser settings.
 */
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Standard Motion Design Tokens (Durations & Easings)
 * Designed for clinical precision: calm, responsive, and free of excessive bounce.
 */
export const MOTION = {
  durations: {
    micro: 0.12,     // Button press / active state
    fast: 0.18,      // Tooltips, hover states, quick badges
    normal: 0.25,    // Dropdowns, popovers, tabs, breadcrumbs
    medium: 0.35,    // Sidebar collapse/expansion, modals, drawers
    slow: 0.50,      // Page section reveal, cards stagger
  },
  easings: {
    out: 'power2.out',
    inOut: 'power2.inOut',
    smooth: 'power3.out',
    smoothInOut: 'power3.inOut',
    decelerate: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },
};

/**
 * Smoothly scrolls an element or window to top with reduced motion fallback.
 */
export function smoothScrollToTop(containerElement = null) {
  const el = containerElement || (typeof document !== 'undefined' ? document.getElementById('neurovision-main-scroll') : null);
  const isReduced = prefersReducedMotion();

  if (!el) {
    if (typeof window !== 'undefined') {
      window.scrollTo({
        top: 0,
        behavior: isReduced ? 'auto' : 'smooth',
      });
    }
    return;
  }

  if (isReduced) {
    el.scrollTop = 0;
  } else {
    try {
      el.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch {
      el.scrollTop = 0;
    }
  }
}

export { gsap, ScrollTrigger };
