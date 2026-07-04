/**
 * WebSocket Interceptor - Main World Script
 *
 * This script runs in the MAIN world (page context) to intercept WebSocket API.
 * It bypasses the page's CSP by running as a content script with world: 'MAIN'.
 */

console.log('[WS Interceptor] Initializing in MAIN world...');

const OriginalWebSocket = window.WebSocket;
const connections = new Map<string, any>();

window.WebSocket = function(url: string | URL, protocols?: string | string[]) {
  const ws = new OriginalWebSocket(url, protocols);
  const connectionId = 'ws_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  // Store connection reference
  connections.set(connectionId, ws);
  (ws as any)._connectionId = connectionId;
  (ws as any)._pendingOutgoing = new Map();
  (ws as any)._pendingIncoming = new Map();

  console.log('[WS Interceptor] New connection:', connectionId, url);

  // Notify about new connection
  window.postMessage({
    type: 'WS_NEW_CONNECTION',
    connectionId,
    url: typeof url === 'string' ? url : url.toString(),
    timestamp: Date.now()
  }, '*');

  // Intercept send() - outgoing messages
  const originalSend = ws.send.bind(ws);
  ws.send = function(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    const messageId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    console.log('[WS Interceptor] Outgoing message:', messageId);

    window.postMessage({
      type: 'WS_OUTGOING',
      connectionId: (ws as any)._connectionId,
      messageId,
      data,
      timestamp: Date.now()
    }, '*');

    // Store for later sending after approval
    (ws as any)._pendingOutgoing.set(messageId, { data, originalSend });
  };

  // Intercept onmessage - incoming messages
  const descriptor = Object.getOwnPropertyDescriptor(OriginalWebSocket.prototype, 'onmessage');
  if (descriptor) {
    Object.defineProperty(ws, 'onmessage', {
      set: function(handler: ((this: WebSocket, ev: MessageEvent) => any) | null) {
        (ws as any)._originalHandler = handler;

        descriptor.set!.call(ws, function(event: MessageEvent) {
          // Messages we injected ourselves are delivered straight to the page
          // handler; they must not be re-intercepted or held since they didn't
          // originate from the server.
          if ((event as any)._wssInjected) {
            const currentHandler = (ws as any)._originalHandler;
            if (currentHandler) currentHandler.call(ws, event);
            return;
          }

          const messageId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);

          console.log('[WS Interceptor] Incoming message:', messageId);

          window.postMessage({
            type: 'WS_INCOMING',
            connectionId: (ws as any)._connectionId,
            messageId,
            data: event.data,
            timestamp: Date.now()
          }, '*');

          // Store for later delivery after approval
          (ws as any)._pendingIncoming.set(messageId, { event, handler });
        });
      },
      get: function() {
        return (ws as any)._originalHandler;
      }
    });
  }

  // Track connection close
  ws.addEventListener('close', () => {
    console.log('[WS Interceptor] Connection closed:', (ws as any)._connectionId);
    window.postMessage({
      type: 'WS_CLOSED',
      connectionId: (ws as any)._connectionId,
      timestamp: Date.now()
    }, '*');
  });

  // Track connection error
  ws.addEventListener('error', (event) => {
    console.log('[WS Interceptor] Connection error:', (ws as any)._connectionId);
    window.postMessage({
      type: 'WS_ERROR',
      connectionId: (ws as any)._connectionId,
      error: 'WebSocket error',
      timestamp: Date.now()
    }, '*');
  });

  return ws;
} as any;

// Preserve prototype chain
Object.setPrototypeOf(window.WebSocket, OriginalWebSocket);
window.WebSocket.prototype = OriginalWebSocket.prototype;

// The static readyState constants are declared `readonly` in lib.dom.d.ts,
// so assign through a writable view to mirror the native constructor's shape.
const WebSocketCtor = window.WebSocket as unknown as {
  CONNECTING: number;
  OPEN: number;
  CLOSING: number;
  CLOSED: number;
};
WebSocketCtor.CONNECTING = OriginalWebSocket.CONNECTING;
WebSocketCtor.OPEN = OriginalWebSocket.OPEN;
WebSocketCtor.CLOSING = OriginalWebSocket.CLOSING;
WebSocketCtor.CLOSED = OriginalWebSocket.CLOSED;

// Listen for approval messages from content script
window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  const data = event.data;

  if (data.type === 'WS_APPROVE_OUTGOING') {
    const ws = connections.get(data.connectionId);
    if (!ws) return;

    const pending = ws._pendingOutgoing.get(data.messageId);
    if (pending) {
      // Send the edited payload if one was provided, otherwise the original.
      const payload = data.data !== undefined ? data.data : pending.data;
      console.log('[WS Interceptor] Approving outgoing:', data.messageId, data.data !== undefined ? '(modified)' : '');
      pending.originalSend(payload);
      ws._pendingOutgoing.delete(data.messageId);
    }
  }

  if (data.type === 'WS_APPROVE_INCOMING') {
    const ws = connections.get(data.connectionId);
    if (!ws) return;

    const pending = ws._pendingIncoming.get(data.messageId);
    if (pending) {
      console.log('[WS Interceptor] Approving incoming:', data.messageId, data.data !== undefined ? '(modified)' : '');
      // Deliver a fresh event carrying the edited payload when modified;
      // deliver directly to the handler to match how it was originally held.
      const eventToDeliver = data.data !== undefined
        ? makeIncomingEvent(ws, data.data)
        : pending.event;
      if (pending.handler) {
        pending.handler.call(ws, eventToDeliver);
      }
      ws._pendingIncoming.delete(data.messageId);
    }
  }

  if (data.type === 'WS_INJECT_MESSAGE') {
    const ws = connections.get(data.connectionId);
    if (!ws) return;

    console.log('[WS Interceptor] Injecting message toward client:', data.connectionId);
    // Dispatch a real event so both `onmessage` and `addEventListener('message')`
    // consumers receive it, exactly as they would for a genuine server message.
    ws.dispatchEvent(makeIncomingEvent(ws, data.data));
  }

  if (data.type === 'WS_CLOSE_CONNECTION') {
    const ws = connections.get(data.connectionId);
    if (!ws) return;

    closeConnection(ws, data.connectionId, data.code, data.reason);
  }
});

/**
 * Build a MessageEvent that looks like it came from the server for a given
 * socket. The `_wssInjected` marker tells our onmessage interceptor to pass it
 * straight through instead of holding it again.
 */
function makeIncomingEvent(ws: any, data: any): MessageEvent {
  let origin = '';
  try {
    origin = new URL(ws.url).origin;
  } catch {
    // ws.url may be unavailable/relative; origin can stay empty.
  }

  const event = new MessageEvent('message', { data, origin });
  (event as any)._wssInjected = true;
  return event;
}

/**
 * Close a WebSocket with an optional custom close code and reason.
 *
 * The WebSocket API only accepts 1000 or codes in the 3000-4999 range and a
 * reason of at most 123 UTF-8 bytes; anything else makes close() throw. We
 * validate up front and fall back to a bare close() so a bad custom code never
 * leaves the socket open.
 */
function closeConnection(ws: any, connectionId: string, code?: number, reason?: string) {
  const hasCustomCode = typeof code === 'number';
  const isValidCode = hasCustomCode && (code === 1000 || (code >= 3000 && code <= 4999));
  const isValidReason =
    reason === undefined || reason === '' || new Blob([reason]).size <= 123;

  console.log('[WS Interceptor] Closing connection:', connectionId, 'code:', code, 'reason:', reason);

  try {
    if (hasCustomCode && isValidCode && isValidReason) {
      ws.close(code, reason);
    } else if (hasCustomCode && isValidCode) {
      ws.close(code);
    } else {
      if (hasCustomCode && !isValidCode) {
        console.warn(
          '[WS Interceptor] Invalid close code',
          code,
          '- must be 1000 or 3000-4999. Closing without a custom code.'
        );
      }
      ws.close();
    }
  } catch (err) {
    console.error('[WS Interceptor] Failed to close connection:', connectionId, err);
    window.postMessage({
      type: 'WS_ERROR',
      connectionId,
      error: `Failed to close connection: ${(err as Error)?.message ?? String(err)}`,
      timestamp: Date.now()
    }, '*');
  }
}

console.log('[WS Interceptor] Initialized successfully in MAIN world');
