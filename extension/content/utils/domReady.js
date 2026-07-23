/**
 * @module content/utils/domReady
 * @description Bounded readiness checks for Amazon DOM elements before extraction.
 */

import { findReviewContainers, resolveProfile } from '../extractor/reviewExtractor.js';
import { detectPlatform } from '../../utils/helpers.js';

/**
 * Bounded wait for review containers to exist in DOM.
 * Requirements: timeout = 8000ms, polling interval = 200ms.
 * Stops waiting immediately once review containers appear.
 *
 * @param {ParentNode} [root=document]
 * @param {number} [timeoutMs=8000]
 * @param {number} [pollIntervalMs=200]
 * @returns {Promise<boolean>} True if containers exist, false if timed out.
 */
export async function waitForReviewContainers(
  root = typeof document !== 'undefined' ? document : null,
  timeoutMs = 8000,
  pollIntervalMs = 200
) {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return false;
  }

  const currentUrl = typeof window !== 'undefined' ? window.location?.href || '' : '';
  const platform = detectPlatform(currentUrl);
  const { profile } = resolveProfile(platform, currentUrl);
  const containerSelectors = profile?.container || [];

  console.log('[Content] Waiting for review containers');

  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const { containers } = findReviewContainers(root, containerSelectors);
    if (containers && containers.length > 0) {
      console.log(`[Content] Review containers detected: ${containers.length}`);
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  console.log('[Content] Timed out waiting for review containers');
  return false;
}
