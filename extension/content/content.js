/**
 * @module content/content
 * @description Content script injected into target e-commerce pages.
 * Handles PING handshake, waits for review containers, performs DOM-based review extraction/pagination,
 * and returns payload response to Background worker.
 */

import { extractReviews } from './extractor/index.js';
import { getNextPageUrl, paginateReviewPage } from './pagination/paginator.js';
import { detectAmazonPageType } from '../utils/helpers.js';
import { MSG, AMAZON_PAGE_TYPES } from '../utils/constants.js';
import { waitForReviewContainers } from './utils/domReady.js';

(function initializeContentScript() {
  console.log('[Content] Injected successfully into page:', window.location.href);

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Content] Received message:', message?.type);

    if (message?.type === MSG.PING) {
      sendResponse({
        success: true,
        payload: { status: 'READY', url: window.location.href },
      });
      return false;
    }

    if (message?.type === MSG.EXTRACT_REVIEWS) {
      handleExtractionMessage(message)
        .then((response) => sendResponse(response))
        .catch((err) => {
          console.error('[Content] Review extraction error:', err);
          sendResponse({ success: false, error: err.message || 'Review extraction failed.' });
        });
      return true; // Keep message channel open for async response
    }

    return false;
  });
})();

/**
 * Handles extraction request: waits for containers, executes DOM pagination on Review Pages,
 * or discovers transition link on Product Pages.
 */
async function handleExtractionMessage(message) {
  const currentUrl = window.location.href;
  const pageTitle = document.title;
  const pageType = detectAmazonPageType(currentUrl);

  console.log(`[Content] Page type: ${pageType} | Processing extraction request...`);

  // Wait for review containers to exist in DOM (timeout = 8s)
  await waitForReviewContainers(document, 8000, 200);

  if (pageType === AMAZON_PAGE_TYPES.REVIEWS_PAGE) {
    console.log('[Content] Review Page detected. Executing DOM-based pagination...');
    const maxReviews = message?.maxReviews;
    const paginationResult = await paginateReviewPage(document, maxReviews);

    return {
      success: paginationResult.success,
      type: MSG.REVIEWS_EXTRACTED,
      pageType,
      selectorProfile: paginationResult.profileName || 'AMAZON.REVIEWS_PAGE',
      reviewsCount: paginationResult.reviewCount,
      skippedCount: 0,
      durationMs: 0,
      reviews: paginationResult.reviews || [],
      nextPageUrl: null, // DOM pagination complete on Review Page
      url: currentUrl,
      pageTitle,
    };
  }

  // Handle Product Page or default DOM extraction
  const maxRetries = 3;
  let result = extractReviews(document);

  let retry = 0;
  while (result.reviewCount === 0 && retry < maxRetries) {
    retry++;
    console.log(`[Content] Retry ${retry}/${maxRetries}`);
    await waitForReviewContainers(document, 2000, 200);
    result = extractReviews(document);
  }

  if (result.reviewCount === 0) {
    console.log('[Content] Extraction returned zero reviews after retries');
  }

  const nextPageUrl = getNextPageUrl(document, pageType, currentUrl);
  console.log(`[Content] Extracted ${result.reviewCount} reviews from current DOM. Next page transition URL: ${nextPageUrl || 'None'}`);

  return {
    success: result.success,
    type: MSG.REVIEWS_EXTRACTED,
    pageType,
    selectorProfile: result.selectorProfile,
    reviewsCount: result.reviewCount,
    skippedCount: result.skippedCount || 0,
    durationMs: result.durationMs || 0,
    reviews: result.reviews || [],
    nextPageUrl,
    url: currentUrl,
    pageTitle,
  };
}
