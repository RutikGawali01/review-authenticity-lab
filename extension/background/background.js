/**
 * @module background/background
 * @description Manifest V3 Service Worker.
 * Listens for extension events, logs startup, and routes messages.
 */

// Log startup when service worker is initialized
console.log('[Background] Review Authenticity Lab service worker initialized.');

// Listen for extension installation or update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Background] Extension installed/updated. Reason:', details.reason);
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Received message:', message, 'from:', sender.tab ? `Tab ${sender.tab.id}` : 'Extension UI');

  if (message.action === 'PING') {
    sendResponse({ status: 'PONG' });
  }

  return true; // Keep channel open for async response
});
