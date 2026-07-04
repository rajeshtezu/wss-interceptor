// Connection types
export interface Connection {
  id: string;
  url: string;
  tabId: number;
  status: 'connecting' | 'open' | 'closing' | 'closed';
  messageCount: number;
  createdAt: number;
}

// Message types
export interface Message {
  id: string;
  connectionId: string;
  direction: 'incoming' | 'outgoing';
  data: any;
  timestamp: number;
  status: 'held' | 'passed' | 'blocked';
  size?: number;
}

// Filter types
export interface JsonPropertyFilter {
  id: string;
  enabled: boolean;
  propertyPath: string;
  operator: 'equals' | 'contains' | 'regex' | 'exists';
  value: string;
  direction: 'incoming' | 'outgoing' | 'both';
}

export interface FilterSet {
  connectionId: string;
  holdMode: boolean;
  filters: JsonPropertyFilter[];
  matchMode: 'any' | 'all';
}

// WebSocket event types (page context → content script → service worker)
export type WSEvent =
  | { type: 'WS_NEW_CONNECTION'; connectionId: string; url: string; timestamp: number }
  | { type: 'WS_OUTGOING'; connectionId: string; messageId: string; data: any; timestamp: number }
  | { type: 'WS_INCOMING'; connectionId: string; messageId: string; data: any; timestamp: number }
  | { type: 'WS_CLOSED'; connectionId: string; timestamp: number }
  | { type: 'WS_ERROR'; connectionId: string; error: string; timestamp: number };

// Approval messages (service worker → content script → page context)
export interface WSApproval {
  type: 'WS_APPROVE_MESSAGE';
  connectionId: string;
  messageId: string;
  direction: 'incoming' | 'outgoing';
  // When present, deliver/send this payload instead of the original one.
  data?: any;
}

// Inject a fabricated message toward the page (simulate server → client)
export interface WSInject {
  type: 'WS_INJECT_MESSAGE';
  connectionId: string;
  data: any;
}

// Close command (service worker → content script → page context)
export interface WSCloseCommand {
  type: 'WS_CLOSE_CONNECTION';
  connectionId: string;
  code?: number;
  reason?: string;
}

// DevTools panel ↔ service worker messages
export type DevToolsMessage =
  | { type: 'GET_CONNECTIONS'; tabId: number }
  | { type: 'GET_MESSAGES'; connectionId: string }
  | { type: 'GET_HELD_MESSAGES'; connectionId: string }
  | { type: 'APPROVE_MESSAGE'; messageId: string; connectionId: string; data?: any }
  | { type: 'BLOCK_MESSAGE'; messageId: string; connectionId: string }
  | { type: 'INJECT_MESSAGE'; connectionId: string; data: any }
  | { type: 'UPDATE_FILTERS'; connectionId: string; filters: JsonPropertyFilter[] }
  | { type: 'GET_FILTERS'; connectionId: string }
  | { type: 'CLOSE_CONNECTION'; connectionId: string; code?: number; reason?: string }
  | { type: 'REMOVE_CONNECTION'; connectionId: string };

export type DevToolsResponse =
  | { type: 'CONNECTIONS'; connections: Connection[] }
  | { type: 'MESSAGES'; messages: Message[] }
  | { type: 'HELD_MESSAGES'; messages: Message[] }
  | { type: 'FILTERS'; filters: JsonPropertyFilter[] }
  | { type: 'SUCCESS'; success: boolean }
  | { type: 'ERROR'; error: string };
