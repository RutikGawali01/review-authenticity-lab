
/**
 * @module analysis/sentiment
 * @description Public API for the sentiment analysis module.
 * Re-exports only what callers need.
 */

export { analyzeSentiment } from './sentimentAnalyzer.js';
export { getClassifier, resetPipeline } from './pipeline.js';
