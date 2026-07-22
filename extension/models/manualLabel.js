/**
 * @module models/manualLabel
 * @description Factory for the ManualLabel model.
 * Stores user feedback on a review's authenticity, kept separate from the immutable Review object.
 */

import { nowMs } from '../utils/helpers.js';

export const LABEL_VALUES = Object.freeze({
  SUSPICIOUS:  'suspicious',
  LEGITIMATE:  'legitimate',
  UNCERTAIN:   'uncertain',
});

/**
 * @typedef {Object} ManualLabel
 * @property {string} id          - Unique identifier.
 * @property {string} reviewId    - Foreign key to the Review being labeled.
 * @property {string} value       - 'suspicious', 'legitimate', or 'uncertain'.
 * @property {string} note        - Optional user notes.
 * @property {number} updatedAtMs - UTC timestamp of last update.
 */

/**
 * Creates and validates a frozen ManualLabel object.
 *
 * @param {Object} raw
 * @returns {ManualLabel|null} Frozen ManualLabel object, or null if validation fails.
 */
export function createManualLabel(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.reviewId || !Object.values(LABEL_VALUES).includes(raw.value)) return null;

  const now = nowMs();

  return Object.freeze({
    id: raw.id ? String(raw.id).trim() : `lbl_${raw.reviewId}_${now}`,
    reviewId: String(raw.reviewId).trim(),
    value: raw.value,
    note: raw.note ? String(raw.note).trim() : '',
    updatedAtMs: raw.updatedAtMs ?? now,
  });
}
