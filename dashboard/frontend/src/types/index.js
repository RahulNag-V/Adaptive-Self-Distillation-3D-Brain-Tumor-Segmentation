/**
 * JSDoc Type Definitions for NeuroSeg 3D
 */

/**
 * @typedef {Object} ModalityUpload
 * @property {File|null} file
 * @property {string} name
 * @property {string} status - 'idle' | 'validating' | 'valid' | 'error'
 * @property {string} [error]
 * @property {number} [size]
 */

/**
 * @typedef {Object} UploadState
 * @property {ModalityUpload} flair
 * @property {ModalityUpload} t1
 * @property {ModalityUpload} t1ce
 * @property {ModalityUpload} t2
 */

/**
 * @typedef {Object} SegmentationMetrics
 * @property {boolean} groundTruthProvided
 * @property {number|null} meanDice
 * @property {number|null} wtDice
 * @property {number|null} tcDice
 * @property {number|null} etDice
 * @property {number|null} meanHd95
 * @property {number|null} wtHd95
 * @property {number|null} tcHd95
 * @property {number|null} etHd95
 */

export const MODALITIES = ['flair', 't1', 't1ce', 't2'];
