import type { Connection, Message } from '../shared/types';

/**
 * Manages WebSocket connections and their messages
 */
export class ConnectionManager {
  private connections = new Map<string, Connection>();
  private messages = new Map<string, Message[]>();
  private readonly MAX_MESSAGES_PER_CONNECTION = 1000;

  add(connection: Connection): void {
    this.connections.set(connection.id, connection);
    this.messages.set(connection.id, []);
    console.log('[ConnectionManager] Added connection:', connection.id, connection.url);
  }

  get(id: string): Connection | undefined {
    return this.connections.get(id);
  }

  getByTabId(tabId: number): Connection[] {
    return Array.from(this.connections.values())
      .filter(conn => conn.tabId === tabId);
  }

  getAll(): Connection[] {
    return Array.from(this.connections.values());
  }

  updateStatus(id: string, status: Connection['status']): void {
    const connection = this.connections.get(id);
    if (connection) {
      connection.status = status;
    }
  }

  remove(id: string): void {
    this.connections.delete(id);
    this.messages.delete(id);
    console.log('[ConnectionManager] Removed connection:', id);
  }

  addMessage(connectionId: string, message: Message): void {
    const messages = this.messages.get(connectionId);
    if (!messages) return;

    messages.push(message);

    // Limit messages to prevent memory issues
    if (messages.length > this.MAX_MESSAGES_PER_CONNECTION) {
      messages.shift();
    }

    // Update message count
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.messageCount = messages.length;
    }
  }

  getMessages(connectionId: string): Message[] {
    return this.messages.get(connectionId) || [];
  }

  getMessage(connectionId: string, messageId: string): Message | undefined {
    const messages = this.messages.get(connectionId);
    return messages?.find(m => m.id === messageId);
  }

  updateMessageStatus(connectionId: string, messageId: string, status: Message['status']): void {
    const message = this.getMessage(connectionId, messageId);
    if (message) {
      message.status = status;
    }
  }

  clear(): void {
    this.connections.clear();
    this.messages.clear();
  }
}
