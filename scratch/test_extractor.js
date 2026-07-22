/**
 * Scratch test script to verify review extraction module.
 */

import { parseReview } from '../extension/content/extractor/reviewParser.js';
import { extractReviews } from '../extension/content/extractor/reviewExtractor.js';
import { SELECTORS } from '../extension/content/extractor/selectors.js';

// Enhanced mock Element implementation for Node environment
class MockElement {
  constructor(tagName, attrs = {}, textContent = '') {
    this.tagName = tagName.toUpperCase();
    this.attributes = attrs;
    this.id = attrs.id || '';
    this.href = attrs.href || '';
    this.textContent = textContent;
    this.children = [];
  }

  getAttribute(attr) {
    return this.attributes[attr] || null;
  }

  querySelector(selector) {
    const alternatives = selector.split(',').map(s => s.trim());
    for (const alt of alternatives) {
      const parts = alt.split(' ').map(p => p.trim()).filter(Boolean);
      const found = this._matchParts(parts);
      if (found) return found;
    }
    return null;
  }

  querySelectorAll(selector) {
    let results = [];
    for (const child of this.children) {
      if (child._matchSingle(selector)) results.push(child);
      results = results.concat(child.querySelectorAll(selector));
    }
    return results;
  }

  _matchParts(parts) {
    if (parts.length === 0) return null;
    const [head, ...tail] = parts;

    for (const child of this.children) {
      if (child._matchSingle(head)) {
        if (tail.length === 0) return child;
        const descendant = child._matchParts(tail);
        if (descendant) return descendant;
      }
      const deeper = child._matchParts(parts);
      if (deeper) return deeper;
    }
    return null;
  }

  _matchSingle(sel) {
    if (sel === 'span') return this.tagName === 'SPAN';
    if (sel === 'i') return this.tagName === 'I';
    if (sel === 'div') return this.tagName === 'DIV';
    if (sel.startsWith('[data-hook="') && sel.endsWith('"]')) {
      const hookVal = sel.slice(12, -2);
      return this.getAttribute('data-hook') === hookVal;
    }
    if (sel.startsWith('#')) return this.id === sel.slice(1);
    if (sel.startsWith('.')) return (this.attributes.class || '').includes(sel.slice(1));
    if (sel === 'a.a-profile') return this.tagName === 'A' && (this.attributes.class || '').includes('a-profile');
    return false;
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }
}

// Global Element check mock
global.Element = MockElement;
global.window = { location: { origin: 'https://www.amazon.com' } };

function runTests() {
  console.log('--- STARTING EXTRACTOR VERIFICATION TESTS ---');

  // Test 1: Complete Amazon Review Card
  const card1 = new MockElement('div', { id: 'R3A1234567', 'data-hook': 'review' });
  
  const textEl = new MockElement('span', {}, ' This product is absolutely fantastic! Highly recommended. ');
  const bodyEl = new MockElement('div', { 'data-hook': 'review-body' });
  bodyEl.appendChild(textEl);

  const reviewerEl = new MockElement('span', { class: 'a-profile-name' }, 'Alice Smith');
  const profileEl = new MockElement('a', { class: 'a-profile', href: '/gp/profile/amzn1.account.ALICE' });
  profileEl.appendChild(reviewerEl);

  const ratingEl = new MockElement('i', { 'data-hook': 'review-star-rating', title: '5.0 out of 5 stars' });
  const dateEl = new MockElement('span', { 'data-hook': 'review-date' }, 'Reviewed in the United States on March 10, 2024');
  const badgeEl = new MockElement('span', { 'data-hook': 'avp-badge' }, 'Verified Purchase');
  const helpfulEl = new MockElement('span', { 'data-hook': 'helpful-vote-statement' }, '14 people found this helpful');

  card1.appendChild(bodyEl);
  card1.appendChild(profileEl);
  card1.appendChild(ratingEl);
  card1.appendChild(dateEl);
  card1.appendChild(badgeEl);
  card1.appendChild(helpfulEl);

  const parsed1 = parseReview(card1, SELECTORS.AMAZON);
  console.log('Test 1 - Parsed complete review:\n', JSON.stringify(parsed1, null, 2));

  if (parsed1.reviewId !== 'R3A1234567') throw new Error('reviewId failed');
  if (parsed1.reviewText !== 'This product is absolutely fantastic! Highly recommended.') throw new Error('reviewText failed');
  if (parsed1.rating !== 5) throw new Error('rating failed');
  if (parsed1.reviewer !== 'Alice Smith') throw new Error('reviewer failed');
  if (parsed1.verifiedPurchase !== true) throw new Error('verifiedPurchase failed');
  if (parsed1.helpfulVotes !== 14) throw new Error('helpfulVotes failed');
  if (parsed1.profileLink !== 'https://www.amazon.com/gp/profile/amzn1.account.ALICE') throw new Error('profileLink failed');

  // Test 2: Partial Review Card
  const card2 = new MockElement('div', { id: 'R3B9876543', 'data-hook': 'review' });
  const textEl2 = new MockElement('span', {}, 'Average build quality.');
  const bodyEl2 = new MockElement('div', { 'data-hook': 'review-body' });
  bodyEl2.appendChild(textEl2);
  const reviewerEl2 = new MockElement('span', { class: 'a-profile-name' }, 'Bob Johnson');
  card2.appendChild(bodyEl2);
  card2.appendChild(reviewerEl2);

  const parsed2 = parseReview(card2, SELECTORS.AMAZON);
  console.log('Test 2 - Parsed partial review:\n', JSON.stringify(parsed2, null, 2));

  if (parsed2.rating !== null) throw new Error('partial rating failed');
  if (parsed2.verifiedPurchase !== false) throw new Error('partial verifiedPurchase failed');
  if (parsed2.helpfulVotes !== 0) throw new Error('partial helpfulVotes failed');

  // Test 3: Malformed / Empty Container (should return null)
  const emptyCard = new MockElement('div', {});
  const parsed3 = parseReview(emptyCard, SELECTORS.AMAZON);
  if (parsed3 !== null) throw new Error('empty card should return null');

  // Test 4: Batch Extractor
  const root = new MockElement('div', {});
  root.appendChild(card1);
  root.appendChild(card2);
  root.appendChild(emptyCard);

  const batchResults = extractReviews(root, SELECTORS.AMAZON);
  console.log(`Test 4 - Batch extracted ${batchResults.length} reviews out of 3 containers.`);
  if (batchResults.length !== 2) throw new Error('batch extraction count mismatch');

  console.log('--- ALL TESTS PASSED CLEANLY ---');
}

runTests();
