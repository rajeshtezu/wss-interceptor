/**
 * WebSocket Interceptor Content Script - Isolated World
 *
 * This script runs in the ISOLATED world (content script context).
 * It handles communication between the MAIN world script and the service worker.
 */

console.log('[Content Script] WebSocket Interceptor loaded');

// Forward page messages to service worker
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!event.data.type?.startsWith('WS_')) return;

  console.log('[Content Script] Forwarding to service worker:', event.data.type);

  chrome.runtime.sendMessage({
    type: 'WS_EVENT',
    tabId: chrome.runtime.id,
    event: event.data
  }).catch((err) => {
    console.error('[Content Script] Error forwarding message:', err);
  });
});

// Listen for approval messages from service worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'WS_APPROVE_MESSAGE') {
    console.log('[Content Script] Received approval:', message.messageId);

    window.postMessage({
      type: message.direction === 'outgoing'
        ? 'WS_APPROVE_OUTGOING'
        : 'WS_APPROVE_INCOMING',
      connectionId: message.connectionId,
      messageId: message.messageId
    }, '*');
  }

  sendResponse({ received: true });
  return true;
});
