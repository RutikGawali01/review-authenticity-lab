// /**
//  * @module analysis/pipeline/reviewAnalysisPipeline
//  * @description Orchestrates the review analysis process.
//  * Takes raw extracted reviews and sequentially enriches them with signals
//  * (currently only sentiment) while preserving the original immutable data.
//  */

// import { analyzeSentiment } from '../sentiment/index.js';
// import { detectRatingMismatch } from '../detectors/ratingMismatch/index.js';
// import { detectDuplicates } from '../detectors/duplicateDetection/index.js';
// import { detectReviewerPattern } from '../detectors/reviewerPattern/index.js';

// /**
//  * @typedef {import('../../models/review.js').Review} Review
//  * 
//  * @typedef {Object} SentimentData
//  * @property {'positive'|'negative'|'neutral'} label
//  * @property {number} confidence
//  * 
//  * @typedef {import('../detectors/ratingMismatch/index.js').RatingMismatchResult} RatingMismatchResult
//  * @typedef {import('../detectors/duplicateDetection/index.js').DuplicateDetectionResult} DuplicateDetectionResult
//  * @typedef {import('../detectors/reviewerPattern/index.js').ReviewerPatternResult} ReviewerPatternResult
//  * 
//  * @typedef {Review & { sentiment: SentimentData, ratingMismatch?: RatingMismatchResult, duplicateDetection?: DuplicateDetectionResult, reviewerPattern?: ReviewerPatternResult }} AnalyzedReview
//  */

// /**
//  * Enriches a collection of raw reviews with sentiment analysis.
//  * Processes reviews sequentially to maintain clean, readable async flow and
//  * avoid overwhelming the on-device inference pipeline.
//  *
//  * @param {Review[]} reviews - The raw extracted reviews.
//  * @returns {Promise<AnalyzedReview[]>} A new array of enriched reviews.
//  */
// export async function analyzeReviews(reviews) {
//   if (!Array.isArray(reviews)) {
//     console.warn('[ReviewAnalysisPipeline] Expected an array of reviews, received:', typeof reviews);
//     return [];
//   }

//   console.log('[Background] Starting sentiment analysis...');

//   const analyzedReviews = [];

//   for (const rawReview of reviews) {
//     const id = rawReview.id || rawReview.reviewId || '';
//     const body = rawReview.body || rawReview.reviewText || '';
//     const author = rawReview.author || rawReview.reviewer || '';
//     const rating = rawReview.rating ?? 0;

//     const normalizedReview = {
//       ...rawReview,
//       id,
//       body,
//       author,
//       rating,
//     };

//     // 1. Analyze Sentiment
//     let sentiment;
//     try {
//       sentiment = await analyzeSentiment(body);
//     } catch (err) {
//       console.error(`[ReviewAnalysisPipeline] Failed to analyze sentiment for review ${id}:`, err);
//       // Safe fallback: assume neutral sentiment rather than failing the whole batch
//       sentiment = { label: 'neutral', confidence: 0 };
//     }

//     // 2. Detect Rating-Text Mismatch based on sentiment
//     const ratingMismatch = detectRatingMismatch(rating, sentiment);

//     // 3. Normalize Reviewer Metadata pattern
//     const reviewerPattern = detectReviewerPattern(normalizedReview);

//     // Attach sentiment, mismatch, and reviewer pattern signals
//     analyzedReviews.push({
//       ...normalizedReview,
//       sentiment,
//       ratingMismatch,
//       reviewerPattern,
//     });
//   }

//   console.log('[Background] Rating mismatch completed');

//   // 4. Detect duplicate and templated reviews across the entire batch
//   const duplicateResults = detectDuplicates(analyzedReviews);
  
//   // Attach clustering results
//   for (const review of analyzedReviews) {
//     review.duplicateDetection = duplicateResults.get(review.id) ?? { detected: false };
//   }

//   console.log('[Background] Duplicate detection completed');
//   console.log('[Background] Reviewer analysis completed');

//   return analyzedReviews;
// }


export async function analyzeReviews(reviews) {
  console.log("[Pipeline] Loaded");
  return reviews;
}