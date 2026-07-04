import { ConnectionManager } from './connection-manager';
import { FilterEngine } from './filter-engine';
import { MessageQueue } from './message-queue';
import type { Connection, Message, DevToolsMessage } from '../shared/types';
import { getDataSize, generateId } from '../shared/utils';

console.log('[Service Worker] Initializing...');

const connections = new ConnectionManager();
const filterEngine = new FilterEngine();
const messageQueue = new MessageQueue();

// Track DevTools connections
const devToolsPorts = new Map<number, chrome.runtime.Port>();

// Handle content script messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'WS_EVENT') {
    handleWebSocketEvent(message.event, sender.tab?.id || 0);
    sendResponse({ received: true });
    return true;
  }

  sendResponse({ received: false });
  return true;
});

// Handle DevTools panel connections
chrome.runtime.onConnect.addListener((port) => {
  if (port.name?.startsWith('devtools_')) {
    const tabId = parseInt(port.name.split('_')[1]);
    devToolsPorts.set(tabId, port);

    console.log('[Service Worker] DevTools connected for tab:', tabId);

    port.onMessage.addListener(async (message: any) => {
      const response = await handleDevToolsMessage(message);
      // Include the message id in the response so the bridge can match it
      port.postMessage({ ...response, id: message.id });
    });

    port.onDisconnect.addListener(() => {
      devToolsPorts.delete(tabId);
      console.log('[Service Worker] DevTools disconnected for tab:', tabId);
    });
  }
});

async function handleWebSocketEvent(event: any, tabId: number) {
  console.log('[Service Worker] WebSocket event:', event.type, 'from tab', tabId);

  switch (event.type) {
    case 'WS_NEW_CONNECTION':
      connections.add({
        id: event.connectionId,
        url: event.url,
        tabId,
        status: 'open',
        messageCount: 0,
        createdAt: event.timestamp
      });
      notifyDevTools(tabId, { type: 'CONNECTION_ADDED', connectionId: event.connectionId });
      break;

    case 'WS_OUTGOING':
    case 'WS_INCOMING':
      await handleMessage(event, tabId);
      break;

    case 'WS_CLOSED':
      connections.updateStatus(event.connectionId, 'closed');
      notifyDevTools(tabId, { type: 'CONNECTION_UPDATED', connectionId: event.connectionId });
      break;

    case 'WS_ERROR':
      connections.updateStatus(event.connectionId, 'closed');
      notifyDevTools(tabId, { type: 'CONNECTION_ERROR', connectionId: event.connectionId });
      break;
  }
}

async function handleMessage(event: any, tabId: number) {
  const direction = event.type === 'WS_OUTGOING' ? 'outgoing' : 'incoming';

  console.log('[Service Worker] Processing message:', event.messageId, direction);

  // Check if message should be held by filters
  const shouldHold = await filterEngine.shouldHoldMessage(
    event.connectionId,
    direction,
    event.data
  );

  const message: Message = {
    id: event.messageId,
    connectionId: event.connectionId,
    direction,
    data: event.data,
    timestamp: event.timestamp,
    status: shouldHold ? 'held' : 'passed',
    size: getDataSize(event.data)
  };

  if (shouldHold) {
    // Add to held queue
    messageQueue.add(message);
    console.log('[Service Worker] Message held:', event.messageId);

    // Notify DevTools panel
    notifyDevTools(tabId, {
      type: 'MESSAGE_HELD',
      connectionId: event.connectionId,
      messageId: event.messageId
    });
  } else {
    // Allow through immediately
    await approveMessage(event.connectionId, event.messageId, direction, tabId);
  }

  // Store message for display
  connections.addMessage(event.connectionId, message);

  // Notify DevTools about new message
  notifyDevTools(tabId, {
    type: 'MESSAGE_ADDED',
    connectionId: event.connectionId
  });
}

async function approveMessage(
  connectionId: string,
  messageId: string,
  direction: 'incoming' | 'outgoing',
  tabId: number,
  data?: any
) {
  console.log('[Service Worker] Approving message:', messageId, data !== undefined ? '(modified)' : '');

  // Update status, and persist any edited payload so the table reflects it.
  connections.updateMessageStatus(connectionId, messageId, 'passed');
  if (data !== undefined) {
    connections.updateMessageData(connectionId, messageId, data);
  }

  // Send approval to content script
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'WS_APPROVE_MESSAGE',
      connectionId,
      messageId,
      direction,
      data
    });
  } catch (err) {
    console.error('[Service Worker] Error sending approval:', err);
  }

  // Remove from queue
  messageQueue.approve(messageId);
}

async function injectMessage(connectionId: string, tabId: number, data: any) {
  console.log('[Service Worker] Injecting message toward client:', connectionId);

  // Record the fabricated message so it shows in the panel like a real one.
  const message: Message = {
    id: generateId(),
    connectionId,
    direction: 'incoming',
    data,
    timestamp: Date.now(),
    status: 'passed',
    size: getDataSize(data)
  };
  connections.addMessage(connectionId, message);
  notifyDevTools(tabId, { type: 'MESSAGE_ADDED', connectionId });

  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'WS_INJECT_MESSAGE',
      connectionId,
      data
    });
  } catch (err) {
    console.error('[Service Worker] Error injecting message:', err);
  }
}

async function blockMessage(
  connectionId: string,
  messageId: string
) {
  console.log('[Service Worker] Blocking message:', messageId);

  // Update status
  connections.updateMessageStatus(connectionId, messageId, 'blocked');

  // Remove from queue (don't send approval)
  messageQueue.block(messageId);
}

async function closeConnection(
  connectionId: string,
  tabId: number,
  code?: number,
  reason?: string
) {
  console.log('[Service Worker] Closing connection:', connectionId, 'code:', code, 'reason:', reason);

  // Reflect the pending close in the UI immediately; the real 'closed'
  // status arrives via the WS_CLOSED event once the socket finishes closing.
  connections.updateStatus(connectionId, 'closing');
  notifyDevTools(tabId, { type: 'CONNECTION_UPDATED', connectionId });

  try {
    await chrome.tabs.sendMessage(tabId, {
      type: 'WS_CLOSE_CONNECTION',
      connectionId,
      code,
      reason
    });
  } catch (err) {
    console.error('[Service Worker] Error sending close command:', err);
  }
}

async function handleDevToolsMessage(message: DevToolsMessage): Promise<any> {
  console.log('[Service Worker] DevTools message:', message.type);

  switch (message.type) {
    case 'GET_CONNECTIONS': {
      const conns = connections.getByTabId(message.tabId);
      return { type: 'CONNECTIONS', connections: conns };
    }

    case 'GET_MESSAGES': {
      const messages = connections.getMessages(message.connectionId);
      return { type: 'MESSAGES', messages };
    }

    case 'GET_HELD_MESSAGES': {
      const heldMessages = messageQueue.getByConnection(message.connectionId);
      return { type: 'HELD_MESSAGES', messages: heldMessages };
    }

    case 'APPROVE_MESSAGE': {
      const msg = connections.getMessage(message.connectionId, message.messageId);
      if (msg) {
        const conn = connections.get(message.connectionId);
        if (conn) {
          await approveMessage(
            message.connectionId,
            message.messageId,
            msg.direction,
            conn.tabId,
            message.data
          );
        }
      }
      return { type: 'SUCCESS', success: true };
    }

    case 'BLOCK_MESSAGE': {
      await blockMessage(message.connectionId, message.messageId);
      return { type: 'SUCCESS', success: true };
    }

    case 'INJECT_MESSAGE': {
      const conn = connections.get(message.connectionId);
      if (!conn) {
        return { type: 'ERROR', error: 'Connection not found' };
      }
      await injectMessage(message.connectionId, conn.tabId, message.data);
      return { type: 'SUCCESS', success: true };
    }

    case 'UPDATE_FILTERS': {
      await filterEngine.updateFilters(message.connectionId, message.filters);
      return { type: 'SUCCESS', success: true };
    }

    case 'GET_FILTERS': {
      const filters = filterEngine.getFilters(message.connectionId);
      return { type: 'FILTERS', filters };
    }

    case 'CLOSE_CONNECTION': {
      const conn = connections.get(message.connectionId);
      if (!conn) {
        return { type: 'ERROR', error: 'Connection not found' };
      }
      await closeConnection(message.connectionId, conn.tabId, message.code, message.reason);
      return { type: 'SUCCESS', success: true };
    }

    case 'REMOVE_CONNECTION': {
      const conn = connections.get(message.connectionId);
      const tabId = conn?.tabId;

      connections.remove(message.connectionId);
      messageQueue.removeByConnection(message.connectionId);
      await filterEngine.removeFilters(message.connectionId);

      if (tabId !== undefined) {
        notifyDevTools(tabId, { type: 'CONNECTION_REMOVED', connectionId: message.connectionId });
      }
      return { type: 'SUCCESS', success: true };
    }

    default:
      return { type: 'ERROR', error: 'Unknown message type' };
  }
}

function notifyDevTools(tabId: number, notification: any) {
  const port = devToolsPorts.get(tabId);
  if (port) {
    try {
      port.postMessage(notification);
    } catch (err) {
      console.error('[Service Worker] Error notifying DevTools:', err);
    }
  }
}

console.log('[Service Worker] Initialized successfully');
