/**
 * NeuroVision AI - Isolated Website-Wide Scroll Controller
 *
 * Dedicated controller for primary content container scrolling.
 * - Targets primary main content container (#neurovision-main-scroll or main.flex-1)
 * - NEVER scrolls 3D canvas, dropdowns, modals, or nested scrollables
 * - Discrete stepping: small (120px), normal (400px), large (900px), screen (90% viewport height), custom pixels/screens
 * - Cardinal jumps: absolute top (0) and bottom
 * - Continuous scroll: exactly ONE cancellable requestAnimationFrame loop at 300px/s (or 600px/s)
 * - Guaranteed instant stop on "stop", route navigation, microphone disabled, unmount, or page blur
 * - Full support for prefers-reduced-motion
 */

import { SCROLL_CONFIG } from './registry.js';

class ScrollController {
  constructor() {
    this.activeRafId = null;
    this.lastTimestamp = null;
    this.continuousDirection = 'down'; // 'down' | 'up'
    this.continuousSpeed = SCROLL_CONFIG.continuousSpeed; // px per second
    this.isContinuousActive = false;
  }

  /**
   * Identifies the primary content scroll container.
   */
  getPrimaryContainer() {
    if (typeof document === 'undefined') return null;
    const designated = document.getElementById('neurovision-main-scroll');
    if (designated && designated.scrollHeight > designated.clientHeight) {
      return designated;
    }
    const mainEl = document.querySelector('main.flex-1');
    if (mainEl && mainEl.scrollHeight > mainEl.clientHeight) {
      return mainEl;
    }
    return null;
  }

  /**
   * Checks whether the user has enabled prefers-reduced-motion.
   */
  prefersReducedMotion() {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Executes discrete scroll step.
   * Cancels continuous loop if running.
   */
  scrollStep({ direction = 'down', amount = SCROLL_CONFIG.normalStep, isScreen = false }) {
    this.stopContinuousScroll();

    const container = this.getPrimaryContainer();
    const sign = direction === 'up' ? -1 : 1;
    let delta = amount;

    if (isScreen) {
      const viewHeight = container
        ? container.clientHeight
        : typeof window !== 'undefined' ? window.innerHeight : 800;
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
   * Cardinal navigation: top or bottom.
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
        window.scrollTo({ top: document.documentElement.scrollHeight, ...scrollOptions });
      }
    }
  }

  /**
   * Starts or updates the single cancellable continuous scroll loop.
   */
  startContinuousScroll({ direction, speed } = {}) {
    if (this.prefersReducedMotion()) {
      this.scrollStep({ direction: direction || this.continuousDirection });
      return;
    }

    if (direction) this.continuousDirection = direction;
    if (speed) this.continuousSpeed = speed;

    this.isContinuousActive = true;
    this.lastTimestamp = null;

    if (this.activeRafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.activeRafId);
      this.activeRafId = null;
    }

    const loop = (timestamp) => {
      if (!this.isContinuousActive) return;

      if (this.lastTimestamp !== null) {
        const elapsed = (timestamp - this.lastTimestamp) / 1000;
        const delta = this.continuousSpeed * elapsed;
        const sign = this.continuousDirection === 'up' ? -1 : 1;

        const container = this.getPrimaryContainer();
        if (container) {
          container.scrollTop += sign * delta;
          // Stop if reached top or bottom
          if (
            (sign > 0 && container.scrollTop + container.clientHeight >= container.scrollHeight - 2) ||
            (sign < 0 && container.scrollTop <= 0)
          ) {
            this.stopContinuousScroll();
            return;
          }
        } else if (typeof window !== 'undefined') {
          window.scrollBy(0, sign * delta);
        }
      }

      this.lastTimestamp = timestamp;
      if (typeof requestAnimationFrame !== 'undefined') {
        this.activeRafId = requestAnimationFrame(loop);
      }
    };

    if (typeof requestAnimationFrame !== 'undefined') {
      this.activeRafId = requestAnimationFrame(loop);
    }
  }

  /**
   * Halts any continuous scrolling immediately.
   */
  stopContinuousScroll() {
    this.isContinuousActive = false;
    if (this.activeRafId !== null && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.activeRafId);
    }
    this.activeRafId = null;
    this.lastTimestamp = null;
  }

  /**
   * Route change or component unmount cleanup.
   */
  cleanup() {
    this.stopContinuousScroll();
  }
}

export const scrollController = new ScrollController();

