/**
 * @module background/background
 * @description MV3 Service Worker — the central message router and state manager.
 *
 * The background script is the only component with full access to:
 * - chrome.tabs API (to send messages to specific content scripts)
 * - chrome.sidePanel API (to open/configure the side panel)
 * - chrome.storage.local (for persisting lightweight state across popups)
 *
 * Responsibilities:
 * - Route messages between content scripts, popup, and side panel.
 * - Track the active supported tab's platform + product context.
 * - Orchestrate analysis runs (Phase 2: will call analysis/ modules here).
 * - Open the side panel on user request.
 *
 * Architecture Note:
 * In MV3, service workers are stateless across invocations. Any state that
 * must survive a service worker restart MUST be persisted to chrome.storage.local
 * or IndexedDB. In-memory variables (like _activeContext) are convenience caches
 * and are re-populated from storage on the next message if lost.
 */

import { MSG, STORAGE_KEYS, ANALYSIS_STATUS, PLATFORMS } from '../utils/constants.js';
import { isSupportedPage }                               from '../utils/helpers.js';
import { saveSnapshot, getSnapshot, getLatestSnapshot, getSnapshotsForProduct } from '../storage/snapshots.js';
import { createSnapshot }                                from '../models/snapshot.js';

// ─── In-Memory State (non-durable, re-built from messages) ───────────────────

/**
 * Tracks the most recently seen supported tab context.
 * This is a cache — not the source of truth (chrome.storage.local is).
 *
 * @type {{ tabId: number, platform: string, productId: string|null, productTitle: string, url: string }|null}
 */
let _activeContext = null;

// ─── Lifecycle ────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(({ reason }) => {
  console.debug('[Background] Extension installed/updated. Reason:', reason);
  initializeStorage();
});

chrome.runtime.onStartup.addListener(async () => {
  console.debug('[Background] Browser started — service worker awakened.');
  await restoreContextFromStorage();
});

// Runs on every service worker activation (including after being killed by Chrome)
restoreContextFromStorage();

// ─── Message Routing ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message?.type) {
    console.warn('[Background] Received message without type:', message);
    return false;
  }

  console.debug('[Background] Received message:', message.type);

  switch (message.type) {
    case MSG.PAGE_DETECTED:
      handlePageDetected(message.payload, sender.tab);
      return false;

    case MSG.GET_PAGE_STATUS:
      handleGetPageStatus(sendResponse);
      return true; // async response

    case MSG.ANALYSIS_START:
      // Note: sender.tab is undefined for popup messages — handler uses _activeContext
      handleAnalysisStart(sendResponse);
      return true; // async response

    case MSG.OPEN_SIDE_PANEL:
      handleOpenSidePanel(sendResponse);
      return true;

    case MSG.GET_SNAPSHOT:
      handleGetSnapshot(message.payload?.snapshotId, sendResponse);
      return true;

    case MSG.GET_LATEST_SNAPSHOT:
      handleGetLatestSnapshot(sendResponse);
      return true;

    default:
      console.warn('[Background] Unhandled message type:', message.type);
      return false;
  }
});

// ─── Tab Management ───────────────────────────────────────────────────────────

/**
 * Clears the active context when a tracked tab is closed or navigated away.
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  if (_activeContext?.tabId === tabId) {
    console.debug('[Background] Tracked tab closed:', tabId);
    _activeContext = null;
    clearActiveTabState();
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (_activeContext?.tabId !== tabId) return;
  if (changeInfo.status !== 'loading') return;
  if (!changeInfo.url) return;

  if (!isSupportedPage(changeInfo.url)) {
    console.debug('[Background] Tracked tab navigated away from supported page.');
    _activeContext = null;
    clearActiveTabState();
  }
});

// ─── Message Handlers ─────────────────────────────────────────────────────────

/**
 * Handles PAGE_DETECTED from a content script.
 * Updates the active context and persists it to chrome.storage.local.
 *
 * @param {Object} payload
 * @param {chrome.tabs.Tab} tab
 */
function handlePageDetected(payload, tab) {
  if (!tab?.id) return;

  _activeContext = {
    tabId:        tab.id,
    platform:     payload.platform,
    productId:    payload.productId,
    productTitle: payload.productTitle,
    url:          payload.url,
    pagination:   payload.pagination,
  };

  persistActiveTabState(_activeContext);
  console.debug('[Background] Active context updated:', _activeContext.productId, _activeContext.platform);
}

/**
 * Handles GET_PAGE_STATUS from the popup.
 * Returns the current analysis state and active page context.
 *
 * @param {Function} sendResponse
 */
async function handleGetPageStatus(sendResponse) {
  try {
    const state = await chrome.storage.local.get([
      STORAGE_KEYS.ACTIVE_TAB_PLATFORM,
      STORAGE_KEYS.ACTIVE_TAB_PRODUCT,
      STORAGE_KEYS.ANALYSIS_STATE,
    ]);

    sendResponse({
      success: true,
      payload: {
        platform:      state[STORAGE_KEYS.ACTIVE_TAB_PLATFORM] ?? PLATFORMS.UNKNOWN,
        productId:     state[STORAGE_KEYS.ACTIVE_TAB_PRODUCT]  ?? null,
        analysisState: state[STORAGE_KEYS.ANALYSIS_STATE]      ?? ANALYSIS_STATUS.IDLE,
        context:       _activeContext,
      },
    });
  } catch (err) {
    console.error('[Background] Failed to retrieve page status:', err);
    sendResponse({ success: false, error: err.message });
  }
}

/**
 * Handles ANALYSIS_START from the popup.
 * Sends EXTRACT_NOW to the active tab's content script, then processes results.
 *
 * WHY we query the active tab instead of using sender.tab:
 * Messages from the popup have no sender.tab (popups are not tab contexts).
 * We use the _activeContext tabId (set by the content script's PAGE_DETECTED
 * message) as the authoritative target for extraction.
 *
 * @param {Function} sendResponse
 */
async function handleAnalysisStart(sendResponse) {
  if (!_activeContext?.tabId) {
    sendResponse({ success: false, error: 'No supported page is active. Navigate to an Amazon or Google Play page first.' });
    return;
  }

  try {
    await setAnalysisStatus(ANALYSIS_STATUS.EXTRACTING);

    const extraction = await chrome.tabs.sendMessage(_activeContext.tabId, {
      type: MSG.EXTRACT_NOW,
    });

    if (!extraction?.success) {
      throw new Error(extraction?.error ?? 'Extraction returned no data.');
    }

    await setAnalysisStatus(ANALYSIS_STATUS.ANALYZING);

    // TODO(Phase 2): Pass reviews through analysis pipeline before persisting.
    const snapshot = await persistSnapshot(extraction.payload);

    await setAnalysisStatus(ANALYSIS_STATUS.COMPLETE);

    // Notify side panel if open — fails silently if panel is closed.
    notifySidePanel({ type: MSG.SNAPSHOT_READY, payload: { snapshotId: snapshot.id } });

    sendResponse({ success: true, payload: { snapshotId: snapshot.id } });
  } catch (err) {
    console.error('[Background] Analysis failed:', err);
    await setAnalysisStatus(ANALYSIS_STATUS.ERROR);
    sendResponse({ success: false, error: err.message });
  }
}

/**
 * Opens the side panel for the currently tracked supported tab.
 * Falls back to the first active tab if no context is tracked.
 *
 * @param {Function} sendResponse
 */
async function handleOpenSidePanel(sendResponse) {
  try {
    let tabId = _activeContext?.tabId;

    if (!tabId) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = activeTab?.id;
    }

    if (!tabId) {
      sendResponse({ success: false, error: 'No active tab found.' });
      return;
    }

    await chrome.sidePanel.open({ tabId });
    sendResponse({ success: true });
  } catch (err) {
    console.error('[Background] Failed to open side panel:', err);
    sendResponse({ success: false, error: err.message });
  }
}

/**
 * Handles GET_SNAPSHOT from the side panel.
 * Loads a specific snapshot by ID and returns it with its history.
 *
 * @param {string|undefined} snapshotId
 * @param {Function} sendResponse
 */
async function handleGetSnapshot(snapshotId, sendResponse) {
  if (!snapshotId) {
    sendResponse({ success: false, error: 'snapshotId is required.' });
    return;
  }

  try {
    const snapshot = await getSnapshot(snapshotId);

    if (!snapshot) {
      sendResponse({ success: false, error: `Snapshot not found: ${snapshotId}` });
      return;
    }

    const history = await getSnapshotsForProduct(snapshot.productId);

    sendResponse({
      success: true,
      payload: {
        snapshot,
        signals: [], // TODO(Phase 2): Load associated analysis signals
        history,
        summary: null,
      },
    });
  } catch (err) {
    console.error('[Background] Failed to get snapshot:', err);
    sendResponse({ success: false, error: err.message });
  }
}

/**
 * Handles GET_LATEST_SNAPSHOT from the side panel.
 * Loads the most recent snapshot for the currently active product.
 *
 * @param {Function} sendResponse
 */
async function handleGetLatestSnapshot(sendResponse) {
  const productId = _activeContext?.productId;

  if (!productId) {
    sendResponse({ success: false, error: 'No active product.', code: 'NO_SNAPSHOT' });
    return;
  }

  try {
    const snapshot = await getLatestSnapshot(productId);

    if (!snapshot) {
      sendResponse({ success: false, error: 'No snapshots found.', code: 'NO_SNAPSHOT' });
      return;
    }

    const history = await getSnapshotsForProduct(productId);

    sendResponse({
      success: true,
      payload: {
        snapshot,
        signals: [], // TODO(Phase 2): Load associated analysis signals
        history,
        summary: null,
      },
    });
  } catch (err) {
    console.error('[Background] Failed to get latest snapshot:', err);
    sendResponse({ success: false, error: err.message });
  }
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Builds and persists a Snapshot from the extraction payload.
 *
 * WHY reviews are NOT re-normalized here:
 * The content script already ran createReview() on each raw DOM object.
 * Re-running the factory would wastefully re-hash and re-validate objects
 * that are already valid frozen Review models. We trust the content script
 * output — it is the defined normalization boundary.
 *
 * The 'url' field in extractionPayload maps to 'productUrl' in the Snapshot
 * model — this explicit mapping prevents a silent undefined assignment.
 *
 * @param {Object} extractionPayload - Payload from content script EXTRACT_NOW response.
 * @returns {Promise<import('../models/snapshot.js').Snapshot>}
 */
async function persistSnapshot(extractionPayload) {
  const {
    reviews     = [],
    productId,
    platform,
    url,           // content script sends 'url', not 'productUrl'
    productTitle,
  } = extractionPayload;

  const snapshot = createSnapshot({
    productId:    productId    ?? '__unknown__',
    platform:     platform     ?? PLATFORMS.UNKNOWN,
    productUrl:   url          ?? '',
    productTitle: productTitle ?? '',
    reviews: Array.isArray(reviews) ? reviews : [],
  });

  await saveSnapshot(snapshot);
  return snapshot;
}

/**
 * Updates the analysis status in chrome.storage.local.
 *
 * @param {string} status - ANALYSIS_STATUS constant.
 */
async function setAnalysisStatus(status) {
  await chrome.storage.local.set({ [STORAGE_KEYS.ANALYSIS_STATE]: status });
  console.debug('[Background] Analysis status →', status);
}

/**
 * Persists the active tab context to chrome.storage.local.
 *
 * @param {Object} context
 */
async function persistActiveTabState(context) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.ACTIVE_TAB_PLATFORM]: context.platform,
    [STORAGE_KEYS.ACTIVE_TAB_PRODUCT]:  context.productId,
  });
}

/**
 * Clears active tab state from chrome.storage.local.
 */
async function clearActiveTabState() {
  await chrome.storage.local.remove([
    STORAGE_KEYS.ACTIVE_TAB_PLATFORM,
    STORAGE_KEYS.ACTIVE_TAB_PRODUCT,
    STORAGE_KEYS.ANALYSIS_STATE,
  ]);
}

/**
 * Attempts to notify the side panel. Fails silently if it is not open.
 *
 * @param {Object} message
 */
function notifySidePanel(message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // Side panel is not open — this is expected and not an error.
  });
}

/**
 * Sets default values in chrome.storage.local on first install.
 */
async function initializeStorage() {
  const defaults = {
    [STORAGE_KEYS.ANALYSIS_STATE]: ANALYSIS_STATUS.IDLE,
    [STORAGE_KEYS.SETTINGS]: {
      useLLM:  false,
      apiKey:  null,
    },
  };

  await chrome.storage.local.set(defaults);
  console.debug('[Background] Storage initialized with defaults.');
}

/**
 * Restores partial context from chrome.storage.local after a service worker restart.
 *
 * WHY partial restore:
 * - MV3 service workers are killed aggressively by Chrome.
 * - _activeContext.tabId is NOT persisted because tab IDs change across sessions.
 * - Restoring platform + productId is enough for GET_PAGE_STATUS to return
 *   meaningful data to the popup until a new PAGE_DETECTED message arrives.
 */
async function restoreContextFromStorage() {
  try {
    const state = await chrome.storage.local.get([
      STORAGE_KEYS.ACTIVE_TAB_PLATFORM,
      STORAGE_KEYS.ACTIVE_TAB_PRODUCT,
    ]);

    const platform  = state[STORAGE_KEYS.ACTIVE_TAB_PLATFORM];
    const productId = state[STORAGE_KEYS.ACTIVE_TAB_PRODUCT];

    if (platform && platform !== PLATFORMS.UNKNOWN) {
      _activeContext = {
        tabId:        null, // unknown after restart
        platform,
        productId:    productId ?? null,
        productTitle: '',
        url:          '',
        pagination:   null,
      };
      console.debug('[Background] Context restored from storage:', platform, productId);
    }
  } catch (err) {
    console.warn('[Background] Could not restore context from storage:', err.message);
  }
}
