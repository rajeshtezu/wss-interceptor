import type { Message } from '../shared/types';

/**
 * Queue for held messages awaiting approval
 */
export class MessageQueue {
  private queue = new Map<string, Message>();
  private byConnection = new Map<string, Set<string>>();

  add(message: Message): void {
    this.queue.set(message.id, message);

    // Track by connection
    if (!this.byConnection.has(message.connectionId)) {
      this.byConnection.set(message.connectionId, new Set());
    }
    this.byConnection.get(message.connectionId)!.add(message.id);

    console.log('[MessageQueue] Added message to queue:', message.id);
  }

  get(messageId: string): Message | undefined {
    return this.queue.get(messageId);
  }

  getByConnection(connectionId: string): Message[] {
    const messageIds = this.byConnection.get(connectionId);
    if (!messageIds) return [];

    return Array.from(messageIds)
      .map(id => this.queue.get(id))
      .filter((m): m is Message => m !== undefined);
  }

  approve(messageId: string): void {
    const message = this.queue.get(messageId);
    if (message) {
      this.remove(messageId);
      console.log('[MessageQueue] Approved message:', messageId);
    }
  }

  block(messageId: string): void {
    const message = this.queue.get(messageId);
    if (message) {
      this.remove(messageId);
      console.log('[MessageQueue] Blocked message:', messageId);
    }
  }

  remove(messageId: string): void {
    const message = this.queue.get(messageId);
    if (message) {
      this.queue.delete(messageId);
      this.byConnection.get(message.connectionId)?.delete(messageId);
    }
  }

  clear(): void {
    this.queue.clear();
    this.byConnection.clear();
  }
}
