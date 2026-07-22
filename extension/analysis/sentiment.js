/**
 * @module analysis/sentiment
 * @description Sentiment analysis pipeline using Transformers.js.
 *
 * Classifies the sentiment of a review body as POSITIVE, NEUTRAL, or NEGATIVE
 * and compares it against the review's numeric star rating to detect mismatches
 * (e.g., a 5-star review with overwhelmingly negative language).
 *
 * WHY on-device inference:
 * - No review text ever leaves the user's browser.
 * - No API keys required.
 * - Works offline once the model is cached.
 *
 * Model loading strategy:
 * - The pipeline is initialized lazily on first use.
 * - The module-level singleton prevents redundant model loads across calls.
 * - Transformers.js handles WASM/WebGPU backend selection automatically.
 */

// ─── Type Documentation ───────────────────────────────────────────────────────

/**
 * @typedef {'POSITIVE'|'NEUTRAL'|'NEGATIVE'} SentimentLabel
 */

/**
 * @typedef {Object} SentimentResult
 * @property {string}         reviewId  - ID of the analyzed review.
 * @property {SentimentLabel} label     - Predicted sentiment class.
 * @property {number}         score     - Confidence score in [0, 1].
 * @property {boolean}        mismatch  - True if sentiment conflicts with star rating.
 */

// ─── Pipeline Singleton ───────────────────────────────────────────────────────

/** @type {any|null} Transformers.js pipeline instance. */
let _pipeline = null;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyzes the sentiment of a single review body.
 *
 * @param {import('../models/review.js').Review} review
 * @returns {Promise<SentimentResult>}
 */
export async function analyzeSentiment(review) {
  // TODO(Phase 2): Initialize Transformers.js pipeline and run inference.
  // Stub returns a neutral placeholder so downstream modules don't break.
  return {
    reviewId: review.id,
    label:    'NEUTRAL',
    score:    0,
    mismatch: false,
  };
}

/**
 * Analyzes sentiment for a batch of reviews.
 * Processes sequentially to avoid overwhelming the WASM thread.
 *
 * @param {import('../models/review.js').Review[]} reviews
 * @returns {Promise<SentimentResult[]>}
 */
export async function analyzeBatch(reviews) {
  const results = [];

  for (const review of reviews) {
    try {
      results.push(await analyzeSentiment(review));
    } catch (err) {
      console.error('[Sentiment] Failed to analyze review:', review.id, err);
    }
  }

  return results;
}

/**
 * Pre-initializes the inference pipeline.
 * Call this during extension startup to warm the model before first analysis.
 *
 * @returns {Promise<void>}
 */
export async function warmUp() {
  // TODO(Phase 2): Load and cache the Transformers.js pipeline here.
  console.debug('[Sentiment] warm-up called (stub — no model loaded yet).');
}
