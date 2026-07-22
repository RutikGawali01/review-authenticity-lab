/**
 * @module content/extractor
 * @description Platform-specific DOM extractors for review data.
 *
 * Each supported platform has its own extraction function that reads the DOM
 * and returns an array of raw review objects, which are then normalized via
 * createReview() in content.js.
 *
 * Design rules:
 * - Extractors NEVER call createReview() directly (that's the coordinator's job).
 * - Extractors NEVER perform analysis or storage.
 * - Extractors return raw objects; validation happens in the model factory.
 * - All DOM access uses the safe qs/qsa/extractText helpers.
 *
 * WHY platform functions instead of a class hierarchy:
 * - Each platform's DOM is completely different. A shared base class would be
 *   artificial — no meaningful shared behavior.
 * - Simple functions are easier to test in isolation with mock DOM fixtures.
 */

import { PLATFORMS }                          from '../utils/constants.js';
import { qs, qsa, extractText, parseDateToMs } from '../utils/helpers.js';

// ─── Dispatcher ───────────────────────────────────────────────────────────────

/**
 * Extracts raw review data from the current page based on the detected platform.
 * Returns an empty array if the platform is unsupported or no reviews are found.
 *
 * @param {string} platform - PLATFORMS constant.
 * @returns {Object[]} Array of raw review objects (un-normalized).
 */
export function extractRawReviews(platform) {
  try {
    switch (platform) {
      case PLATFORMS.AMAZON:      return extractAmazonReviews();
      case PLATFORMS.GOOGLE_PLAY: return extractGooglePlayReviews();
      default:
        console.warn('[Extractor] Unsupported platform:', platform);
        return [];
    }
  } catch (err) {
    console.error('[Extractor] Extraction failed for platform:', platform, err);
    return [];
  }
}

/**
 * Extracts the product ID from the current page URL or DOM.
 *
 * @param {string} platform
 * @returns {string|null}
 */
export function extractProductId(platform) {
  try {
    switch (platform) {
      case PLATFORMS.AMAZON:      return extractAmazonProductId();
      case PLATFORMS.GOOGLE_PLAY: return extractGooglePlayProductId();
      default: return null;
    }
  } catch (err) {
    console.warn('[Extractor] Could not extract product ID:', err);
    return null;
  }
}

/**
 * Extracts the product title from the current page.
 *
 * @param {string} platform
 * @returns {string}
 */
export function extractProductTitle(platform) {
  try {
    switch (platform) {
      case PLATFORMS.AMAZON:      return extractText(qs('#productTitle'));
      case PLATFORMS.GOOGLE_PLAY: return extractText(qs('h1[itemprop="name"]'));
      default: return '';
    }
  } catch (err) {
    console.warn('[Extractor] Could not extract product title:', err);
    return '';
  }
}

// ─── Amazon Extractor ─────────────────────────────────────────────────────────

/**
 * Extracts raw reviews from an Amazon product review page.
 * Targets the standard review card structure.
 *
 * TODO(Phase 2): Handle international Amazon domains with different selectors.
 *
 * @returns {Object[]}
 */
function extractAmazonReviews() {
  const reviewCards = qsa('[data-hook="review"]');

  if (!reviewCards.length) {
    console.debug('[Extractor/Amazon] No review cards found on page.');
    return [];
  }

  return reviewCards.map(card => extractAmazonReviewCard(card)).filter(Boolean);
}

/**
 * Extracts raw data from a single Amazon review card element.
 *
 * @param {Element} card
 * @returns {Object|null}
 */
function extractAmazonReviewCard(card) {
  try {
    const ratingEl   = qs('[data-hook="review-star-rating"], [data-hook="cmps-review-star-rating"]', card);
    const ratingText = extractText(ratingEl);
    const ratingRaw  = ratingText;
    const ratingNum  = parseAmazonRating(ratingText);
    const dateRaw    = extractText(qs('[data-hook="review-date"]', card));

    return {
      author:           extractText(qs('.a-profile-name', card)),
      authorUrl:        qs('.a-profile', card)?.href ?? '',
      body:             extractText(qs('[data-hook="review-body"] span', card)),
      ratingRaw,
      rating:           ratingNum,
      dateRaw,
      dateMs:           parseDateToMs(dateRaw),
      verifiedPurchase: Boolean(qs('[data-hook="avp-badge"]', card)),
      helpfulCount:     parseHelpfulCount(extractText(qs('[data-hook="helpful-vote-statement"]', card))),
      sourceUrl:        window.location.href,
    };
  } catch (err) {
    console.warn('[Extractor/Amazon] Failed to extract review card:', err);
    return null;
  }
}

/**
 * Parses Amazon's "X.0 out of 5 stars" rating string.
 *
 * @param {string} text
 * @returns {number|null}
 */
function parseAmazonRating(text) {
  const match = text.match(/^([\d.]+)\s+out of/i);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Extracts the Amazon product ASIN from the URL or page metadata.
 *
 * @returns {string|null}
 */
function extractAmazonProductId() {
  const match = window.location.pathname.match(/\/(?:dp|product)\/([A-Z0-9]{10})/i);
  if (match) return match[1];

  // Fallback: look for the ASIN in the page's hidden fields
  const asinEl = qs('#ASIN, input[name="ASIN"]');
  return asinEl?.value ?? null;
}

// ─── Google Play Extractor ────────────────────────────────────────────────────

/**
 * Extracts raw reviews from a Google Play app page.
 *
 * TODO(Phase 2): Google Play loads reviews via Ajax. A MutationObserver trigger
 * will be required rather than a direct querySelectorAll on page load.
 *
 * @returns {Object[]}
 */
function extractGooglePlayReviews() {
  // Google Play uses dynamically rendered review cards
  const reviewCards = qsa('[jsmodel="PFDTne"], [data-review-id]');

  if (!reviewCards.length) {
    console.debug('[Extractor/GooglePlay] No review cards found on page.');
    return [];
  }

  return reviewCards.map(card => extractGooglePlayCard(card)).filter(Boolean);
}

/**
 * Extracts raw data from a single Google Play review card.
 *
 * @param {Element} card
 * @returns {Object|null}
 */
function extractGooglePlayCard(card) {
  try {
    const ratingEl  = qs('[role="img"][aria-label]', card);
    const ratingRaw = ratingEl?.getAttribute('aria-label') ?? '';
    const rating    = parseGooglePlayRating(ratingRaw);

    return {
      author:           extractText(qs('.X43Kjb, [class*="reviewer-name"]', card)),
      authorUrl:        '',
      body:             extractText(qs('[jsname="fbQN7e"], [class*="review-body"]', card)),
      ratingRaw,
      rating,
      dateRaw:          extractText(qs('[class*="review-date"], .p2TkOb', card)),
      verifiedPurchase: false, // Google Play does not expose this
      helpfulCount:     0,     // Not easily extractable
      sourceUrl:        window.location.href,
    };
  } catch (err) {
    console.warn('[Extractor/GooglePlay] Failed to extract review card:', err);
    return null;
  }
}

/**
 * Parses Google Play's "Rated X stars out of 5" aria-label.
 *
 * @param {string} text
 * @returns {number|null}
 */
function parseGooglePlayRating(text) {
  const match = text.match(/rated\s+([\d.]+)/i);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Extracts the Google Play app package name from the URL.
 *
 * @returns {string|null}
 */
function extractGooglePlayProductId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id'); // e.g. "com.whatsapp"
}

// ─── Shared Helpers ───────────────────────────────────────────────────────────

/**
 * Parses the "X people found this helpful" text into a count.
 *
 * @param {string} text
 * @returns {number}
 */
function parseHelpfulCount(text) {
  if (!text) return 0;
  const match = text.match(/(\d[\d,]*)/);
  return match ? parseInt(match[1].replace(/,/g, ''), 10) : 0;
}
