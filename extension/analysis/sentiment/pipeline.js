/**
 * @module analysis/sentiment/pipeline
 * @description Lazy singleton for the Transformers.js sentiment-analysis pipeline.
 * Loads the model once on first call and caches the instance for reuse.
 *
 * Why a separate file: isolates model lifecycle from analysis logic.
 * Callers never import Transformers.js directly.
 */

import { pipeline } from '@huggingface/transformers';

/**
 * Small, fast distilled sentiment model.
 * ~67 MB quantized — downloads once, cached by Transformers.js in browser storage.
 */
const MODEL_NAME = 'Xenova/distilbert-base-uncased-finetuned-sst-2-english';

/** @type {Promise<any>|null} Cached pipeline promise (singleton). */
let classifierPromise = null;

/**
 * Returns the cached sentiment-analysis pipeline, loading it on first call.
 * Subsequent calls return the same promise — no duplicate model loads.
 *
 * If loading fails, the cache is reset so the next call retries.
 *
 * @returns {Promise<any>} Transformers.js pipeline instance.
 */
export function getClassifier() {
  if (classifierPromise) return classifierPromise;

  console.debug('[SentimentPipeline] Loading model…', MODEL_NAME);

  classifierPromise = pipeline('sentiment-analysis', MODEL_NAME)
    .then((instance) => {
      console.debug('[SentimentPipeline] Model loaded successfully.');
      return instance;
    })
    .catch((err) => {
      classifierPromise = null; // Allow retry on next call.
      throw new Error(`[SentimentPipeline] Failed to load model: ${err.message}`);
    });

  return classifierPromise;
}

/**
 * Resets the cached pipeline. Useful for tests or teardown.
 */
export function resetPipeline() {
  classifierPromise = null;
}
