/**
 * @module ui/popup
 * @description Popup UI controller.
 *
 * Handles all logic for the 320×auto popup window. Communicates exclusively
 * with the background service worker — never with content scripts directly.
 *
 * Responsibilities:
 * - Query background for current page status on open.
 * - Render the correct UI state (loading → supported/unsupported → analyzing → complete).
 * - Forward button clicks to background via typed messages.
 * - Update metrics when analysis completes.
 *
 * Strictly NO business logic here. No DOM parsing. No storage access.
 *
 * WHY elements are cached inside DOMContentLoaded (not at module parse time):
 * ES modules in popup pages execute synchronously during HTML parsing, before
 * the DOM is fully built. getElementById calls at module scope return null.
 * Deferring cache population to DOMContentLoaded is the correct pattern.
 */

import { MSG, ANALYSIS_STATUS, PLATFORMS, PLATFORM_LABELS } from '../utils/constants.js';

// ─── DOM Element Cache (populated after DOMContentLoaded) ─────────────────────

/** @type {Record<string, HTMLElement|null>} */
let el = {};

// ─── Initialization ───────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  cacheElements();
  validateElements();
  registerButtonListeners();
  await loadPageStatus();
});

/**
 * Populates the element cache after the DOM is ready.
 * Called once inside DOMContentLoaded.
 */
function cacheElements() {
  el = {
    // States
    stateLoading:     document.getElementById('state-loading'),
    stateUnsupported: document.getElementById('state-unsupported'),
    stateSupported:   document.getElementById('state-supported'),
    stateAnalyzing:   document.getElementById('state-analyzing'),
    stateError:       document.getElementById('state-error'),

    // Product info
    platformBadge:    document.getElementById('platform-badge'),
    productTitle:     document.getElementById('product-title'),
    metricsRow:       document.getElementById('metrics-row'),

    // Metrics
    metricReviews:    document.getElementById('metric-reviews'),
    metricSignals:    document.getElementById('metric-signals'),
    metricRisk:       document.getElementById('metric-risk'),

    // Analysis progress
    analysisStatus:   document.getElementById('analysis-status-text'),
    progressRingFill: document.getElementById('progress-ring-fill'),

    // Error
    errorMessage:     document.getElementById('error-message'),

    // Buttons
    btnAnalyze:       document.getElementById('btn-analyze'),
    btnOpenPanel:     document.getElementById('btn-open-panel'),
  };
}

// ─── Status Loading ───────────────────────────────────────────────────────────

/**
 * Queries the background for current page status and renders accordingly.
 */
async function loadPageStatus() {
  renderState('loading');

  try {
    const response = await chrome.runtime.sendMessage({ type: MSG.GET_PAGE_STATUS });

    if (!response?.success) {
      throw new Error(response?.error ?? 'Failed to load page status.');
    }

    applyPageStatus(response.payload);
  } catch (err) {
    console.error('[Popup] Failed to load page status:', err);
    renderState('error', 'Could not connect to the extension. Try refreshing.');
  }
}

/**
 * Interprets a page status payload and renders the appropriate UI state.
 *
 * @param {Object} payload
 */
function applyPageStatus(payload) {
  const { platform, analysisState, context } = payload;

  if (!context || platform === PLATFORMS.UNKNOWN) {
    renderState('unsupported');
    return;
  }

  if (el.platformBadge) el.platformBadge.textContent = PLATFORM_LABELS[platform] ?? platform;
  if (el.productTitle)  el.productTitle.textContent  = context.productTitle || 'Product page detected';

  switch (analysisState) {
    case ANALYSIS_STATUS.EXTRACTING:
      renderState('analyzing');
      updateAnalysisProgress('Extracting reviews…', 30);
      break;

    case ANALYSIS_STATUS.ANALYZING:
      renderState('analyzing');
      updateAnalysisProgress('Analyzing patterns…', 65);
      break;

    case ANALYSIS_STATUS.COMPLETE:
      renderState('supported');
      enableAnalyzeButton();
      showEmptyMetrics();
      break;

    case ANALYSIS_STATUS.ERROR:
      renderState('error', 'Previous analysis failed. Try again.');
      enableAnalyzeButton();
      break;

    default: // IDLE
      renderState('supported');
      enableAnalyzeButton();
      break;
  }
}

// ─── Button Handlers ──────────────────────────────────────────────────────────

/**
 * Registers click listeners for primary action buttons.
 * Guards against null elements to avoid crashes on malformed HTML.
 */
function registerButtonListeners() {
  el.btnAnalyze?.addEventListener('click', handleAnalyzeClick);
  el.btnOpenPanel?.addEventListener('click', handleOpenPanelClick);
}

/**
 * Triggers an analysis run via the background service worker.
 */
async function handleAnalyzeClick() {
  disableAnalyzeButton();
  renderState('analyzing');
  updateAnalysisProgress('Extracting reviews…', 15);

  try {
    const response = await chrome.runtime.sendMessage({ type: MSG.ANALYSIS_START });

    if (!response?.success) {
      throw new Error(response?.error ?? 'Analysis failed.');
    }

    renderState('supported');
    enableAnalyzeButton();
    showEmptyMetrics();

    // TODO(Phase 2): Populate real metrics from response.payload.snapshotId.

  } catch (err) {
    console.error('[Popup] Analysis error:', err);
    renderState('error', err.message);
    enableAnalyzeButton();
  }
}

/**
 * Requests the background to open the side panel, then closes the popup.
 */
async function handleOpenPanelClick() {
  try {
    const response = await chrome.runtime.sendMessage({ type: MSG.OPEN_SIDE_PANEL });

    if (!response?.success) {
      throw new Error(response?.error ?? 'Could not open panel.');
    }

    window.close();
  } catch (err) {
    console.error('[Popup] Failed to open side panel:', err);
  }
}

// ─── Rendering Primitives ─────────────────────────────────────────────────────

/**
 * Shows one state container and hides all others.
 * Disables the analyze button for every state except 'supported' — callers
 * are responsible for calling enableAnalyzeButton() after this when needed.
 *
 * @param {'loading'|'unsupported'|'supported'|'analyzing'|'error'} stateName
 * @param {string} [errorMsg]
 */
function renderState(stateName, errorMsg = '') {
  const stateMap = {
    loading:     el.stateLoading,
    unsupported: el.stateUnsupported,
    supported:   el.stateSupported,
    analyzing:   el.stateAnalyzing,
    error:       el.stateError,
  };

  for (const [name, node] of Object.entries(stateMap)) {
    if (node) node.hidden = name !== stateName;
  }

  if (stateName === 'error' && errorMsg && el.errorMessage) {
    el.errorMessage.textContent = errorMsg;
  }

  // Default: analyze button disabled until explicitly re-enabled
  disableAnalyzeButton();
}

/**
 * Updates the in-progress analysis label and progress ring arc.
 *
 * @param {string} text       - Human-readable status label.
 * @param {number} progress   - Percentage in [0, 100].
 */
function updateAnalysisProgress(text, progress) {
  if (el.analysisStatus) el.analysisStatus.textContent = text;

  if (el.progressRingFill) {
    const circumference = 125.66; // 2π × r=20
    const offset = circumference - (progress / 100) * circumference;
    el.progressRingFill.style.strokeDashoffset = String(offset);
  }
}

/**
 * Shows placeholder dashes in the metrics row.
 * Real values populated in Phase 2.
 */
function showEmptyMetrics() {
  if (el.metricsRow)      el.metricsRow.hidden   = false;
  if (el.metricReviews)   el.metricReviews.textContent = '—';
  if (el.metricSignals)   el.metricSignals.textContent = '—';
  if (el.metricRisk)      el.metricRisk.textContent    = '—';
}

function enableAnalyzeButton() {
  if (el.btnAnalyze) el.btnAnalyze.disabled = false;
}

function disableAnalyzeButton() {
  if (el.btnAnalyze) el.btnAnalyze.disabled = true;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Warns about missing DOM elements. Never throws — degraded UI is better
 * than a crashed popup.
 */
function validateElements() {
  for (const [name, element] of Object.entries(el)) {
    if (!element) {
      console.warn(`[Popup] Missing DOM element: "${name}". UI may be degraded.`);
    }
  }
}
