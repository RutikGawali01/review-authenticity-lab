/**
 * @module content/content
 * @description Content script entry point and coordinator.
 *
 * This is the only module injected directly into the page as a content script.
 * It orchestrates the other content modules (extractor, pageObserver, pagination)
 * and handles all communication with the background service worker.
 *
 * Responsibilities:
 * - Detect the platform on page load.
 * - Notify background that a supported page is active.
 * - Listen for EXTRACT_NOW commands from background.
 * - Coordinate extraction + normalization + messaging.
 * - Restart the MutationObserver after extraction to watch for pagination changes.
 *
 * What this module does NOT do:
 * - Perform analysis (analysis/ modules).
 * - Write to storage directly (storage/ modules).
 * - Render any UI.
 *
 * NOTE: Chrome MV3 content scripts support ES modules via "type": "module" in
 * manifest content_scripts, but only when loaded via the manifest (not injected
 * programmatically). We rely on declarative injection.
 */

import { MSG, ANALYSIS_STATUS, LIMITS } from '../utils/constants.js';
import { detectPlatform, isSupportedPage, uniqueBy, nowMs } from '../utils/helpers.js';
import { createReview }      from '../models/review.js';
import { extractRawReviews, extractProductId, extractProductTitle } from './extractor.js';
import { startObserving, stopObserving } from './pageObserver.js';
import { getPaginationState }            from './pagination.js';

// ─── Initialization ───────────────────────────────────────────────────────────

const currentUrl = window.location.href;

if (!isSupportedPage(currentUrl)) {
  console.debug('[Content] Page is not a supported review platform. Exiting.');
} else {
  initialize();
}

// ─── Core Logic ───────────────────────────────────────────────────────────────

/**
 * Initializes the content script on a supported page.
 * Sets up message listeners and notifies the background worker.
 */
function initialize() {
  const platform = detectPlatform(currentUrl);

  console.debug('[Content] Initialized on platform:', platform, 'URL:', currentUrl);

  notifyPageDetected(platform);
  registerMessageListeners(platform);
  startObserving(() => handleDomChange(platform));
}

/**
 * Sends a PAGE_DETECTED message to the background service worker,
 * providing the platform and product context.
 *
 * @param {string} platform
 */
function notifyPageDetected(platform) {
  const productId    = extractProductId(platform);
  const productTitle = extractProductTitle(platform);
  const pagination   = getPaginationState(platform);

  chrome.runtime.sendMessage({
    type: MSG.PAGE_DETECTED,
    payload: {
      platform,
      productId,
      productTitle,
      url: currentUrl,
      pagination,
    },
  }).catch(err => {
    // Service worker may not yet be active on first load — this is expected.
    console.debug('[Content] Could not notify background (may be initializing):', err.message);
  });
}

/**
 * Registers listeners for messages sent from the background service worker.
 *
 * @param {string} platform
 */
function registerMessageListeners(platform) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === MSG.EXTRACT_NOW) {
      handleExtractNow(platform, sendResponse);
      return true; // keep channel open for async response
    }
  });
}

/**
 * Handles an EXTRACT_NOW command from the background worker.
 * Extracts, normalizes, deduplicates, and sends reviews back.
 *
 * @param {string}   platform
 * @param {Function} sendResponse
 */
async function handleExtractNow(platform, sendResponse) {
  console.debug('[Content] Extraction requested by background.');

  try {
    const raw        = extractRawReviews(platform);
    const productId  = extractProductId(platform) ?? '__unknown__';
    const reviews    = normalizeReviews(raw, platform, productId);
    const pagination = getPaginationState(platform);

    console.debug(`[Content] Extracted ${reviews.length} reviews (${raw.length} raw).`);

    sendResponse({
      success: true,
      payload: {
        reviews,
        productId,
        productTitle: extractProductTitle(platform),
        platform,
        url: currentUrl,
        pagination,
        extractedAtMs: nowMs(),
      },
    });
  } catch (err) {
    console.error('[Content] Extraction failed:', err);
    sendResponse({ success: false, error: err.message });
  }
}

/**
 * Called by the MutationObserver when the DOM changes meaningfully.
 * Re-notifies the background that the page content may have changed.
 *
 * @param {string} platform
 */
function handleDomChange(platform) {
  console.debug('[Content] DOM change detected — re-notifying background.');
  notifyPageDetected(platform);
}

// ─── Normalization ────────────────────────────────────────────────────────────

/**
 * Converts raw extracted objects into normalized, validated Review models.
 * Deduplicates by ID. Enforces the maximum review limit.
 *
 * @param {Object[]} rawReviews - Output from extractRawReviews.
 * @param {string}   platform
 * @param {string}   productId
 * @returns {import('../models/review.js').Review[]}
 */
function normalizeReviews(rawReviews, platform, productId) {
  const normalized = rawReviews
    .map(raw => createReview({ ...raw, platform, productId }))
    .filter(Boolean); // createReview returns null for invalid entries

  const deduped = uniqueBy(normalized, r => r.id);

  if (deduped.length > LIMITS.MAX_REVIEWS_PER_RUN) {
    console.warn(`[Content] Capping reviews at ${LIMITS.MAX_REVIEWS_PER_RUN} (extracted ${deduped.length}).`);
    return deduped.slice(0, LIMITS.MAX_REVIEWS_PER_RUN);
  }

  return deduped;
}
