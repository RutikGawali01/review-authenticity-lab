/**
 * @module models/signalResult
 * @description Factory for the SignalResult model.
 * Stores the result of an anomaly detection rule executed against a review.
 */

/**
 * @typedef {Object} SignalResult
 * @property {string} id         - Unique identifier.
 * @property {string} reviewId   - Foreign key to the Review being flagged.
 * @property {string} signalType - Type of anomaly (e.g., 'sentiment_mismatch').
 * @property {string} severity   - 'low', 'medium', or 'high'.
 * @property {number} confidence - Certainty score from 0.0 to 1.0.
 * @property {string} rationale  - Human-readable explanation for the UI.
 */

/**
 * Creates and validates a frozen SignalResult object.
 *
 * @param {Object} raw
 * @returns {SignalResult|null} Frozen SignalResult object, or null if validation fails.
 */
export function createSignalResult(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!raw.reviewId || !raw.signalType || !raw.rationale) return null;

  const severity = ['low', 'medium', 'high'].includes(raw.severity) ? raw.severity : 'medium';
  
  // Normalize confidence to 0.0 - 1.0 range
  let confidence = parseFloat(raw.confidence);
  if (isNaN(confidence) || confidence < 0) confidence = 0;
  if (confidence > 1) confidence = 1;

  return Object.freeze({
    id: raw.id ? String(raw.id).trim() : `sig_${raw.reviewId}_${Date.now()}`,
    reviewId: String(raw.reviewId).trim(),
    signalType: String(raw.signalType).trim(),
    severity,
    confidence,
    rationale: String(raw.rationale).trim(),
  });
}
