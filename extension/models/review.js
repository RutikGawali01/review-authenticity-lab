/**
 * @module models/review
 * @description Factory for the Review model.
 * A simplified, canonical representation of a single user-submitted review.
 */

import { generateReviewId, sanitizeText, nowMs } from '../utils/helpers.js';

/**
 * @typedef {Object} Review
 * @property {string}  id               - Deterministic hash of author + body.
 * @property {string}  productId        - Foreign key linking to Product.
 * @property {string}  author           - Reviewer name.
 * @property {string}  body             - Normalized review text.
 * @property {number}  rating           - Numeric score (1-5).
 * @property {number}  dateMs           - UTC timestamp of posting date.
 * @property {boolean} verifiedPurchase - Whether the purchase was verified.
 * @property {number}  helpfulCount     - Number of helpful/up-votes.
 * @property {number}  extractedAtMs    - UTC timestamp of extraction.
 */

/**
 * Creates and validates a frozen Review object.
 *
 * @param {Object} raw
 * @returns {Review|null} Frozen Review object, or null if validation fails.
 */
export function createReview(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const productId = sanitizeText(raw.productId);
  const author = sanitizeText(raw.author);
  const body = sanitizeText(raw.body);

  if (!productId || !author || !body) {
    return null; // Missing essential fields
  }

  const id = raw.id ?? generateReviewId(author, body);
  const rating = normalizeRating(raw.rating);
  
  return Object.freeze({
    id,
    productId,
    author,
    body,
    rating,
    dateMs: raw.dateMs || 0,
    verifiedPurchase: Boolean(raw.verifiedPurchase),
    helpfulCount: normalizeHelpfulCount(raw.helpfulCount),
    extractedAtMs: raw.extractedAtMs ?? nowMs(),
  });
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Normalizes a rating value to a number in [1, 5], defaulting to 0 if invalid.
 * @param {*} value
 * @returns {number}
 */
function normalizeRating(value) {
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(parsed) || parsed < 1 || parsed > 5) return 0;
  return Math.round(parsed * 10) / 10;
}

/**
 * Normalizes a helpful-count value to a non-negative integer.
 * @param {*} value
 * @returns {number}
 */
function normalizeHelpfulCount(value) {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed < 0 ? 0 : parsed;
}
