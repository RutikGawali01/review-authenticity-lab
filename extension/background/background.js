/**
 * @module background/background
 * @description Central message router and background orchestrator for Review Authenticity Lab.
 * Coordinates communication between Popup, Side Panel, and Tab Content Scripts.
 */

import { MSG, PLATFORMS, ANALYSIS_STATUS } from '../utils/constants.js';
import { detectPlatform } from '../utils/helpers.js';

console.log('[Background] Service worker initialized.');

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Background] Extension installed/updated. Reason:', details.reason);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Received message:', message?.type, 'from:', sender.tab ? `Tab ${sender.tab.id}` : 'Popup/UI');

  handleMessage(message, sender)
    .then((response) => sendResponse(response))
    .catch((err) => {
      console.error('[Background] Message handling error:', err);
      sendResponse({ success: false, error: err.message || 'Internal background error.' });
    });

  return true; // Keep message channel open for async sendResponse
});

/**
 * Routes incoming typed messages to dedicated handlers.
 *
 * @param {Object} message - Incoming message payload containing `type`.
 * @param {chrome.runtime.MessageSender} sender
 * @returns {Promise<Object>} Response object.
 */
async function handleMessage(message, sender) {
  if (!message || typeof message !== 'object' || !message.type) {
    return { success: false, error: 'Invalid message format: missing "type" field.' };
  }

  switch (message.type) {
    case MSG.PING:
      return { success: true, payload: { status: 'PONG' } };

    case MSG.GET_PAGE_STATUS:
      return handleGetPageStatus();

    case MSG.ANALYSIS_START:
      return handleAnalysisStart();

    case MSG.OPEN_SIDE_PANEL:
      return handleOpenSidePanel(sender);

    default:
      console.warn('[Background] Unhandled message type:', message.type);
      return { success: false, error: `Unhandled message type: ${message.type}` };
  }
}

/**
 * Gets the current page status, detected platform, and tab context.
 *
 * @returns {Promise<Object>}
 */
async function handleGetPageStatus() {
  const activeTab = await getActiveTab();
  if (!activeTab || !activeTab.url) {
    return { success: false, error: 'No active browser tab found.' };
  }

  const platform = detectPlatform(activeTab.url);

  return {
    success: true,
    payload: {
      platform,
      analysisState: ANALYSIS_STATUS.IDLE,
      context: {
        url: activeTab.url,
        productTitle: activeTab.title || '',
        tabId: activeTab.id,
      },
    },
  };
}

/**
 * Coordinates review extraction by sending EXTRACT_REVIEWS to the active tab's content script.
 *
 * @returns {Promise<Object>}
 */
async function handleAnalysisStart() {
  console.log('[Background] Received ANALYSIS_START request.');
  const activeTab = await getActiveTab();

  if (!activeTab || !activeTab.id || !activeTab.url) {
    return { success: false, error: 'No active tab available for review analysis.' };
  }

  const platform = detectPlatform(activeTab.url);
  if (platform === PLATFORMS.UNKNOWN) {
    return { success: false, error: 'Current page is not a supported review platform (Amazon or Google Play required).' };
  }

  console.log(`[Background] Sending EXTRACT_REVIEWS to tab ${activeTab.id}...`);

  try {
    const contentResponse = await sendTabMessage(activeTab.id, { type: MSG.EXTRACT_REVIEWS });

    if (!contentResponse || !contentResponse.success) {
      const errMsg = contentResponse?.error || 'Content script failed to extract reviews.';
      console.error('[Background] Extraction error from content script:', errMsg);
      return { success: false, error: errMsg };
    }

    console.log(`[Background] Received ${contentResponse.reviewsCount} reviews from content script. Forwarding results to popup.`);

    return {
      success: true,
      payload: {
        status: ANALYSIS_STATUS.COMPLETE,
        reviewsCount: contentResponse.reviewsCount || 0,
        reviews: contentResponse.reviews || [],
        url: contentResponse.url || activeTab.url,
        pageTitle: contentResponse.pageTitle || activeTab.title,
      },
    };
  } catch (err) {
    console.error('[Background] Messaging error with content script:', err.message);
    return {
      success: false,
      error: 'Content script not responding. Please refresh the product page and try again.',
    };
  }
}

/**
 * Opens the extension side panel for the current window.
 *
 * @param {chrome.runtime.MessageSender} sender
 * @returns {Promise<Object>}
 */
async function handleOpenSidePanel(sender) {
  try {
    const activeTab = await getActiveTab();
    if (chrome.sidePanel && typeof chrome.sidePanel.open === 'function' && activeTab?.windowId) {
      await chrome.sidePanel.open({ windowId: activeTab.windowId });
      return { success: true };
    }
    return { success: false, error: 'Side Panel API is not supported or unavailable in this Chrome version.' };
  } catch (err) {
    console.error('[Background] Failed to open side panel:', err);
    return { success: false, error: err.message };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Queries Chrome tabs API for the currently active tab in the focused window.
 *
 * @returns {Promise<chrome.tabs.Tab|null>}
 */
function getActiveTab() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.tabs?.query) {
      resolve(null);
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        console.warn('[Background] Error querying active tab:', chrome.runtime.lastError.message);
        resolve(null);
      } else {
        resolve(tabs && tabs.length > 0 ? tabs[0] : null);
      }
    });
  });
}

/**
 * Sends a message to a specific tab's content script safely wrapped in a promise.
 *
 * @param {number} tabId
 * @param {Object} message
 * @returns {Promise<Object>}
 */
function sendTabMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.tabs?.sendMessage) {
      reject(new Error('chrome.tabs.sendMessage API unavailable.'));
      return;
    }

    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}
