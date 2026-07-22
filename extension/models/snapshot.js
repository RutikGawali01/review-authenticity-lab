/**
 * @module models/snapshot
 * @description Factory and type definition for the Snapshot data model.
 *
 * A Snapshot represents the complete set of reviews captured from a product page
 * at a specific point in time. Snapshots are the primary unit of persistence in
 * IndexedDB and the foundation for time-series analysis (detecting review bursts,
 * deletions, and rating manipulation over days/weeks).
 *
 * WHY Snapshot as a separate model from Review:
 * - A product can be analyzed multiple times. Each analysis run produces a new
 *   snapshot, enabling temporal comparison.
 * - Snapshots aggregate metadata (total count, average rating) that would be
 *   expensive to recompute from individual reviews each time.
 */

import { nowMs, toIsoDate } from '../utils/helpers.js';

// ─── Type Documentation ───────────────────────────────────────────────────────

/**
 * @typedef {Object} SnapshotMeta
 * @property {number}      totalReviews    - Total reviews in this snapshot.
 * @property {number|null} averageRating   - Mean rating across all reviews (null if no ratings).
 * @property {number}      verifiedCount   - Count of verified-purchase reviews.
 * @property {Object}      ratingBreakdown - Map of rating (1–5) to count.
 * @property {number}      ratingBreakdown[1]
 * @property {number}      ratingBreakdown[2]
 * @property {number}      ratingBreakdown[3]
 * @property {number}      ratingBreakdown[4]
 * @property {number}      ratingBreakdown[5]
 */

/**
 * @typedef {Object} Snapshot
 * @property {string}       id            - Unique snapshot ID.
 * @property {string}       productId     - Platform-specific product identifier.
 * @property {string}       platform      - PLATFORMS constant.
 * @property {string}       productUrl    - URL of the product page.
 * @property {string}       productTitle  - Title of the product (if extractable).
 * @property {string[]}     reviewIds     - Ordered list of Review IDs in this snapshot.
 * @property {SnapshotMeta} meta          - Aggregate statistics.
 * @property {number}       capturedAtMs  - UTC timestamp when the snapshot was taken.
 * @property {string}       capturedAtIso - ISO 8601 representation of capturedAtMs.
 * @property {string|null}  analysisId    - ID of the associated analysis run, if complete.
 */

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates a frozen Snapshot from a product URL, platform, and an array of Reviews.
 *
 * @param {Object}   opts
 * @param {string}   opts.productId    - Platform-specific product ID.
 * @param {string}   opts.platform     - PLATFORMS constant.
 * @param {string}   opts.productUrl   - Source URL.
 * @param {string}   [opts.productTitle] - Product display name.
 * @param {import('./review.js').Review[]} opts.reviews - Extracted reviews.
 * @returns {Snapshot}
 */
export function createSnapshot({ productId, platform, productUrl, productTitle = '', reviews }) {
  if (!productId || !platform || !productUrl) {
    throw new Error('[Snapshot] productId, platform, and productUrl are required.');
  }

  if (!Array.isArray(reviews)) {
    throw new Error('[Snapshot] reviews must be an array.');
  }

  const capturedAtMs = nowMs();
  const id           = generateSnapshotId(productId, capturedAtMs);

  return Object.freeze({
    id,
    productId,
    platform,
    productUrl,
    productTitle,
    reviewIds:    Object.freeze(reviews.map(r => r.id)),
    meta:         Object.freeze(computeMeta(reviews)),
    capturedAtMs,
    capturedAtIso: toIsoDate(capturedAtMs),
    analysisId:   null,
  });
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Generates a snapshot ID from a product ID and timestamp.
 * Format: snap_<productId-hash>_<timestamp>
 *
 * @param {string} productId
 * @param {number} timestampMs
 * @returns {string}
 */
function generateSnapshotId(productId, timestampMs) {
  return `snap_${productId}_${timestampMs}`;
}

/**
 * Computes aggregate statistics from an array of Review objects.
 *
 * @param {import('./review.js').Review[]} reviews
 * @returns {SnapshotMeta}
 */
function computeMeta(reviews) {
  const ratingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingSum         = 0;
  let ratingCount       = 0;
  let verifiedCount     = 0;

  for (const review of reviews) {
    if (review.verifiedPurchase) verifiedCount++;

    if (review.rating !== null) {
      const bucket = Math.round(review.rating);
      if (bucket >= 1 && bucket <= 5) {
        ratingBreakdown[bucket]++;
        ratingSum += review.rating;
        ratingCount++;
      }
    }
  }

  return {
    totalReviews:    reviews.length,
    averageRating:   ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 100) / 100 : null,
    verifiedCount,
    ratingBreakdown: Object.freeze(ratingBreakdown),
  };
}
