/**
 * @module analysis/sentiment/sentimentAnalyzer
 * @description Analyzes the sentiment of a single review text string.
 * Returns a structured { label, confidence } result.
 *
 * This module answers one question: "What is the sentiment of this text?"
 * It does NOT handle mismatch detection, scoring, or aggregation.
 */

import { getClassifier } from './pipeline.js';

/**
 * @typedef {Object} SentimentResult
 * @property {'positive'|'negative'|'neutral'} label      - Predicted sentiment.
 * @property {number}                          confidence  - Score in [0, 1].
 */

/** Minimum confidence threshold below which we label the result 'neutral'. */
const NEUTRAL_THRESHOLD = 0.6;

/**
 * Analyzes the sentiment of a single review text.
 *
 * @param {string} text - The review body to classify.
 * @returns {Promise<SentimentResult>}
 */
export async function analyzeSentiment(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { label: 'neutral', confidence: 0 };
  }

  const classifier = await getClassifier();
  const [result] = await classifier(text.trim());

  return mapResult(result);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Maps raw Transformers.js output to a normalised SentimentResult.
 *
 * The SST-2 model returns { label: 'POSITIVE'|'NEGATIVE', score: number }.
 * If confidence is below the neutral threshold, we map it to 'neutral'.
 *
 * @param {{ label: string, score: number }} raw
 * @returns {SentimentResult}
 */
function mapResult(raw) {
  const score = raw?.score ?? 0;

  if (score < NEUTRAL_THRESHOLD) {
    return { label: 'neutral', confidence: round(score) };
  }

  const label = raw.label === 'POSITIVE' ? 'positive' : 'negative';
  return { label, confidence: round(score) };
}

/**
 * Rounds a number to 4 decimal places for clean output.
 *
 * @param {number} n
 * @returns {number}
 */
function round(n) {
  return Math.round(n * 10000) / 10000;
}
