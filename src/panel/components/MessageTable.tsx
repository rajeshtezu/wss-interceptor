import { useState } from 'react';
import type { Message } from '../../shared/types';
import { formatTime, formatBytes, truncate, formatJSON } from '../../shared/utils';

interface MessageTableProps {
  messages: Message[];
  selectedMessage: Message | null;
  onSelectMessage: (message: Message) => void;
}

export function MessageTable({ messages, selectedMessage, onSelectMessage }: MessageTableProps) {
  const [detailsTab, setDetailsTab] = useState<'preview' | 'raw'>('preview');

  if (messages.length === 0) {
    return (
      <div className="message-table-empty">
        <p>No messages yet. Messages will appear here when WebSocket activity is detected.</p>
      </div>
    );
  }

  return (
    <div className="message-table-container">
      <div className="message-table">
        <div className="message-table-header">
          <div className="col-direction">Dir</div>
          <div className="col-time">Time</div>
          <div className="col-size">Size</div>
          <div className="col-status">Status</div>
          <div className="col-preview">Preview</div>
        </div>

        <div className="message-table-body">
          {messages.map(message => (
            <div
              key={message.id}
              className={`message-row ${selectedMessage?.id === message.id ? 'selected' : ''} status-${message.status}`}
              onClick={() => onSelectMessage(message)}
            >
              <div className="col-direction">
                <span className={`direction-icon ${message.direction}`}>
                  {message.direction === 'outgoing' ? '↑' : '↓'}
                </span>
              </div>
              <div className="col-time">{formatTime(message.timestamp)}</div>
              <div className="col-size">{formatBytes(message.size || 0)}</div>
              <div className="col-status">
                <span className={`status-badge status-${message.status}`}>
                  {message.status}
                </span>
              </div>
              <div className="col-preview">{getPreview(message.data)}</div>
            </div>
          ))}
        </div>
      </div>

      {selectedMessage && (
        <div className="message-details">
          <div className="message-details-header">
            <h4>Message Details</h4>
            <div className="message-details-tabs">
              <button
                className={detailsTab === 'preview' ? 'active' : ''}
                onClick={() => setDetailsTab('preview')}
              >
                Preview
              </button>
              <button
                className={detailsTab === 'raw' ? 'active' : ''}
                onClick={() => setDetailsTab('raw')}
              >
                Raw
              </button>
            </div>
          </div>

          <div className="message-details-content">
            {detailsTab === 'preview' ? (
              <pre className="message-json">{formatJSON(selectedMessage.data)}</pre>
            ) : (
              <pre className="message-raw">{String(selectedMessage.data)}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getPreview(data: any): string {
  try {
    if (typeof data === 'string') {
      return truncate(data, 100);
    }
    return truncate(JSON.stringify(data), 100);
  } catch {
    return truncate(String(data), 100);
  }
}
