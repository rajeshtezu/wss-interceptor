/**
 * WebSocket Interceptor Content Script - Isolated World
 *
 * This script runs in the ISOLATED world (content script context).
 * It handles communication between the MAIN world script and the service worker.
 */

console.log('[Content Script] WebSocket Interceptor loaded');

// Once the extension is reloaded/updated/disabled, this content script keeps
// running against a dead context. Any chrome.* call then throws synchronously
// with "Extension context invalidated". Track that so we stop forwarding
// instead of spamming uncaught errors on every page message.
let contextValid = true;

function isContextValid(): boolean {
  if (!contextValid) return false;
  try {
    return Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

function isContextInvalidatedError(err: unknown): boolean {
  return err instanceof Error && err.message.includes('Extension context invalidated');
}

// Forward page messages to service worker
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!event.data.type?.startsWith('WS_')) return;
  if (!isContextValid()) return;

  console.log('[Content Script] Forwarding to service worker:', event.data.type);

  try {
    // sendMessage can reject asynchronously (no receiver) or throw synchronously
    // (context gone), so we handle both paths.
    chrome.runtime.sendMessage({
      type: 'WS_EVENT',
      event: event.data
    }).catch((err) => {
      if (isContextInvalidatedError(err)) {
        contextValid = false;
      } else {
        console.error('[Content Script] Error forwarding message:', err);
      }
    });
  } catch (err) {
    if (isContextInvalidatedError(err)) {
      contextValid = false;
    } else {
      console.error('[Content Script] Error forwarding message:', err);
    }
  }
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
      messageId: message.messageId,
      data: message.data
    }, '*');
  }

  if (message.type === 'WS_INJECT_MESSAGE') {
    console.log('[Content Script] Received inject command:', message.connectionId);

    window.postMessage({
      type: 'WS_INJECT_MESSAGE',
      connectionId: message.connectionId,
      data: message.data
    }, '*');
  }

  if (message.type === 'WS_CLOSE_CONNECTION') {
    console.log('[Content Script] Received close command:', message.connectionId);

    window.postMessage({
      type: 'WS_CLOSE_CONNECTION',
      connectionId: message.connectionId,
      code: message.code,
      reason: message.reason
    }, '*');
  }

  sendResponse({ received: true });
  return true;
});
