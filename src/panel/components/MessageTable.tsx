import { useRef, useState } from 'react';
import type { Message } from '../../shared/types';
import { formatTime, formatBytes, truncate, prettyPrint } from '../../shared/utils';

interface MessageTableProps {
  messages: Message[];
  selectedMessage: Message | null;
  onSelectMessage: (message: Message) => void;
}

export function MessageTable({ messages, selectedMessage, onSelectMessage }: MessageTableProps) {
  const [detailsTab, setDetailsTab] = useState<'preview' | 'raw'>('preview');
  const [detailsHeight, setDetailsHeight] = useState(250);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = detailsHeight;
    setIsResizing(true);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handleMove = (ev: MouseEvent) => {
      // Dragging the handle upward should make the details pane taller.
      const containerHeight = containerRef.current?.clientHeight ?? window.innerHeight;
      const max = Math.max(150, containerHeight - 120);
      const newHeight = Math.min(Math.max(startHeight + (startY - ev.clientY), 100), max);
      setDetailsHeight(newHeight);
    };

    const stopResize = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stopResize);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stopResize);
  }

  if (messages.length === 0) {
    return (
      <div className="message-table-empty">
        <p>No messages yet. Messages will appear here when WebSocket activity is detected.</p>
      </div>
    );
  }

  return (
    <div className="message-table-container" ref={containerRef}>
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
        <>
          <div
            className={`details-resizer ${isResizing ? 'resizing' : ''}`}
            onMouseDown={startResize}
            role="separator"
            aria-orientation="horizontal"
            title="Drag to resize"
          />
          <div className="message-details" style={{ height: detailsHeight }}>
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
              <pre className="message-json">{prettyPrint(selectedMessage.data)}</pre>
            ) : (
              <pre className="message-raw">{String(selectedMessage.data)}</pre>
            )}
          </div>
          </div>
        </>
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
