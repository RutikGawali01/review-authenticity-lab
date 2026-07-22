/**
 * @module models/label
 * @description Factory and type definition for the ManualLabel data model.
 *
 * A ManualLabel represents a user's manual classification of a single review.
 * Labels are stored separately from reviews and snapshots, allowing users to
 * build a personal ground-truth dataset without mutating the extracted review data.
 *
 * WHY store labels separately:
 * - Reviews are immutable once extracted (frozen objects).
 * - A label is a user opinion, not a fact about the review itself.
 * - Separating them allows labels to be exported independently for ML training.
 */

import { nowMs } from '../utils/helpers.js';

// ─── Type Documentation ───────────────────────────────────────────────────────

/** Valid label values for a ManualLabel. */
export const LABEL_VALUES = Object.freeze({
  SUSPICIOUS:  'suspicious',
  LEGITIMATE:  'legitimate',
  UNCERTAIN:   'uncertain',
});

/**
 * @typedef {Object} ManualLabel
 * @property {string} id          - Unique label ID.
 * @property {string} reviewId    - ID of the labeled Review.
 * @property {string} productId   - ID of the product the review belongs to.
 * @property {string} platform    - PLATFORMS constant.
 * @property {string} value       - LABEL_VALUES constant.
 * @property {string} [note]      - Optional free-text note from the user.
 * @property {number} createdAtMs - UTC timestamp when the label was created.
 * @property {number} updatedAtMs - UTC timestamp of the last update.
 */

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates a frozen ManualLabel object.
 *
 * @param {Object} opts
 * @param {string} opts.reviewId  - ID of the Review being labeled.
 * @param {string} opts.productId - Product the review belongs to.
 * @param {string} opts.platform  - PLATFORMS constant.
 * @param {string} opts.value     - One of LABEL_VALUES.
 * @param {string} [opts.note]    - Optional user note.
 * @returns {ManualLabel}
 */
export function createLabel({ reviewId, productId, platform, value, note = '' }) {
  if (!reviewId || !productId || !platform) {
    throw new Error('[Label] reviewId, productId, and platform are required.');
  }

  if (!Object.values(LABEL_VALUES).includes(value)) {
    throw new Error(`[Label] Invalid label value: "${value}". Expected one of: ${Object.values(LABEL_VALUES).join(', ')}`);
  }

  const now = nowMs();

  return Object.freeze({
    id:          generateLabelId(reviewId, now),
    reviewId,
    productId,
    platform,
    value,
    note:        String(note ?? '').trim(),
    createdAtMs: now,
    updatedAtMs: now,
  });
}

/**
 * Returns a new frozen ManualLabel with an updated value, note, and updatedAtMs.
 * Preserves the original id and createdAtMs.
 *
 * @param {ManualLabel} existing - The label to update.
 * @param {Object}      changes
 * @param {string}      [changes.value] - New label value.
 * @param {string}      [changes.note]  - New note.
 * @returns {ManualLabel}
 */
export function updateLabel(existing, changes) {
  if (!existing || !existing.id) {
    throw new Error('[Label] updateLabel requires an existing ManualLabel.');
  }

  const newValue = changes.value ?? existing.value;

  if (!Object.values(LABEL_VALUES).includes(newValue)) {
    throw new Error(`[Label] Invalid label value: "${newValue}".`);
  }

  return Object.freeze({
    ...existing,
    value:       newValue,
    note:        changes.note !== undefined ? String(changes.note).trim() : existing.note,
    updatedAtMs: nowMs(),
  });
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Generates a unique label ID from a review ID and creation timestamp.
 *
 * @param {string} reviewId
 * @param {number} timestampMs
 * @returns {string}
 */
function generateLabelId(reviewId, timestampMs) {
  return `label_${reviewId}_${timestampMs}`;
}
