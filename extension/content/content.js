/**
 * @module content/content
 * @description Content script injected into target e-commerce pages.
 * Listens for review extraction commands and coordinates DOM analysis.
 */

import { extractReviews } from './extractor/index.js';
import { MSG } from '../utils/constants.js';

(function initializeContentScript() {
  const currentUrl = window.location.href;
  const pageTitle = document.title;

  console.log('[Content] Injected successfully into page:', currentUrl);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Content] Received message:', message);

    if (message?.type === MSG.EXTRACT_REVIEWS) {
      try {
        console.log('[Content] Extracting reviews from page...');
        const result = extractReviews(document);
        console.log(`[Content] Extracted ${result.reviewCount} reviews (${result.skippedCount || 0} skipped) in ${result.durationMs}ms.`);

        sendResponse({
          success: result.success,
          type: MSG.REVIEWS_EXTRACTED,
          pageType: result.pageType,
          selectorProfile: result.selectorProfile,
          reviewsCount: result.reviewCount,
          skippedCount: result.skippedCount || 0,
          durationMs: result.durationMs || 0,
          reviews: result.reviews || [],
          url: currentUrl,
          pageTitle,
        });
      } catch (err) {
        console.error('[Content] Review extraction error:', err);
        sendResponse({
          success: false,
          error: err.message || 'Review extraction failed.',
        });
      }
    }

    return true;
  });
})();
