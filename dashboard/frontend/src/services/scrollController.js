/**
 * NeuroVision AI - Website-Wide Scroll Controller
 * Handles discrete stepping, cardinal top/bottom jumps, and continuous
 * requestAnimationFrame scrolling for the primary application content container.
 *
 * Rules:
 * - Only scrolls the primary content container (id="neurovision-main-scroll") or falls back to window.
 * - NEVER scrolls 3D canvases, dropdowns, modals, or nested scrollables.
 * - Single cancellable rAF loop at 300px/s (or 600px/s faster).
 * - Stops instantly on "stop", route change, mic stop, or unmount.
 * - Respects prefers-reduced-motion.
 */

import { SCROLL_CONFIG } from './commandRegistry.js';

class ScrollController {
  constructor() {
    this.activeRafId = null;
    this.lastTimestamp = null;
    this.continuousDirection = 'down'; // 'down' | 'up'
    this.continuousSpeed = SCROLL_CONFIG.continuousSpeed; // px per second
    this.isContinuousActive = false;
  }

  /**
   * Discovers the primary scroll container.
   * Looks for the designated main element (id="neurovision-main-scroll").
   */
  getPrimaryContainer() {
    if (typeof document === 'undefined') return null;
    const designated = document.getElementById('neurovision-main-scroll');
    if (designated && designated.scrollHeight > designated.clientHeight) {
      return designated;
    }
    // Fall back to main element in AppLayout
    const mainEl = document.querySelector('main.flex-1');
    if (mainEl && mainEl.scrollHeight > mainEl.clientHeight) {
      return mainEl;
    }
    return null;
  }

  /**
   * Checks if the user prefers reduced motion.
   */
  prefersReducedMotion() {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Discrete scroll step by pixel delta or screen ratio.
   * @param {Object} options
   * @param {'up'|'down'} options.direction
   * @param {number} [options.amount] - Exact pixels
   * @param {boolean} [options.isScreen] - Scroll 90% of viewport height
   */
  scrollStep({ direction = 'down', amount = SCROLL_CONFIG.normalStep, isScreen = false }) {
    // A single move cancels any ongoing continuous loop first
    this.stopContinuousScroll();

    const container = this.getPrimaryContainer();
    const sign = direction === 'up' ? -1 : 1;
    let delta = amount;

    if (isScreen) {
      const viewHeight = container ? container.clientHeight : (typeof window !== 'undefined' ? window.innerHeight : 800);
      delta = Math.round(viewHeight * SCROLL_CONFIG.screenRatio);
    }

    const scrollOptions = {
      behavior: this.prefersReducedMotion() ? 'auto' : 'smooth',
    };

    if (container) {
      container.scrollBy({ top: sign * delta, ...scrollOptions });
    } else if (typeof window !== 'undefined') {
      window.scrollBy({ top: sign * delta, ...scrollOptions });
    }
  }

  /**
   * Cardinal navigation: Scroll to absolute top or bottom.
   * @param {'top'|'bottom'} position
   */
  scrollToPosition(position) {
    this.stopContinuousScroll();

    const container = this.getPrimaryContainer();
    const scrollOptions = {
      behavior: this.prefersReducedMotion() ? 'auto' : 'smooth',
    };

    if (position === 'top') {
      if (container) {
        container.scrollTo({ top: 0, ...scrollOptions });
      } else if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, ...scrollOptions });
      }
    } else if (position === 'bottom') {
      if (container) {
        container.scrollTo({ top: container.scrollHeight, ...scrollOptions });
      } else if (typeof window !== 'undefined') {
        window.scrollTo({ top: document.body.scrollHeight, ...scrollOptions });
      }
    }
  }

  /**
   * Starts continuous smooth scrolling at specified speed.
   * @param {'down'|'up'} [direction]
   * @param {number} [speed] - px per second (defaults to 300px/s, 600px/s for faster)
   */
  startContinuousScroll({ direction, speed } = {}) {
    // Cancel existing loop before starting new one
    this.stopContinuousScroll();

    if (direction) {
      this.continuousDirection = direction;
    }
    if (speed) {
      this.continuousSpeed = speed;
    }

    this.isContinuousActive = true;
    this.lastTimestamp = null;

    const step = (timestamp) => {
      if (!this.isContinuousActive) return;

      if (!this.lastTimestamp) {
        this.lastTimestamp = timestamp;
      }

      const elapsed = (timestamp - this.lastTimestamp) / 1000;
      this.lastTimestamp = timestamp;

      const container = this.getPrimaryContainer();
      const distance = this.continuousSpeed * elapsed;
      const sign = this.continuousDirection === 'up' ? -1 : 1;

      if (container) {
        const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 2;
        const atTop = container.scrollTop <= 0;

        if ((sign > 0 && atBottom) || (sign < 0 && atTop)) {
          this.stopContinuousScroll();
          return;
        }
        container.scrollTop += sign * distance;
      } else if (typeof window !== 'undefined') {
        const atBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 2;
        const atTop = window.scrollY <= 0;

        if ((sign > 0 && atBottom) || (sign < 0 && atTop)) {
          this.stopContinuousScroll();
          return;
        }
        window.scrollBy(0, sign * distance);
      }

      if (typeof requestAnimationFrame !== 'undefined') {
        this.activeRafId = requestAnimationFrame(step);
      } else {
        this.activeRafId = 1;
      }
    };

    if (typeof requestAnimationFrame !== 'undefined') {
      this.activeRafId = requestAnimationFrame(step);
    } else {
      this.activeRafId = 1;
    }
  }

  /**
   * Immediately halts continuous scrolling and releases animation frame.
   */
  stopContinuousScroll() {
    this.isContinuousActive = false;
    if (this.activeRafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.activeRafId);
      this.activeRafId = null;
    }
    this.lastTimestamp = null;
  }
}

export const scrollController = new ScrollController();
