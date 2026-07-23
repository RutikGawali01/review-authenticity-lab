/**
 * @module services/snapshotService
 * @description Constructs Snapshot records from analysis results and
 * persists or retrieves them via the storage layer.
 * Keeps all snapshot-building logic out of UI components.
 */

import { saveSnapshot, getAllSnapshots } from '../../extension/storage/index.js';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Builds a validated Snapshot record and persists it to IndexedDB.
 *
 * @param {Object} product - { title, url, platform, image, price }
 * @param {Object[]} reviews - Review objects from the analysis result.
 * @returns {Promise<string>} The generated snapshot id.
 * @throws Rethrows storage errors so the caller can update UI state.
 */
export async function createAndSaveSnapshot(product, reviews) {
  const reviewsCopy = [...reviews]; // never mutate the caller's array

  const snapshot = {
    id:          generateId(),
    product:     normalizeProduct(product),
    timestamp:   Date.now(),
    reviewCount: reviewsCopy.length,
    reviews:     reviewsCopy,
  };

  await saveSnapshot(snapshot);
  console.debug(`[SnapshotService] Saved snapshot id="${snapshot.id}", reviews=${snapshot.reviewCount}`);
  return snapshot.id;
}

/**
 * Loads all stored snapshots sorted newest first.
 * Returns metadata only — reviews are intentionally excluded to keep
 * memory usage low until a full snapshot is explicitly requested.
 *
 * @returns {Promise<Array<{ id: string, product: Object, timestamp: number, reviewCount: number }>>}
 */
export async function loadSnapshots() {
  const all = await getAllSnapshots();
  return all.map(toMetadata).sort(byNewestFirst);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generates a unique snapshot ID.
 * crypto.randomUUID() is always available in MV3 extension contexts;
 * the fallback exists only for non-browser test environments.
 *
 * @returns {string}
 */
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Returns a product record conforming to the snapshot schema.
 * Missing fields default to empty string.
 *
 * @param {Object} product
 * @returns {{ title: string, url: string, platform: string, image: string, price: string }}
 */
function normalizeProduct(product) {
  const src = product ?? {};
  return {
    title:    src.title    ?? '',
    url:      src.url      ?? '',
    platform: src.platform ?? '',
    image:    src.image    ?? '',
    price:    src.price    ?? '',
  };
}

/**
 * Strips the reviews array from a snapshot, returning only metadata fields.
 *
 * @param {Object} snapshot
 * @returns {{ id: string, product: Object, timestamp: number, reviewCount: number }}
 */
function toMetadata({ id, product, timestamp, reviewCount }) {
  return { id, product, timestamp, reviewCount };
}

/**
 * Array comparator: descending by timestamp (newest first).
 */
function byNewestFirst(a, b) {
  return b.timestamp - a.timestamp;
}
