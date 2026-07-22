/**
 * @module ui/sidepanel
 * @description Side Panel UI controller.
 *
 * Manages the full-height analysis panel. Receives snapshot data from the
 * background service worker and renders it into the panel's result state.
 *
 * Responsibilities:
 * - Show welcome screen until an analysis has been run.
 * - Listen for SNAPSHOT_READY messages from background.
 * - Load snapshot data from background and render results.
 * - Render rating distribution bars, signal list, and snapshot history.
 * - Handle signal severity filtering.
 *
 * Strictly NO business logic. NO storage access. NO DOM scraping.
 * All data arrives via chrome.runtime.sendMessage or runtime.onMessage.
 *
 * WHY the side panel doesn't call IndexedDB directly:
 * - The side panel runs in a different context from the service worker.
 * - All data requests go through the background, which is the single source
 *   of truth for storage operations. This maintains the strict layering:
 *   UI → Background → Storage.
 */

import { MSG, SEVERITY, SEVERITY_LABELS, PLATFORM_LABELS, SIGNALS } from '../utils/constants.js';
import { toIsoDate } from '../utils/helpers.js';

// ─── DOM Element Cache ────────────────────────────────────────────────────────

/** @type {Record<string, HTMLElement|null>} */
let el = {};

// ─── Module State ─────────────────────────────────────────────────────────────

/**
 * The currently displayed signals (used for filter operations).
 * @type {Object[]}
 */
let _currentSignals = [];

/** Active filter: 'all' | 'high' | 'medium' | 'low' */
let _activeFilter = 'all';

// ─── Initialization ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  cacheElements();
  validateElements();
  registerRuntimeListener();
  registerFilterListeners();
  registerRefreshListener();
  renderState('welcome');
});

/**
 * Populates the element cache after the DOM is ready.
 */
function cacheElements() {
  el = {
    // States
    stateWelcome:  document.getElementById('state-welcome'),
    stateLoading:  document.getElementById('state-loading'),
    stateError:    document.getElementById('state-error'),
    stateResults:  document.getElementById('state-results'),

    // Loading
    loadingText:   document.getElementById('loading-text'),

    // Error
    errorMessage:  document.getElementById('error-message'),
    btnRetry:      document.getElementById('btn-retry'),

    // Results — product header
    resultPlatform: document.getElementById('result-platform'),
    resultTitle:    document.getElementById('result-title'),
    snapshotTime:   document.getElementById('snapshot-time'),

    // Results — risk banner
    riskBanner:    document.getElementById('risk-banner'),
    riskIcon:      document.getElementById('risk-icon'),
    riskText:      document.getElementById('risk-text'),
    riskScore:     document.getElementById('risk-score'),

    // Results — summary
    summaryCard:   document.getElementById('summary-card'),
    summaryText:   document.getElementById('summary-text'),

    // Results — stats
    statTotal:     document.getElementById('stat-total'),
    statFlagged:   document.getElementById('stat-flagged'),
    statVerified:  document.getElementById('stat-verified'),
    statAvgRating: document.getElementById('stat-avg-rating'),

    // Results — rating bars
    ratingBars:    document.getElementById('rating-bars'),

    // Results — signals
    signalsSection: document.getElementById('signals-section'),
    signalsList:    document.getElementById('signals-list'),
    noSignals:      document.getElementById('no-signals'),
    signalFilters:  document.getElementById('signal-filters'),

    // Results — history
    historyList:   document.getElementById('history-list'),

    // Header
    btnRefresh:    document.getElementById('btn-refresh'),
  };
}

// ─── Event Listeners ──────────────────────────────────────────────────────────

/**
 * Listens for SNAPSHOT_READY messages pushed from the background worker.
 * This is how the side panel learns that a new analysis has completed.
 */
function registerRuntimeListener() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === MSG.SNAPSHOT_READY) {
      console.debug('[SidePanel] Snapshot ready:', message.payload?.snapshotId);
      loadAndRenderSnapshot(message.payload?.snapshotId);
    }
  });
}

/**
 * Registers click handlers for the severity filter buttons.
 */
function registerFilterListeners() {
  el.signalFilters?.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-filter]');
    if (!btn) return;

    const filter = btn.dataset.filter;
    setActiveFilter(filter);
  });
}

/**
 * Registers the refresh button to reload the latest snapshot.
 */
function registerRefreshListener() {
  el.btnRefresh?.addEventListener('click', () => {
    loadLatestSnapshot();
  });
}

// ─── Data Loading ─────────────────────────────────────────────────────────────

/**
 * Requests the background to load a specific snapshot by ID and renders it.
 *
 * @param {string|undefined} snapshotId
 */
async function loadAndRenderSnapshot(snapshotId) {
  if (!snapshotId) {
    loadLatestSnapshot();
    return;
  }

  renderState('loading', 'Loading analysis…');

  try {
    const response = await chrome.runtime.sendMessage({
      type:    MSG.GET_SNAPSHOT,
      payload: { snapshotId },
    });

    if (!response?.success) {
      throw new Error(response?.error ?? 'Failed to load snapshot.');
    }

    renderResults(response.payload);
  } catch (err) {
    console.error('[SidePanel] Failed to load snapshot:', err);
    renderState('error', err.message);
  }
}

/**
 * Requests the background to provide the most recent snapshot for the
 * currently active product.
 */
async function loadLatestSnapshot() {
  renderState('loading', 'Loading latest analysis…');

  try {
    const response = await chrome.runtime.sendMessage({ type: MSG.GET_LATEST_SNAPSHOT });

    if (!response?.success) {
      // No snapshot yet — show welcome instead of error
      if (response?.code === 'NO_SNAPSHOT') {
        renderState('welcome');
        return;
      }
      throw new Error(response?.error ?? 'Failed to load snapshot.');
    }

    renderResults(response.payload);
  } catch (err) {
    console.error('[SidePanel] Failed to load latest snapshot:', err);
    renderState('error', err.message);
  }
}

// ─── State Rendering ──────────────────────────────────────────────────────────

/**
 * Shows one state container and hides all others.
 *
 * @param {'welcome'|'loading'|'error'|'results'} stateName
 * @param {string} [message] - Used for loading label or error text.
 */
function renderState(stateName, message = '') {
  const stateMap = {
    welcome: el.stateWelcome,
    loading: el.stateLoading,
    error:   el.stateError,
    results: el.stateResults,
  };

  for (const [name, node] of Object.entries(stateMap)) {
    if (node) node.hidden = name !== stateName;
  }

  if (stateName === 'loading' && message && el.loadingText) {
    el.loadingText.textContent = message;
  }

  if (stateName === 'error' && message && el.errorMessage) {
    el.errorMessage.textContent = message;
  }
}

// ─── Results Rendering ────────────────────────────────────────────────────────

/**
 * Renders a full analysis result payload into the results state.
 *
 * @param {Object} payload
 * @param {import('../models/snapshot.js').Snapshot} payload.snapshot
 * @param {Object[]} [payload.signals]
 * @param {import('../models/snapshot.js').Snapshot[]} [payload.history]
 * @param {Object|null} [payload.summary]
 */
function renderResults(payload) {
  const { snapshot, signals = [], history = [], summary = null } = payload;

  if (!snapshot) {
    renderState('error', 'Received empty snapshot data.');
    return;
  }

  _currentSignals = signals;

  renderProductHeader(snapshot);
  renderRiskBanner(signals);
  renderSummary(summary);
  renderStats(snapshot.meta, signals);
  renderRatingBars(snapshot.meta.ratingBreakdown, snapshot.meta.totalReviews);
  renderSignals(signals);
  renderHistory(history);

  renderState('results');
}

/**
 * Renders product title, platform badge, and snapshot timestamp.
 *
 * @param {import('../models/snapshot.js').Snapshot} snapshot
 */
function renderProductHeader(snapshot) {
  if (el.resultPlatform) {
    el.resultPlatform.textContent = PLATFORM_LABELS[snapshot.platform] ?? snapshot.platform;
  }

  if (el.resultTitle) {
    el.resultTitle.textContent = snapshot.productTitle || 'Unknown Product';
  }

  if (el.snapshotTime) {
    const date = new Date(snapshot.capturedAtMs);
    el.snapshotTime.textContent = date.toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }
}

/**
 * Renders the risk banner based on signal severity distribution.
 *
 * @param {Object[]} signals
 */
function renderRiskBanner(signals) {
  if (!el.riskBanner) return;

  const risk = computeOverallRisk(signals);

  el.riskBanner.dataset.risk = risk;

  const iconMap = { high: '⚠', medium: '▲', low: '✓' };

  if (el.riskIcon) el.riskIcon.textContent = iconMap[risk] ?? '✓';
  if (el.riskText) el.riskText.textContent  = SEVERITY_LABELS[risk] ?? risk;
  if (el.riskScore) {
    const count = signals.length;
    el.riskScore.textContent = `${count} signal${count !== 1 ? 's' : ''} detected`;
  }
}

/**
 * Renders the analysis summary card if a summary is available.
 *
 * @param {Object|null} summary
 */
function renderSummary(summary) {
  if (!summary?.text || !el.summaryCard || !el.summaryText) return;

  el.summaryText.textContent = summary.text;
  el.summaryCard.hidden = false;
}

/**
 * Renders the four aggregate statistics.
 *
 * @param {import('../models/snapshot.js').SnapshotMeta} meta
 * @param {Object[]} signals
 */
function renderStats(meta, signals) {
  if (el.statTotal)     el.statTotal.textContent     = String(meta.totalReviews);
  if (el.statVerified)  el.statVerified.textContent  = String(meta.verifiedCount);
  if (el.statAvgRating) el.statAvgRating.textContent = meta.averageRating !== null
    ? `${meta.averageRating.toFixed(1)}★`
    : '—';

  const flaggedCount = new Set(signals.map(s => s.reviewId)).size;
  if (el.statFlagged) el.statFlagged.textContent = String(flaggedCount);
}

/**
 * Renders the rating distribution bar chart.
 *
 * @param {Record<number, number>} breakdown - Map of 1–5 → count.
 * @param {number} total
 */
function renderRatingBars(breakdown, total) {
  if (!el.ratingBars) return;

  el.ratingBars.innerHTML = '';

  const fragment = document.createDocumentFragment();

  for (let stars = 5; stars >= 1; stars--) {
    const count   = breakdown[stars] ?? 0;
    const pct     = total > 0 ? (count / total) * 100 : 0;

    const row     = document.createElement('div');
    row.className = 'rating-bar-row';
    row.setAttribute('role', 'presentation');

    const label   = document.createElement('span');
    label.className   = 'rating-bar-label';
    label.textContent = `${stars}★`;

    const track   = document.createElement('div');
    track.className = 'rating-bar-track';
    track.setAttribute('role', 'meter');
    track.setAttribute('aria-label', `${stars} star: ${count} reviews`);
    track.setAttribute('aria-valuenow', String(count));
    track.setAttribute('aria-valuemax', String(total));

    const fill    = document.createElement('div');
    fill.className = 'rating-bar-fill';

    // Defer width assignment to next frame for CSS transition to fire
    requestAnimationFrame(() => { fill.style.width = `${pct.toFixed(1)}%`; });

    const countEl = document.createElement('span');
    countEl.className   = 'rating-bar-count';
    countEl.textContent = String(count);

    track.appendChild(fill);
    row.appendChild(label);
    row.appendChild(track);
    row.appendChild(countEl);
    fragment.appendChild(row);
  }

  el.ratingBars.appendChild(fragment);
}

/**
 * Renders the signal list, applying the current filter.
 *
 * @param {Object[]} signals
 */
function renderSignals(signals) {
  if (!el.signalsList) return;

  const filtered = filterSignals(signals, _activeFilter);

  el.signalsList.innerHTML = '';

  if (filtered.length === 0) {
    if (el.signalsSection) el.signalsSection.hidden = true;
    if (el.noSignals)      el.noSignals.hidden      = false;
    return;
  }

  if (el.signalsSection) el.signalsSection.hidden = false;
  if (el.noSignals)      el.noSignals.hidden      = true;

  const fragment = document.createDocumentFragment();

  for (const signal of filtered) {
    fragment.appendChild(buildSignalItem(signal));
  }

  el.signalsList.appendChild(fragment);
}

/**
 * Builds a single signal list item element.
 *
 * @param {Object} signal
 * @returns {HTMLLIElement}
 */
function buildSignalItem(signal) {
  const item = document.createElement('li');
  item.className = 'signal-item';
  item.dataset.severity = signal.severity;
  item.setAttribute('role', 'listitem');

  const header = document.createElement('div');
  header.className = 'signal-header';

  const typeEl = document.createElement('span');
  typeEl.className   = 'signal-type';
  typeEl.textContent = formatSignalType(signal.type);

  const badge = document.createElement('span');
  badge.className   = `signal-severity-badge signal-severity-badge--${signal.severity}`;
  badge.textContent = SEVERITY_LABELS[signal.severity] ?? signal.severity;

  header.appendChild(typeEl);
  header.appendChild(badge);

  const rationale = document.createElement('p');
  rationale.className   = 'signal-rationale';
  rationale.textContent = signal.rationale;

  item.appendChild(header);
  item.appendChild(rationale);

  return item;
}

/**
 * Renders the snapshot history list.
 *
 * @param {import('../models/snapshot.js').Snapshot[]} history
 */
function renderHistory(history) {
  if (!el.historyList) return;

  el.historyList.innerHTML = '';

  if (!history.length) {
    const empty = document.createElement('li');
    empty.style.cssText = 'text-align:center;color:var(--color-text-muted);font-size:0.75rem;padding:0.75rem;';
    empty.textContent = 'No previous snapshots.';
    el.historyList.appendChild(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const snap of history) {
    const item = document.createElement('li');
    item.className = 'history-item';
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    item.dataset.snapshotId = snap.id;

    const date = document.createElement('span');
    date.className   = 'history-item-date';
    date.textContent = new Date(snap.capturedAtMs).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const count = document.createElement('span');
    count.className   = 'history-item-count';
    count.textContent = `${snap.meta.totalReviews} reviews`;

    item.appendChild(date);
    item.appendChild(count);

    item.addEventListener('click', () => loadAndRenderSnapshot(snap.id));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') loadAndRenderSnapshot(snap.id);
    });

    fragment.appendChild(item);
  }

  el.historyList.appendChild(fragment);
}

// ─── Filtering ────────────────────────────────────────────────────────────────

/**
 * Updates the active filter and re-renders the signal list.
 *
 * @param {string} filter - 'all' | 'high' | 'medium' | 'low'
 */
function setActiveFilter(filter) {
  _activeFilter = filter;

  // Update button active states
  el.signalFilters?.querySelectorAll('[data-filter]').forEach(btn => {
    btn.classList.toggle('filter-btn--active', btn.dataset.filter === filter);
  });

  renderSignals(_currentSignals);
}

/**
 * Filters signals by severity.
 *
 * @param {Object[]} signals
 * @param {string}   filter
 * @returns {Object[]}
 */
function filterSignals(signals, filter) {
  if (filter === 'all') return signals;
  return signals.filter(s => s.severity === filter);
}

// ─── Pure Utilities ───────────────────────────────────────────────────────────

/**
 * Determines overall risk level from signal array.
 * Mirrors the logic in summaryGenerator.js — kept here to avoid a cross-context
 * import of an analysis module into a UI module.
 *
 * @param {Object[]} signals
 * @returns {string} SEVERITY constant.
 */
function computeOverallRisk(signals) {
  if (signals.some(s => s.severity === SEVERITY.HIGH))   return SEVERITY.HIGH;
  if (signals.some(s => s.severity === SEVERITY.MEDIUM)) return SEVERITY.MEDIUM;
  return SEVERITY.LOW;
}

/**
 * Converts a SIGNALS constant key into a human-readable label.
 *
 * @param {string} signalType
 * @returns {string}
 */
function formatSignalType(signalType) {
  const labels = {
    sentiment_mismatch: 'Sentiment Mismatch',
    duplicate_review:   'Duplicate Review',
    burst_activity:     'Burst Activity',
    reviewer_pattern:   'Reviewer Pattern',
  };
  return labels[signalType] ?? signalType.replace(/_/g, ' ');
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Warns about missing DOM elements without throwing.
 */
function validateElements() {
  for (const [name, element] of Object.entries(el)) {
    if (!element) {
      console.warn(`[SidePanel] Missing DOM element: "${name}". UI may be degraded.`);
    }
  }
}
