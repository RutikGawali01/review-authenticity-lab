/**
 * Scratch test script for verifying lazyLoadObserver behavior.
 */

import { startObserver, stopObserver, isObserving, getProcessedCount } from '../extension/content/observer/lazyLoadObserver.js';
import { SELECTORS } from '../extension/content/extractor/selectors.js';

// Enhanced Mock DOM for MutationObserver testing
class MockElement {
  constructor(tagName, attrs = {}, textContent = '') {
    this.nodeType = 1;
    this.tagName = tagName.toUpperCase();
    this.attributes = attrs;
    this.id = attrs.id || '';
    this.href = attrs.href || '';
    this.textContent = textContent;
    this.children = [];
    this.parentNode = null;
  }

  getAttribute(attr) {
    return this.attributes[attr] || null;
  }

  matches(selector) {
    return this._matchSingle(selector);
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
    if (sel === 'div') return this.tagName === 'DIV';
    if (sel.startsWith('[data-hook="') && sel.endsWith('"]')) {
      const hookVal = sel.slice(12, -2);
      return this.getAttribute('data-hook') === hookVal;
    }
    if (sel.startsWith('#')) return this.id === sel.slice(1);
    if (sel.startsWith('.')) return (this.attributes.class || '').includes(sel.slice(1));
    return false;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    if (MockMutationObserver.activeInstance) {
      MockMutationObserver.activeInstance.trigger([{
        type: 'childList',
        addedNodes: [child]
      }]);
    }
    return child;
  }
}

class MockMutationObserver {
  constructor(callback) {
    this.callback = callback;
    MockMutationObserver.activeInstance = this;
  }

  observe(target, options) {
    this.target = target;
  }

  disconnect() {
    if (MockMutationObserver.activeInstance === this) {
      MockMutationObserver.activeInstance = null;
    }
  }

  trigger(mutations) {
    this.callback(mutations);
  }
}

global.Element = MockElement;
global.MutationObserver = MockMutationObserver;
global.window = { location: { origin: 'https://www.amazon.com' } };

function createReviewCard(id, reviewerName, text) {
  const card = new MockElement('div', { id, 'data-hook': 'review' });
  const body = new MockElement('div', { 'data-hook': 'review-body' });
  body.appendChild(new MockElement('span', {}, text));
  const reviewer = new MockElement('span', { class: 'a-profile-name' }, reviewerName);
  card.appendChild(body);
  card.appendChild(reviewer);
  return card;
}

function runTests() {
  console.log('--- STARTING LAZY LOAD OBSERVER VERIFICATION TESTS ---');

  const root = new MockElement('div', { id: 'reviews-container' });

  // Add 1 initial review card before starting observer
  const initialCard = createReviewCard('R100', 'User 1', 'Initial review content.');
  root.appendChild(initialCard);

  let notifiedNewReviews = [];
  function handleNewReviews(reviews) {
    notifiedNewReviews.push(...reviews);
  }

  // Test 1: Start Observer & Seed check
  startObserver(handleNewReviews, root, SELECTORS.AMAZON);

  console.assert(isObserving() === true, 'Observer should be active');
  console.assert(getProcessedCount() === 1, 'Initial review should be seeded into processed set');
  console.assert(notifiedNewReviews.length === 0, 'Initial review should NOT trigger new review notification');

  console.log('Test 1 Passed: Initial seeding works without triggering callback.');

  // Test 2: Dynamically append a new review card
  const newCard1 = createReviewCard('R101', 'User 2', 'Second review content.');
  root.appendChild(newCard1);

  console.assert(notifiedNewReviews.length === 1, 'Callback should receive 1 new review');
  console.assert(notifiedNewReviews[0].reviewId === 'R101', 'New review ID mismatch');
  console.assert(getProcessedCount() === 2, 'Processed count should be 2');

  console.log('Test 2 Passed: Dynamically added review detected.');

  // Test 3: Append duplicate card (same ID)
  const duplicateCard = createReviewCard('R101', 'User 2', 'Second review content.');
  root.appendChild(duplicateCard);

  console.assert(notifiedNewReviews.length === 1, 'Duplicate card should NOT trigger callback');
  console.assert(getProcessedCount() === 2, 'Processed count should remain 2');

  console.log('Test 3 Passed: Duplicate review skipped cleanly.');

  // Test 4: Append non-review node (e.g. ad container)
  const adNode = new MockElement('div', { class: 'ad-banner' }, 'Click here for sales!');
  root.appendChild(adNode);

  console.assert(notifiedNewReviews.length === 1, 'Non-review node should NOT trigger callback');

  console.log('Test 4 Passed: Non-review node ignored.');

  // Test 5: Stop Observer
  stopObserver();
  console.assert(isObserving() === false, 'Observer should be stopped');
  console.assert(getProcessedCount() === 0, 'State should be cleared on stop');

  const newCard2 = createReviewCard('R102', 'User 3', 'Third review after stop.');
  root.appendChild(newCard2);

  console.assert(notifiedNewReviews.length === 1, 'No notifications after stopObserver()');

  console.log('Test 5 Passed: Observer cleanup verified.');

  console.log('--- ALL LAZY LOAD OBSERVER TESTS PASSED SUCCESSFULLY ---');
}

runTests();
