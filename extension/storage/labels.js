/**
 * @module storage/labels
 * @description High-level persistence API for ManualLabel objects.
 *
 * Handles storage, retrieval, and update of user-created review labels.
 * Ensures at most one label per review exists at any time (upsert semantics).
 *
 * WHY upsert semantics:
 * - A user should only ever have one label per review.
 * - If they change their mind, we update (not create a duplicate).
 * - This keeps the labels store clean and queryable by reviewId.
 */

import { put, get, getAllByIndex, remove } from './indexedDb.js';
import { updateLabel }                      from '../models/label.js';
import { DB }                               from '../utils/constants.js';

const STORE = DB.STORES.LABELS;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Saves a new ManualLabel. Replaces any existing label for the same review.
 *
 * @param {import('../models/label.js').ManualLabel} label
 * @returns {Promise<void>}
 */
export async function saveLabel(label) {
  if (!label?.id || !label.reviewId) {
    throw new Error('[Labels] Cannot save label without id and reviewId.');
  }

  await put(STORE, label);
  console.debug('[Labels] Saved label:', label.id, '→', label.value);
}

/**
 * Retrieves the label for a specific review, if one exists.
 *
 * @param {string} reviewId
 * @returns {Promise<import('../models/label.js').ManualLabel|undefined>}
 */
export async function getLabelForReview(reviewId) {
  if (!reviewId) throw new Error('[Labels] reviewId is required.');

  const results = await getAllByIndex(STORE, 'reviewId', reviewId);
  return results[0]; // at most one label per review
}

/**
 * Retrieves all labels associated with a given product.
 *
 * @param {string} productId
 * @returns {Promise<import('../models/label.js').ManualLabel[]>}
 */
export async function getLabelsForProduct(productId) {
  if (!productId) throw new Error('[Labels] productId is required.');
  return getAllByIndex(STORE, 'productId', productId);
}

/**
 * Updates an existing label's value and/or note.
 * If the label does not exist, throws an error.
 *
 * @param {string} labelId
 * @param {Object} changes
 * @param {string} [changes.value] - New LABEL_VALUES constant.
 * @param {string} [changes.note]  - New note text.
 * @returns {Promise<import('../models/label.js').ManualLabel>} The updated label.
 */
export async function patchLabel(labelId, changes) {
  if (!labelId) throw new Error('[Labels] labelId is required.');

  const existing = await get(STORE, labelId);

  if (!existing) {
    throw new Error(`[Labels] Label not found: ${labelId}`);
  }

  const updated = updateLabel(existing, changes);
  await put(STORE, updated);

  console.debug('[Labels] Updated label:', labelId, '→', updated.value);
  return updated;
}

/**
 * Deletes a label by its ID.
 *
 * @param {string} labelId
 * @returns {Promise<void>}
 */
export async function deleteLabel(labelId) {
  if (!labelId) throw new Error('[Labels] labelId is required.');

  await remove(STORE, labelId);
  console.debug('[Labels] Deleted label:', labelId);
}
