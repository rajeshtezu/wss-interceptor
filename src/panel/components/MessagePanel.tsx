import { useState, useEffect } from 'react';
import { MessageTable } from './MessageTable';
import { FilterConfig } from './FilterConfig';
import { bridge } from '../services/devtools-bridge';
import type { Connection, Message, JsonPropertyFilter } from '../../shared/types';

interface MessagePanelProps {
  connectionId: string;
  status?: Connection['status'];
  onConnectionClosed?: () => void;
}

const DEFAULT_CLOSE_CODE = '1000';

export function MessagePanel({ connectionId, status, onConnectionClosed }: MessagePanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [filters, setFilters] = useState<JsonPropertyFilter[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [closeCode, setCloseCode] = useState(DEFAULT_CLOSE_CODE);
  const [closeReason, setCloseReason] = useState('');
  const [closeError, setCloseError] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeText, setComposeText] = useState('');
  const [composeStatus, setComposeStatus] = useState<string | null>(null);

  const isClosed = status === 'closed' || status === 'closing';

  useEffect(() => {
    loadMessages();
    loadFilters();

    // Poll for new messages every second
    const interval = setInterval(loadMessages, 1000);

    return () => clearInterval(interval);
  }, [connectionId]);

  // Reset the transient forms whenever a different connection is selected.
  useEffect(() => {
    setShowClose(false);
    setCloseCode(DEFAULT_CLOSE_CODE);
    setCloseReason('');
    setCloseError(null);
    setShowCompose(false);
    setComposeText('');
    setComposeStatus(null);
  }, [connectionId]);

  async function loadMessages() {
    try {
      const msgs = await bridge.getMessages(connectionId);
      setMessages(msgs);
    } catch (err) {
      console.error('[MessagePanel] Error loading messages:', err);
    }
  }

  async function loadFilters() {
    try {
      const f = await bridge.getFilters(connectionId);
      setFilters(f);
    } catch (err) {
      console.error('[MessagePanel] Error loading filters:', err);
    }
  }

  async function handleUpdateFilters(newFilters: JsonPropertyFilter[]) {
    try {
      await bridge.updateFilters(connectionId, newFilters);
      setFilters(newFilters);
    } catch (err) {
      console.error('[MessagePanel] Error updating filters:', err);
    }
  }

  async function handleCloseConnection() {
    setCloseError(null);

    const trimmedCode = closeCode.trim();
    let code: number | undefined;

    if (trimmedCode !== '') {
      code = Number(trimmedCode);
      // Browsers only accept 1000 or 3000-4999; reject anything else up front
      // so the user gets immediate feedback instead of a silent failure.
      if (!Number.isInteger(code) || (code !== 1000 && (code < 3000 || code > 4999))) {
        setCloseError('Close code must be 1000 or between 3000 and 4999.');
        return;
      }
    }

    if (closeReason && new Blob([closeReason]).size > 123) {
      setCloseError('Close reason must be 123 bytes or fewer.');
      return;
    }

    try {
      await bridge.closeConnection(connectionId, code, closeReason || undefined);
      setShowClose(false);
      onConnectionClosed?.();
    } catch (err: any) {
      console.error('[MessagePanel] Error closing connection:', err);
      setCloseError(err?.message ?? 'Failed to close connection.');
    }
  }

  async function handleSendToClient() {
    if (composeText.trim() === '') {
      setComposeStatus('Enter a message payload to send.');
      return;
    }

    try {
      // Sent verbatim as a string, mirroring how servers send text frames.
      await bridge.injectMessage(connectionId, composeText);
      setComposeStatus('Sent to client.');
      loadMessages();
    } catch (err: any) {
      console.error('[MessagePanel] Error sending message to client:', err);
      setComposeStatus(err?.message ?? 'Failed to send message.');
    }
  }

  return (
    <div className="message-panel">
      <div className="message-panel-header">
        <h3>Messages</h3>
        <div className="message-panel-actions">
          <button
            className={`filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Configure filters"
          >
            🔍 Filters {filters.filter(f => f.enabled).length > 0 && `(${filters.filter(f => f.enabled).length})`}
          </button>
          <button
            className={`filter-toggle compose-toggle ${showCompose ? 'active' : ''}`}
            onClick={() => {
              setShowCompose(!showCompose);
              setComposeStatus(null);
            }}
            disabled={isClosed}
            title={isClosed ? 'Connection is closed' : 'Send a message to the page as if it came from the server'}
          >
            ⬇ To client
          </button>
          <button
            className={`filter-toggle close-toggle ${showClose ? 'active' : ''}`}
            onClick={() => setShowClose(!showClose)}
            disabled={isClosed}
            title={isClosed ? 'Connection is already closed' : 'Close this connection with a custom close code'}
          >
            ⏹ Close
          </button>
        </div>
      </div>

      {showCompose && !isClosed && (
        <div className="compose-message">
          <label htmlFor="compose-text">Send to client (delivered as an incoming server message)</label>
          <textarea
            id="compose-text"
            className="compose-editor"
            value={composeText}
            spellCheck={false}
            placeholder={'{\n  "type": "notification",\n  "message": "Hello from the interceptor"\n}'}
            onChange={e => {
              setComposeText(e.target.value);
              setComposeStatus(null);
            }}
          />
          {composeStatus && <p className="compose-status">{composeStatus}</p>}
          <div className="compose-footer">
            <button className="btn-cancel" onClick={() => setShowCompose(false)}>
              Cancel
            </button>
            <button className="btn-approve" onClick={handleSendToClient}>
              Send to client
            </button>
          </div>
        </div>
      )}

      {showClose && !isClosed && (
        <div className="close-connection">
          <div className="close-connection-fields">
            <div className="close-field">
              <label htmlFor="close-code">Close code</label>
              <input
                id="close-code"
                type="number"
                value={closeCode}
                onChange={e => setCloseCode(e.target.value)}
                placeholder="1000"
              />
            </div>
            <div className="close-field close-field-reason">
              <label htmlFor="close-reason">Reason (optional)</label>
              <input
                id="close-reason"
                type="text"
                value={closeReason}
                onChange={e => setCloseReason(e.target.value)}
                placeholder="e.g. Closed by interceptor"
              />
            </div>
          </div>
          <p className="close-hint">
            Valid codes: 1000 (normal) or 3000–4999 (application-specific).
          </p>
          {closeError && <p className="close-error">{closeError}</p>}
          <div className="close-connection-footer">
            <button className="btn-cancel" onClick={() => setShowClose(false)}>
              Cancel
            </button>
            <button className="btn-block" onClick={handleCloseConnection}>
              Close connection
            </button>
          </div>
        </div>
      )}

      {showFilters && (
        <FilterConfig
          filters={filters}
          onUpdateFilters={handleUpdateFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

      <MessageTable
        messages={messages}
        selectedMessage={selectedMessage}
        onSelectMessage={setSelectedMessage}
      />
    </div>
  );
}
