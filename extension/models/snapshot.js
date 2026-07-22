/**
 * @module models/snapshot
 * @description Factory for the Snapshot model.
 * Groups a set of reviews captured at a specific point in time.
 */

import { nowMs } from '../utils/helpers.js';

/**
 * @typedef {Object} SnapshotMetrics
 * @property {number} totalReviews  - Number of reviews in this snapshot.
 * @property {number} averageRating - Mean rating across all reviews.
 */

/**
 * @typedef {Object} Snapshot
 * @property {string}          id           - Unique identifier (e.g. snap_<productId>_<timestamp>).
 * @property {string}          productId    - Foreign key linking to Product.
 * @property {string[]}        reviewIds    - Array of associated Review IDs.
 * @property {number}          capturedAtMs - UTC timestamp of capture.
 * @property {SnapshotMetrics} metrics      - Simple metrics summary.
 */

/**
 * Creates and validates a frozen Snapshot object.
 *
 * @param {Object} raw
 * @returns {Snapshot|null} Frozen Snapshot object, or null if validation fails.
 */
export function createSnapshot(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.productId || !Array.isArray(raw.reviewIds)) return null;

  const capturedAtMs = raw.capturedAtMs ?? nowMs();
  const id = raw.id ?? `snap_${raw.productId}_${capturedAtMs}`;

  return Object.freeze({
    id,
    productId: String(raw.productId).trim(),
    reviewIds: Object.freeze([...raw.reviewIds]),
    capturedAtMs,
    metrics: Object.freeze({
      totalReviews: raw.metrics?.totalReviews || 0,
      averageRating: raw.metrics?.averageRating || 0,
    })
  });
}
