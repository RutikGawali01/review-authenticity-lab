/**
 * @module content/extractor/reviewParser
 * @description Single-pass parser for a review DOM container.
 * Extracts normalized review fields with candidate fallbacks, international locale resilience,
 * and strict output type contracts.
 */

/**
 * @typedef {Object} NormalizedReview
 * @property {string}      reviewId         - Unique review identifier (or hash).
 * @property {string}      reviewTitle      - Extracted review headline/title.
 * @property {string}      reviewText       - Sanitized review body text.
 * @property {number|null} rating           - Numeric rating (1.0 - 5.0) or null if missing.
 * @property {string}      reviewer         - Reviewer display name.
 * @property {string}      reviewDate       - Raw date statement string.
 * @property {boolean}     verifiedPurchase - True if verified purchase badge exists.
 * @property {number}      helpfulVotes     - Non-negative integer count of helpful votes.
 * @property {string}      profileLink      - Absolute URL to reviewer profile.
 */

/**
 * Parses a single review container DOM element using a selector profile.
 * Guarantees a consistent output object shape with no undefined properties.
 *
 * @param {Element} container - The DOM element representing a review card.
 * @param {Object} [selectors={}] - Field selector profile containing candidate arrays.
 * @returns {NormalizedReview|null} Normalized Review object, or null if validation fails.
 */
export function parseReview(container, selectors = {}) {
  if (!container || !(container instanceof Element)) {
    return null;
  }

  const reviewTitle = extractText(container, selectors.title);
  const reviewText = extractReviewText(container, selectors.text);
  const reviewer = extractText(container, selectors.reviewer);

  // REJECT review ONLY when missing both review text AND reviewer name
  if (!reviewText && !reviewer) {
    return null;
  }

  const reviewId = extractReviewId(container, reviewer, reviewText || reviewTitle);
  const rating = parseRating(container, selectors.rating);
  const reviewDate = extractText(container, selectors.date);
  const verifiedPurchase = isVerifiedPurchase(container, selectors.verified);
  const helpfulVotes = parseHelpfulVotes(container, selectors.helpful);
  const profileLink = extractProfileLink(container, selectors.profileLink);

  return Object.freeze({
    reviewId: reviewId || `rev_${hashString(`${reviewer}::${reviewText}`)}`,
    reviewTitle: reviewTitle || '',
    reviewText: reviewText || '',
    rating: typeof rating === 'number' && !isNaN(rating) ? rating : null,
    reviewer: reviewer || '',
    reviewDate: reviewDate || '',
    verifiedPurchase: Boolean(verifiedPurchase),
    helpfulVotes: typeof helpfulVotes === 'number' && helpfulVotes >= 0 ? helpfulVotes : 0,
    profileLink: profileLink || '',
  });
}

// ─── Extraction Helpers ───────────────────────────────────────────────────────

/**
 * Queries the first matching child element for an ordered array of selector candidates.
 * Minimizes DOM traversals by returning on the first non-null match.
 *
 * @param {Element} parent
 * @param {string|string[]} [selectors]
 * @returns {Element|null}
 */
export function queryFirstMatchingElement(parent, selectors) {
  if (!parent || !selectors) return null;

  const candidates = Array.isArray(selectors) ? selectors : [selectors];
  for (let i = 0; i < candidates.length; i++) {
    const sel = candidates[i];
    if (!sel || typeof sel !== 'string') continue;
    try {
      const el = parent.querySelector(sel);
      if (el) return el;
    } catch {
      // Ignore stale/invalid selectors gracefully
    }
  }

  return null;
}

/**
 * Extracts and sanitizes standard single-line text content.
 */
function extractText(container, selectors) {
  const el = queryFirstMatchingElement(container, selectors);
  if (!el) return '';
  return el.textContent?.replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim() ?? '';
}

/**
 * Extracts review body text, preserving paragraph breaks while collapsing inline whitespace.
 */
function extractReviewText(container, selectors) {
  const el = queryFirstMatchingElement(container, selectors);
  if (!el) return '';

  const rawText = el.textContent || '';
  return rawText
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .split(/\r?\n/)
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

/**
 * Extracts Review ID with priority:
 * 1. data-reviewid
 * 2. data-review-id
 * 3. Element id attribute (e.g. customer_review-R12345)
 * 4. Fallback: Deterministic hash
 */
function extractReviewId(container, reviewer, reviewText) {
  const idAttr = container.getAttribute('data-reviewid')
    || container.getAttribute('data-review-id')
    || container.id;

  if (idAttr && idAttr.trim().length > 0) {
    return idAttr.trim();
  }

  const seed = `${reviewer}::${reviewText}`;
  return `rev_${hashString(seed)}`;
}

/**
 * Parses numeric rating from star elements or aria-label text.
 * Internationalized to support multiple decimal formats (4.5 / 4,5) and locale strings.
 */
function parseRating(container, selectors) {
  const el = queryFirstMatchingElement(container, selectors);
  if (!el) return null;

  const rawText = el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '';
  if (!rawText) return null;

  // Normalize comma decimal (e.g. "4,5" -> "4.5")
  const normalizedText = rawText.replace(/(\d),(\d)/g, '$1.$2');

  const match = normalizedText.match(/([\d.]+)\s*(?:out of|von|de|sur|stars?|sternen|estrellas|étoiles?)/i)
    || normalizedText.match(/^([\d.]+)/);

  if (!match) return null;

  const num = parseFloat(match[1]);
  if (isNaN(num) || num < 1 || num > 5) return null;
  return Math.round(num * 10) / 10;
}

/**
 * Checks for presence of verified purchase badge across Amazon international locales.
 */
function isVerifiedPurchase(container, selectors) {
  const el = queryFirstMatchingElement(container, selectors);
  if (!el) return false;

  const text = el.textContent?.toLowerCase() || '';
  if (
    text.includes('verified purchase') ||
    text.includes('verified') ||
    text.includes('verifizierter kauf') ||
    text.includes('compra verificada') ||
    text.includes('achat vérifié')
  ) {
    return true;
  }

  return Boolean(el);
}

/**
 * Parses numeric count of helpful votes from text (e.g. "0", "1 person", "23 people", "2,456 people").
 */
function parseHelpfulVotes(container, selectors) {
  const text = extractText(container, selectors);
  if (!text) return 0;

  const match = text.match(/([\d,]+)\s*(?:people|person|personas?|nützlich)/i)
    || text.match(/^(\d[\d,]*)/);

  if (match) {
    const parsed = parseInt(match[1].replace(/,/g, ''), 10);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  }

  if (/one person|a person|une personne/i.test(text)) {
    return 1;
  }

  return 0;
}

/**
 * Extracts reviewer profile URL string and converts relative paths to absolute URLs.
 */
function extractProfileLink(container, selectors) {
  const el = queryFirstMatchingElement(container, selectors);
  if (!el) return '';

  const href = el.getAttribute('href') || el.href || '';
  if (!href) return '';

  if (href.startsWith('/') && typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${href}`;
  }

  return href;
}

/**
 * Computes a lightweight djb2 hash string for fallback ID generation.
 */
function hashString(input) {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}
