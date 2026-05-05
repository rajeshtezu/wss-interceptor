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
      console.log('[WS Interceptor] Approving outgoing:', data.messageId);
      pending.originalSend(pending.data);
      ws._pendingOutgoing.delete(data.messageId);
    }
  }

  if (data.type === 'WS_APPROVE_INCOMING') {
    const ws = connections.get(data.connectionId);
    if (!ws) return;

    const pending = ws._pendingIncoming.get(data.messageId);
    if (pending) {
      console.log('[WS Interceptor] Approving incoming:', data.messageId);
      if (pending.handler) {
        pending.handler.call(ws, pending.event);
      }
      ws._pendingIncoming.delete(data.messageId);
    }
  }
});

console.log('[WS Interceptor] Initialized successfully in MAIN world');
