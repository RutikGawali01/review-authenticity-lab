/**
 * @module analysis/duplicateDetector
 * @description Detects near-duplicate and verbatim duplicate reviews.
 *
 * Fake review operations often submit the same review text (or slightly
 * paraphrased versions) across many accounts. This module identifies such
 * clusters using Jaccard similarity on word n-grams.
 *
 * Algorithm:
 * 1. Tokenize each review body into a set of word trigrams (3-word sequences).
 * 2. For each pair of reviews, compute Jaccard similarity:
 *      J(A, B) = |A ∩ B| / |A ∪ B|
 * 3. Flag pairs above LIMITS.DUPLICATE_SIMILARITY_THRESHOLD.
 *
 * WHY Jaccard on trigrams:
 * - Robust to minor paraphrasing (word substitutions, reordering).
 * - Much faster than edit distance (O(n²) comparisons, but O(1) per pair
 *   using set operations on pre-computed fingerprints).
 * - No ML model required — runs synchronously.
 */

import { SIGNALS, SEVERITY, LIMITS } from '../utils/constants.js';

// ─── Type Documentation ───────────────────────────────────────────────────────

/**
 * @typedef {Object} DuplicateSignal
 * @property {string} type      - Always SIGNALS.DUPLICATE_REVIEW.
 * @property {string} reviewId  - ID of the flagged review.
 * @property {string} severity  - SEVERITY constant.
 * @property {string} rationale - Human-readable explanation.
 * @property {Object} detail
 * @property {string} detail.matchedReviewId - ID of the similar review.
 * @property {number} detail.similarity      - Jaccard score in [0, 1].
 */

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Scans a list of reviews for near-duplicate text.
 * Returns one signal per flagged (review, match) pair.
 *
 * @param {import('../models/review.js').Review[]} reviews
 * @returns {DuplicateSignal[]}
 */
export function detectDuplicates(reviews) {
  if (reviews.length < 2) return [];

  // TODO(Phase 2): Implement trigram fingerprinting + Jaccard comparison.
  // For now, return empty array — no false positives from stub.
  return [];
}

// ─── Private Helpers (stubs for Phase 2) ─────────────────────────────────────

/**
 * Tokenizes a review body into a Set of word trigrams.
 *
 * @param {string} body
 * @returns {Set<string>}
 */
function buildTrigrams(body) {
  const words  = body.toLowerCase().split(/\s+/).filter(Boolean);
  const grams  = new Set();

  for (let i = 0; i < words.length - 2; i++) {
    grams.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }

  return grams;
}

/**
 * Computes Jaccard similarity between two sets.
 *
 * @param {Set<string>} a
 * @param {Set<string>} b
 * @returns {number} Score in [0, 1].
 */
function jaccardSimilarity(a, b) {
  if (a.size === 0 && b.size === 0) return 1;

  const intersection = new Set([...a].filter(x => b.has(x)));
  const union        = new Set([...a, ...b]);

  return intersection.size / union.size;
}
