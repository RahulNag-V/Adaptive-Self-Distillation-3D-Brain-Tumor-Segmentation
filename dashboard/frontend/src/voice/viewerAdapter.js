/**
 * NeuroVision AI - 3D Viewer & MPR Action Adapter
 *
 * Bridges allowlisted voice actions to ViewerPage state and 3D Three.js canvas.
 * Validates slice coordinates against real volumetric dimensions (never assumes axis equals array index).
 * Sagittal (X) in [0..239], Coronal (Y) in [0..239], Axial (Z) in [0..154].
 */

import { VIEWER_CONSTRAINTS } from './registry.js';

export class ViewerAdapter {
  constructor() {
    this.viewerHandlers = new Set();
    this.statusListeners = new Set();
    this.currentStatus = {
      selectedPatientId: 'BraTS2021_01017',
      activePlane: 'Axial (Z)',
      coordinates: { x: 120, y: 120, z: 78 },
      dimensions: { ...VIEWER_CONSTRAINTS.dimensions },
      availablePatients: [],
      lastFeedback: null,
    };
  }

  /**
   * Registers a viewer action handler from ViewerPage.
   */
  registerHandler(handler) {
    this.viewerHandlers.add(handler);
    return () => {
      this.viewerHandlers.delete(handler);
    };
  }

  /**
   * Synchronizes latest state from ViewerPage.
   */
  updateStatus(partial) {
    this.currentStatus = { ...this.currentStatus, ...partial };
    this.statusListeners.forEach((fn) => {
      try {
        fn(this.currentStatus);
      } catch (e) {}
    });
  }

  /**
   * Subscribes to status updates.
   */
  subscribeStatus(listener) {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  getStatus() {
    return this.currentStatus;
  }

  /**
   * Validates and normalizes 3D coordinates.
   * Returns { valid: boolean, error: string|null, coordinates: { x, y, z } }
   */
  validateCoordinates({ x, y, z }) {
    const dims = this.currentStatus.dimensions || VIEWER_CONSTRAINTS.dimensions;
    const result = {};

    if (x !== undefined) {
      const numX = Number(x);
      if (isNaN(numX) || numX < 0 || numX >= dims.sagittal) {
        return {
          valid: false,
          error: `Sagittal (X) coordinate ${x} is out of bounds (Valid range: 0 to ${dims.sagittal - 1}).`,
        };
      }
      result.x = Math.round(numX);
    }

    if (y !== undefined) {
      const numY = Number(y);
      if (isNaN(numY) || numY < 0 || numY >= dims.coronal) {
        return {
          valid: false,
          error: `Coronal (Y) coordinate ${y} is out of bounds (Valid range: 0 to ${dims.coronal - 1}).`,
        };
      }
      result.y = Math.round(numY);
    }

    if (z !== undefined) {
      const numZ = Number(z);
      if (isNaN(numZ) || numZ < 0 || numZ >= dims.axial) {
        return {
          valid: false,
          error: `Axial (Z) coordinate ${z} is out of bounds (Valid range: 0 to ${dims.axial - 1}).`,
        };
      }
      result.z = Math.round(numZ);
    }

    return { valid: true, error: null, coordinates: result };
  }

  /**
   * Dispatches a validated viewer action to registered ViewerPage handlers.
   */
  dispatch(action, cmdRecord) {
    let handled = false;
    this.viewerHandlers.forEach((handler) => {
      try {
        handler(action, cmdRecord);
        handled = true;
      } catch (err) {
        console.error('[ViewerAdapter] Action execution error:', err);
      }
    });
    return handled;
  }
}

export const viewerAdapter = new ViewerAdapter();

