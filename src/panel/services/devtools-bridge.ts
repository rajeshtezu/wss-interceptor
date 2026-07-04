import type { Connection, Message, JsonPropertyFilter, DevToolsMessage, DevToolsResponse } from '../../shared/types';

/**
 * Bridge for communication between DevTools panel and service worker
 */
class DevToolsBridge {
  private tabId: number;
  private port: chrome.runtime.Port | null = null;
  private messageId = 0;
  private pendingRequests = new Map<number, { resolve: (response: any) => void, reject: (error: any) => void }>();
  private listeners = new Set<(notification: any) => void>();
  private disconnected = false;
  private reconnectTimeout: number | null = null;
  // Set once the extension has been reloaded/updated/disabled. Unlike a normal
  // MV3 service-worker suspension, this can't be recovered by reconnecting —
  // the DevTools panel has to be reopened — so we stop retrying.
  private contextInvalidated = false;

  constructor() {
    this.tabId = chrome.devtools.inspectedWindow.tabId;
    this.connect();
  }

  private isContextValid(): boolean {
    if (this.contextInvalidated) return false;
    try {
      return Boolean(chrome.runtime?.id);
    } catch {
      return false;
    }
  }

  private connect() {
    if (!this.isContextValid()) {
      this.contextInvalidated = true;
      this.disconnected = true;
      this.port = null;
      return;
    }

    try {
      this.port = chrome.runtime.connect({ name: `devtools_${this.tabId}` });
      this.disconnected = false;

      console.log('[DevTools Bridge] Connected for tab:', this.tabId);

      this.port.onMessage.addListener((message) => {
        // Check if it's a response to a request
        if (message.id !== undefined) {
          const pending = this.pendingRequests.get(message.id);
          if (pending) {
            pending.resolve(message);
            this.pendingRequests.delete(message.id);
          }
        } else {
          // It's a notification from service worker
          this.notifyListeners(message);
        }
      });

      this.port.onDisconnect.addListener(() => {
        console.log('[DevTools Bridge] Disconnected');
        this.disconnected = true;
        this.port = null;

        // Reject all pending requests
        this.pendingRequests.forEach(({ reject }) => {
          reject(new Error('Extension context invalidated'));
        });
        this.pendingRequests.clear();

        // Only reconnect if the extension context is still alive (e.g. the
        // service worker was suspended). If it was invalidated, stop retrying.
        if (!this.isContextValid()) {
          this.contextInvalidated = true;
          return;
        }
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = window.setTimeout(() => {
            this.reconnectTimeout = null;
            console.log('[DevTools Bridge] Attempting to reconnect...');
            this.connect();
          }, 1000);
        }
      });
    } catch (err) {
      this.disconnected = true;
      this.port = null;
      if (this.isContextValid()) {
        console.error('[DevTools Bridge] Failed to connect:', err);
      } else {
        this.contextInvalidated = true;
      }
    }
  }

  private sendMessage(message: DevToolsMessage): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.disconnected || !this.port) {
        reject(new Error('Extension context invalidated'));
        return;
      }

      const id = this.messageId++;
      this.pendingRequests.set(id, { resolve, reject });

      try {
        this.port.postMessage({ ...message, id });
      } catch (err) {
        this.pendingRequests.delete(id);
        reject(err);
      }

      // Timeout after 5 seconds
      setTimeout(() => {
        const pending = this.pendingRequests.get(id);
        if (pending) {
          this.pendingRequests.delete(id);
          pending.reject(new Error('Request timeout'));
        }
      }, 5000);
    });
  }

  async getConnections(): Promise<Connection[]> {
    try {
      const response = await this.sendMessage({ type: 'GET_CONNECTIONS', tabId: this.tabId });
      return response.connections || [];
    } catch (err) {
      console.error('[DevTools Bridge] Error getting connections:', err);
      return [];
    }
  }

  async getMessages(connectionId: string): Promise<Message[]> {
    try {
      const response = await this.sendMessage({ type: 'GET_MESSAGES', connectionId });
      return response.messages || [];
    } catch (err) {
      console.error('[DevTools Bridge] Error getting messages:', err);
      return [];
    }
  }

  async getHeldMessages(connectionId: string): Promise<Message[]> {
    try {
      const response = await this.sendMessage({ type: 'GET_HELD_MESSAGES', connectionId });
      return response.messages || [];
    } catch (err) {
      console.error('[DevTools Bridge] Error getting held messages:', err);
      return [];
    }
  }

  async approveMessage(connectionId: string, messageId: string, data?: any): Promise<void> {
    try {
      await this.sendMessage({ type: 'APPROVE_MESSAGE', connectionId, messageId, data });
    } catch (err) {
      console.error('[DevTools Bridge] Error approving message:', err);
      throw err;
    }
  }

  async injectMessage(connectionId: string, data: any): Promise<void> {
    try {
      await this.sendMessage({ type: 'INJECT_MESSAGE', connectionId, data });
    } catch (err) {
      console.error('[DevTools Bridge] Error injecting message:', err);
      throw err;
    }
  }

  async blockMessage(connectionId: string, messageId: string): Promise<void> {
    try {
      await this.sendMessage({ type: 'BLOCK_MESSAGE', connectionId, messageId });
    } catch (err) {
      console.error('[DevTools Bridge] Error blocking message:', err);
      throw err;
    }
  }

  async updateFilters(connectionId: string, filters: JsonPropertyFilter[]): Promise<void> {
    try {
      await this.sendMessage({ type: 'UPDATE_FILTERS', connectionId, filters });
    } catch (err) {
      console.error('[DevTools Bridge] Error updating filters:', err);
      throw err;
    }
  }

  async closeConnection(connectionId: string, code?: number, reason?: string): Promise<void> {
    try {
      await this.sendMessage({ type: 'CLOSE_CONNECTION', connectionId, code, reason });
    } catch (err) {
      console.error('[DevTools Bridge] Error closing connection:', err);
      throw err;
    }
  }

  async removeConnection(connectionId: string): Promise<void> {
    try {
      await this.sendMessage({ type: 'REMOVE_CONNECTION', connectionId });
    } catch (err) {
      console.error('[DevTools Bridge] Error removing connection:', err);
      throw err;
    }
  }

  async getFilters(connectionId: string): Promise<JsonPropertyFilter[]> {
    try {
      const response = await this.sendMessage({ type: 'GET_FILTERS', connectionId });
      return response.filters || [];
    } catch (err) {
      console.error('[DevTools Bridge] Error getting filters:', err);
      return [];
    }
  }

  onNotification(listener: (notification: any) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(notification: any) {
    this.listeners.forEach(listener => listener(notification));
  }

  isConnected(): boolean {
    return !this.disconnected && this.port !== null;
  }

  isContextInvalidated(): boolean {
    return this.contextInvalidated;
  }
}

export const bridge = new DevToolsBridge();
