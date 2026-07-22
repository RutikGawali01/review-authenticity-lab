/**
 * @module storage/snapshots
 * @description High-level persistence API for Snapshot objects.
 *
 * Builds on top of the indexedDb abstraction to provide domain-specific
 * snapshot operations. Enforces the retention limit per product and validates
 * data before writing.
 *
 * WHY a separate module from indexedDb.js:
 * - indexedDb.js knows nothing about the Snapshot model.
 * - This module encapsulates snapshot-specific logic (retention, ordering,
 *   productId-based queries) without leaking it into callers.
 */

import {
  put,
  get,
  getAllByIndex,
  remove,
} from './indexedDb.js';
import { DB, LIMITS } from '../utils/constants.js';

const STORE = DB.STORES.SNAPSHOTS;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Persists a Snapshot to IndexedDB.
 * Enforces the per-product retention limit after writing.
 *
 * @param {import('../models/snapshot.js').Snapshot} snapshot
 * @returns {Promise<void>}
 */
export async function saveSnapshot(snapshot) {
  if (!snapshot?.id) {
    throw new Error('[Snapshots] Cannot save snapshot without an id.');
  }

  await put(STORE, snapshot);
  await enforceRetentionLimit(snapshot.productId);

  console.debug('[Snapshots] Saved snapshot:', snapshot.id);
}

/**
 * Retrieves a single Snapshot by its ID.
 *
 * @param {string} snapshotId
 * @returns {Promise<import('../models/snapshot.js').Snapshot|undefined>}
 */
export async function getSnapshot(snapshotId) {
  if (!snapshotId) throw new Error('[Snapshots] snapshotId is required.');
  return get(STORE, snapshotId);
}

/**
 * Retrieves all Snapshots for a given product, sorted from newest to oldest.
 *
 * @param {string} productId
 * @returns {Promise<import('../models/snapshot.js').Snapshot[]>}
 */
export async function getSnapshotsForProduct(productId) {
  if (!productId) throw new Error('[Snapshots] productId is required.');

  const snapshots = await getAllByIndex(STORE, 'productId', productId);

  return snapshots.sort((a, b) => b.capturedAtMs - a.capturedAtMs);
}

/**
 * Retrieves the most recent Snapshot for a given product.
 * Returns undefined if no snapshots exist.
 *
 * @param {string} productId
 * @returns {Promise<import('../models/snapshot.js').Snapshot|undefined>}
 */
export async function getLatestSnapshot(productId) {
  const snapshots = await getSnapshotsForProduct(productId);
  return snapshots[0];
}

/**
 * Deletes a single Snapshot by its ID.
 *
 * @param {string} snapshotId
 * @returns {Promise<void>}
 */
export async function deleteSnapshot(snapshotId) {
  if (!snapshotId) throw new Error('[Snapshots] snapshotId is required.');

  await remove(STORE, snapshotId);
  console.debug('[Snapshots] Deleted snapshot:', snapshotId);
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Enforces the maximum snapshot retention limit per product.
 * Deletes the oldest snapshots when the limit is exceeded.
 *
 * @param {string} productId
 * @returns {Promise<void>}
 */
async function enforceRetentionLimit(productId) {
  const snapshots = await getSnapshotsForProduct(productId);

  if (snapshots.length <= LIMITS.MAX_SNAPSHOTS_PER_PRODUCT) return;

  const toDelete = snapshots.slice(LIMITS.MAX_SNAPSHOTS_PER_PRODUCT);

  for (const snapshot of toDelete) {
    await remove(STORE, snapshot.id);
    console.debug('[Snapshots] Evicted old snapshot:', snapshot.id);
  }
}
