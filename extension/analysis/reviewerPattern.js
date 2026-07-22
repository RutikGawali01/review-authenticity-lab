/**
 * @module analysis/reviewerPattern
 * @description Detects suspicious reviewer behavioral patterns.
 *
 * Fake review networks often use the same accounts across multiple products,
 * or create accounts that only ever review one product. This module analyzes
 * reviewer metadata to surface such patterns.
 *
 * Signals detected:
 * - Single-review accounts (reviewer has no review history outside this product)
 * - Reviewers who appear multiple times on the same product
 * - Brand-new reviewer accounts (account creation date very close to review date)
 *
 * WHY without a database:
 * - We can only analyze what we extract from the current page.
 * - Cross-product reviewer analysis is out of scope without a server.
 * - Within a single product's review set, we can still surface duplicates
 *   and single-review account patterns.
 */

import { SIGNALS, SEVERITY } from '../utils/constants.js';
import { groupBy }            from '../utils/helpers.js';

// ─── Type Documentation ───────────────────────────────────────────────────────

/**
 * @typedef {Object} ReviewerSignal
 * @property {string} type      - Always SIGNALS.REVIEWER_PATTERN.
 * @property {string} reviewId  - ID of the flagged review.
 * @property {string} severity  - SEVERITY constant.
 * @property {string} rationale - Human-readable explanation.
 * @property {Object} detail
 * @property {string} detail.author        - The reviewer's name.
 * @property {string} detail.patternType   - Type of pattern detected.
 * @property {number} [detail.reviewCount] - How many reviews this author left.
 */

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyzes reviewer metadata across a set of reviews and returns
 * ReviewerSignal objects for suspicious patterns.
 *
 * @param {import('../models/review.js').Review[]} reviews
 * @returns {ReviewerSignal[]}
 */
export function detectReviewerPatterns(reviews) {
  if (!reviews?.length) return [];

  const signals = [];

  signals.push(...detectDuplicateAuthors(reviews));

  // TODO(Phase 2): Detect single-review accounts using authorUrl cross-referencing.
  // TODO(Phase 2): Detect new-account patterns using account-creation date metadata.

  return signals;
}

// ─── Private Detectors ────────────────────────────────────────────────────────

/**
 * Flags authors who appear more than once in the same review set.
 * An author leaving multiple reviews for a product is inherently suspicious.
 *
 * @param {import('../models/review.js').Review[]} reviews
 * @returns {ReviewerSignal[]}
 */
function detectDuplicateAuthors(reviews) {
  const byAuthor = groupBy(reviews, 'author');
  const signals  = [];

  for (const [author, authorReviews] of Object.entries(byAuthor)) {
    if (authorReviews.length < 2) continue;
    if (author === 'Anonymous') continue; // too noisy

    for (const review of authorReviews) {
      signals.push({
        type:      SIGNALS.REVIEWER_PATTERN,
        reviewId:  review.id,
        severity:  SEVERITY.HIGH,
        rationale: `Author "${author}" left ${authorReviews.length} reviews for this product.`,
        detail: {
          author,
          patternType:  'duplicate_author',
          reviewCount:  authorReviews.length,
        },
      });
    }
  }

  return signals;
}
