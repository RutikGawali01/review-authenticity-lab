/**
 * @module content/extractor/reviewExtractor
 * @description Coordinates review container discovery, field parsing, and batch extraction performance.
 * Emits comprehensive diagnostic metrics and structured payload output.
 */

import { SELECTOR_PROFILES } from './selectors.js';
import { parseReview } from './reviewParser.js';
import { detectPlatform, detectAmazonPageType } from '../../utils/helpers.js';
import { PLATFORMS, AMAZON_PAGE_TYPES } from '../../utils/constants.js';

/**
 * Extracts normalized reviews from the provided DOM root.
 *
 * @param {ParentNode} [root=document] - Root DOM node to search within.
 * @param {Object|string} [targetPlatformOrProfile] - Optional platform/profile override.
 * @returns {Object} Structured extraction result object.
 */
export function extractReviews(root = typeof document !== 'undefined' ? document : null, targetPlatformOrProfile = null) {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  if (!root || typeof root.querySelectorAll !== 'function') {
    return buildExtractionResult({
      success: false,
      error: 'Invalid DOM root node provided.',
      startTime,
    });
  }

  const currentUrl = typeof window !== 'undefined' ? window.location?.href || '' : '';
  const platform = typeof targetPlatformOrProfile === 'string'
    ? targetPlatformOrProfile
    : detectPlatform(currentUrl);

  const { profile, pageType, profileName } = resolveProfile(platform, currentUrl, targetPlatformOrProfile);

  console.log(`[Extractor] Current page: ${currentUrl || 'N/A'}`);
  console.log(`[Extractor] Platform: ${platform} | Detected page type: ${pageType} | Profile: ${profileName}`);

  const { containers, matchedContainerSelector } = findReviewContainers(root, profile.container);

  if (!matchedContainerSelector || containers.length === 0) {
    console.warn(`[Extractor] No review containers matched for profile: ${profileName}`);
    return buildExtractionResult({
      success: true,
      pageType,
      profileName,
      reviewCount: 0,
      skippedCount: 0,
      reviews: [],
      startTime,
    });
  }

  console.log(`[Extractor] Matched container selector: "${matchedContainerSelector}"`);
  console.log(`[Extractor] Found ${containers.length} review containers.`);

  const reviews = [];
  let skippedCount = 0;

  for (let i = 0; i < containers.length; i++) {
    const container = containers[i];
    try {
      const review = parseReview(container, profile);
      if (review) {
        reviews.push(review);
      } else {
        skippedCount++;
      }
    } catch (err) {
      skippedCount++;
      console.warn(`[Extractor] Exception while parsing review container at index ${i}:`, err);
    }
  }

  const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const durationMs = Math.round((endTime - startTime) * 100) / 100;

  console.log(`[Extractor] Successfully extracted ${reviews.length} reviews (${skippedCount} skipped) in ${durationMs}ms.`);

  return buildExtractionResult({
    success: true,
    pageType,
    profileName,
    reviewCount: reviews.length,
    skippedCount,
    reviews,
    startTime,
    durationMs,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolves the target selector profile based on platform and detected page type.
 */
function resolveProfile(platform, url, overrideProfile) {
  if (overrideProfile && typeof overrideProfile === 'object') {
    return { profile: overrideProfile, pageType: 'CUSTOM', profileName: 'CUSTOM_OVERRIDE' };
  }

  if (platform === PLATFORMS.GOOGLE_PLAY) {
    return {
      profile: SELECTOR_PROFILES.GOOGLE_PLAY,
      pageType: 'APP_PAGE',
      profileName: 'GOOGLE_PLAY.DEFAULT',
    };
  }

  const pageType = detectAmazonPageType(url);
  const amazonProfiles = SELECTOR_PROFILES.AMAZON;
  const profile = amazonProfiles[pageType] || amazonProfiles[AMAZON_PAGE_TYPES.UNKNOWN];

  return {
    profile,
    pageType,
    profileName: `AMAZON.${pageType}`,
  };
}

/**
 * Searches for review containers using candidate selectors in order.
 * Minimizes DOM query overhead by returning immediately on the first non-empty match.
 *
 * @param {ParentNode} root
 * @param {string|string[]} containerSelectors
 * @returns {{ containers: Element[], matchedContainerSelector: string|null }}
 */
function findReviewContainers(root, containerSelectors) {
  const candidates = Array.isArray(containerSelectors) ? containerSelectors : [containerSelectors];

  for (let i = 0; i < candidates.length; i++) {
    const selector = candidates[i];
    if (!selector || typeof selector !== 'string') continue;

    try {
      const elements = root.querySelectorAll(selector);
      if (elements && elements.length > 0) {
        return {
          containers: Array.from(elements),
          matchedContainerSelector: selector,
        };
      }
    } catch {
      // Ignore stale container selectors
    }
  }

  return { containers: [], matchedContainerSelector: null };
}

/**
 * Builds standard extraction payload output object.
 */
function buildExtractionResult({
  success = true,
  pageType = 'UNKNOWN',
  profileName = 'UNKNOWN',
  reviewCount = 0,
  skippedCount = 0,
  reviews = [],
  startTime = 0,
  durationMs = 0,
  error = null,
}) {
  const finalDuration = durationMs || (typeof performance !== 'undefined' ? Math.round((performance.now() - startTime) * 100) / 100 : 0);

  return {
    success,
    pageType,
    selectorProfile: profileName,
    reviewCount,
    skippedCount,
    durationMs: finalDuration,
    reviews,
    ...(error ? { error } : {}),
  };
}
