/**
 * @module models/review
 * @description Factory and type definition for the canonical Review data model.
 *
 * A Review represents a single user-submitted product review as extracted from
 * a supported platform. All downstream modules (analysis, storage, UI) operate
 * exclusively on objects produced by `createReview()`.
 *
 * WHY a factory instead of a class:
 * - Plain objects are trivially JSON-serializable → safe for IndexedDB storage.
 * - No prototype chain means no hidden behavior.
 * - Object.freeze enforces immutability during development.
 */

import { generateReviewId, sanitizeText, nowMs } from '../utils/helpers.js';
import { PLATFORMS } from '../utils/constants.js';

// ─── Type Documentation ───────────────────────────────────────────────────────

/**
 * @typedef {Object} Review
 * @property {string}      id            - Deterministic ID derived from author + body.
 * @property {string}      platform      - PLATFORMS constant (e.g. 'amazon').
 * @property {string}      productId     - Platform-specific product identifier.
 * @property {string}      author        - Display name of the reviewer.
 * @property {string}      authorUrl     - Profile URL of the reviewer (may be empty).
 * @property {string}      body          - Full review text.
 * @property {number|null} rating        - Numeric rating (1–5), null if not found.
 * @property {string}      ratingRaw     - Raw rating string as scraped from DOM.
 * @property {number|null} dateMs        - UTC timestamp of review date, null if unparseable.
 * @property {string}      dateRaw       - Raw date string as scraped from DOM.
 * @property {boolean}     verifiedPurchase - True if the review is marked as verified.
 * @property {number}      helpfulCount  - Number of "helpful" votes.
 * @property {string}      sourceUrl     - The page URL from which this review was extracted.
 * @property {number}      extractedAtMs - UTC timestamp when the review was extracted.
 */

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Creates and validates a frozen Review object.
 * Sanitizes all string inputs. Returns null if required fields are missing.
 *
 * @param {Partial<Review>} raw - Raw data from an extractor.
 * @returns {Review|null} Frozen Review object, or null if validation fails.
 */
export function createReview(raw) {
  if (!raw || typeof raw !== 'object') {
    console.warn('[Review] createReview called with non-object input:', raw);
    return null;
  }

  const body   = sanitizeText(raw.body);
  const author = sanitizeText(raw.author);

  if (!body) {
    console.debug('[Review] Skipping review with empty body.');
    return null;
  }

  const platform  = raw.platform ?? PLATFORMS.UNKNOWN;
  const productId = sanitizeText(raw.productId) || '__unknown__';
  const id        = raw.id ?? generateReviewId(author, body);

  return Object.freeze({
    id,
    platform,
    productId,
    author:           author || 'Anonymous',
    authorUrl:        sanitizeText(raw.authorUrl),
    body,
    rating:           normalizeRating(raw.rating),
    ratingRaw:        sanitizeText(raw.ratingRaw),
    dateMs:           raw.dateMs ?? null,
    dateRaw:          sanitizeText(raw.dateRaw),
    verifiedPurchase: Boolean(raw.verifiedPurchase),
    helpfulCount:     normalizeHelpfulCount(raw.helpfulCount),
    sourceUrl:        sanitizeText(raw.sourceUrl),
    extractedAtMs:    raw.extractedAtMs ?? nowMs(),
  });
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Normalizes a rating value to a number in [1, 5], or null if invalid.
 *
 * @param {*} value
 * @returns {number|null}
 */
function normalizeRating(value) {
  if (value === null || value === undefined) return null;

  const parsed = typeof value === 'number' ? value : parseFloat(value);

  if (isNaN(parsed) || parsed < 1 || parsed > 5) return null;
  return Math.round(parsed * 10) / 10; // keep one decimal
}

/**
 * Normalizes a helpful-count value to a non-negative integer.
 *
 * @param {*} value
 * @returns {number}
 */
function normalizeHelpfulCount(value) {
  if (value === null || value === undefined) return 0;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed < 0 ? 0 : parsed;
}
