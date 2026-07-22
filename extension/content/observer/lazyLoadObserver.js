/**
 * @module content/observer/lazyLoadObserver
 * @description MutationObserver wrapper for detecting dynamically loaded reviews.
 * Tracks processed review IDs in a Set to prevent duplicate parsing.
 */

import { SELECTORS } from '../extractor/selectors.js';
import { parseReview } from '../extractor/reviewParser.js';

// ─── State ───────────────────────────────────────────────────────────────────

/** @type {MutationObserver|null} */
let observer = null;

/** @type {Set<string>} */
const processedReviewIds = new Set();

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Starts observing a DOM node for dynamically added review cards.
 *
 * @param {(reviews: Array<Object>) => void} onNewReviews - Callback fired with newly parsed reviews.
 * @param {ParentNode} [targetNode=document.body] - DOM node to observe.
 * @param {Object} [selectors=SELECTORS.AMAZON] - Platform selector mapping.
 */
export function startObserver(
  onNewReviews,
  targetNode = typeof document !== 'undefined' ? document.body : null,
  selectors = SELECTORS.AMAZON
) {
  stopObserver();

  if (typeof onNewReviews !== 'function' || !targetNode) {
    return;
  }

  // Pre-seed seen review IDs from existing DOM to prevent re-notifying initial cards
  seedExistingReviewIds(targetNode, selectors);

  observer = new MutationObserver(mutations => {
    processMutations(mutations, selectors, onNewReviews);
  });

  observer.observe(targetNode, {
    childList: true,
    subtree: true,
  });
}

/**
 * Stops the active MutationObserver and resets state.
 */
export function stopObserver() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  processedReviewIds.clear();
}

/**
 * Returns true if the observer is currently active.
 *
 * @returns {boolean}
 */
export function isObserving() {
  return observer !== null;
}

/**
 * Returns the count of processed unique review IDs.
 *
 * @returns {number}
 */
export function getProcessedCount() {
  return processedReviewIds.size;
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Scans initial DOM state to populate seen review IDs.
 */
function seedExistingReviewIds(targetNode, selectors) {
  if (!selectors?.container || typeof targetNode.querySelectorAll !== 'function') return;

  const existingCards = targetNode.querySelectorAll(selectors.container);
  for (let i = 0; i < existingCards.length; i++) {
    try {
      const review = parseReview(existingCards[i], selectors);
      if (review?.reviewId) {
        processedReviewIds.add(review.reviewId);
      }
    } catch {
      // Ignore seeding failures silently
    }
  }
}

/**
 * Handles mutation records, extracting only newly added review elements.
 */
function processMutations(mutations, selectors, onNewReviews) {
  const newReviews = [];

  for (let i = 0; i < mutations.length; i++) {
    const mutation = mutations[i];
    if (mutation.type !== 'childList' || !mutation.addedNodes.length) continue;

    for (let j = 0; j < mutation.addedNodes.length; j++) {
      const node = mutation.addedNodes[j];
      extractNewReviewsFromNode(node, selectors, newReviews);
    }
  }

  if (newReviews.length > 0) {
    onNewReviews(newReviews);
  }
}

/**
 * Extracts unseen reviews from an added DOM node or its children.
 */
function extractNewReviewsFromNode(node, selectors, newReviews) {
  if (!node || node.nodeType !== 1) return; // Only process ELEMENT_NODE

  const containerSelector = selectors?.container;
  if (!containerSelector) return;

  const element = /** @type {Element} */ (node);
  const cards = [];

  if (element.matches && element.matches(containerSelector)) {
    cards.push(element);
  }

  if (typeof element.querySelectorAll === 'function') {
    const childCards = element.querySelectorAll(containerSelector);
    for (let i = 0; i < childCards.length; i++) {
      cards.push(childCards[i]);
    }
  }

  for (let i = 0; i < cards.length; i++) {
    parseAndCollectNewReview(cards[i], selectors, newReviews);
  }
}

/**
 * Parses a single review element and adds it to newReviews if unseen.
 */
function parseAndCollectNewReview(card, selectors, newReviews) {
  try {
    const review = parseReview(card, selectors);
    if (!review || !review.reviewId) return;

    if (processedReviewIds.has(review.reviewId)) {
      return;
    }

    processedReviewIds.add(review.reviewId);
    newReviews.push(review);
  } catch (err) {
    console.warn('[lazyLoadObserver] Failed to parse added review card:', err);
  }
}
