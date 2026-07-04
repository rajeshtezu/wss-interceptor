import type { Connection } from '../../shared/types';

interface ConnectionListProps {
  connections: Connection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

export function ConnectionList({ connections, selectedId, onSelect, onRemove }: ConnectionListProps) {
  if (connections.length === 0) {
    return (
      <div className="connection-list-empty">
        <p>No WebSocket connections detected</p>
      </div>
    );
  }

  return (
    <div className="connection-list">
      {connections.map(connection => (
        <div
          key={connection.id}
          className={`connection-item ${selectedId === connection.id ? 'selected' : ''}`}
          onClick={() => onSelect(connection.id)}
        >
          <div className="connection-status">
            <span className={`status-indicator status-${connection.status}`} />
            <span className="status-text">{connection.status}</span>
          </div>
          <div className="connection-url" title={connection.url}>
            {truncateUrl(connection.url)}
          </div>
          {connection.messageCount > 0 && (
            <div className="connection-badge">{connection.messageCount}</div>
          )}
          <button
            className="connection-remove"
            title="Remove connection from list"
            aria-label="Remove connection"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(connection.id);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

function truncateUrl(url: string, maxLength: number = 50): string {
  if (url.length <= maxLength) return url;

  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname + urlObj.search;
    const host = urlObj.host;

    if (host.length + path.length <= maxLength) {
      return host + path;
    }

    const availableLength = maxLength - host.length - 3; // 3 for "..."
    if (availableLength > 0) {
      return host + path.substring(0, availableLength) + '...';
    }

    return host.substring(0, maxLength - 3) + '...';
  } catch {
    return url.substring(0, maxLength) + '...';
  }
}
