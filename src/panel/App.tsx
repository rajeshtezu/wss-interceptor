import { useState, useEffect, useRef } from 'react';
import { ConnectionList } from './components/ConnectionList';
import { MessagePanel } from './components/MessagePanel';
import { HeldMessageModal } from './components/HeldMessageModal';
import { bridge } from './services/devtools-bridge';
import type { Connection, Message } from '../shared/types';
import './App.css';

export default function App() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [heldMessages, setHeldMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [contextInvalidated, setContextInvalidated] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);

  // Load connections
  useEffect(() => {
    loadConnections();

    // Poll for connections every 2 seconds
    const interval = setInterval(loadConnections, 2000);

    // Listen for notifications
    const unsubscribe = bridge.onNotification((notification) => {
      console.log('[App] Notification:', notification);

      if (
        notification.type === 'CONNECTION_ADDED' ||
        notification.type === 'CONNECTION_UPDATED' ||
        notification.type === 'CONNECTION_REMOVED'
      ) {
        loadConnections();
      }

      if (notification.type === 'MESSAGE_HELD' && selectedConnectionId) {
        loadHeldMessages(selectedConnectionId);
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [selectedConnectionId]);

  // Select first connection by default
  useEffect(() => {
    if (connections.length > 0 && !selectedConnectionId) {
      setSelectedConnectionId(connections[0].id);
    }
  }, [connections, selectedConnectionId]);

  // Load held messages when connection changes
  useEffect(() => {
    if (selectedConnectionId) {
      loadHeldMessages(selectedConnectionId);
    }
  }, [selectedConnectionId]);

  async function loadConnections() {
    if (bridge.isContextInvalidated()) {
      setContextInvalidated(true);
      setLoading(false);
      return;
    }

    try {
      const conns = await bridge.getConnections();
      setConnections(conns);
      if (loading && bridge.isConnected()) {
        setLoading(false);
      }
    } catch (err: any) {
      console.error('[App] Error loading connections:', err);
      if (bridge.isContextInvalidated()) {
        setContextInvalidated(true);
        setLoading(false);
      }
    }
  }

  async function loadHeldMessages(connectionId: string) {
    try {
      const messages = await bridge.getHeldMessages(connectionId);
      setHeldMessages(messages);
    } catch (err) {
      console.error('[App] Error loading held messages:', err);
    }
  }

  async function handleApproveMessage(messageId: string, data?: any) {
    if (!selectedConnectionId) return;

    try {
      await bridge.approveMessage(selectedConnectionId, messageId, data);
      setHeldMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      console.error('[App] Error approving message:', err);
    }
  }

  async function handleBlockMessage(messageId: string) {
    if (!selectedConnectionId) return;

    try {
      await bridge.blockMessage(selectedConnectionId, messageId);
      setHeldMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      console.error('[App] Error blocking message:', err);
    }
  }

  async function handleRemoveConnection(connectionId: string) {
    try {
      await bridge.removeConnection(connectionId);

      // Drop it from local state right away so the list updates without
      // waiting for the next poll, and clear the selection if needed.
      setConnections(prev => prev.filter(c => c.id !== connectionId));
      if (selectedConnectionId === connectionId) {
        setSelectedConnectionId(null);
      }
    } catch (err) {
      console.error('[App] Error removing connection:', err);
    }
  }

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return;
      // The sidebar is anchored to the left edge, so the pointer's X position
      // maps directly to the desired width. Clamp to keep it usable.
      const newWidth = Math.min(Math.max(ev.clientX, 180), 640);
      setSidebarWidth(newWidth);
    };

    const stopResize = () => {
      isResizingRef.current = false;
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stopResize);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stopResize);
  }

  if (contextInvalidated) {
    return (
      <div className="app loading">
        <div className="context-invalidated">
          <div className="empty-icon">🔄</div>
          <h3>Extension was reloaded</h3>
          <p>Close and reopen DevTools to reconnect the WebSocket Interceptor.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app loading">
        <div className="loading-message">Loading WebSocket Interceptor...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar" style={{ width: sidebarWidth }}>
        <div className="sidebar-header">
          <h2>Connections</h2>
          <span className="connection-count">{connections.length}</span>
        </div>
        <ConnectionList
          connections={connections}
          selectedId={selectedConnectionId}
          onSelect={setSelectedConnectionId}
          onRemove={handleRemoveConnection}
        />
      </aside>

      <div
        className={`sidebar-resizer ${isResizing ? 'resizing' : ''}`}
        onMouseDown={startResize}
        role="separator"
        aria-orientation="vertical"
        title="Drag to resize"
      />

      <main className="main-content">
        {selectedConnectionId ? (
          <MessagePanel
            connectionId={selectedConnectionId}
            status={connections.find(c => c.id === selectedConnectionId)?.status}
            onConnectionClosed={loadConnections}
          />
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🔌</div>
            <h3>No WebSocket connection selected</h3>
            <p>
              {connections.length === 0
                ? 'Open a page with WebSocket connections to start intercepting messages'
                : 'Select a connection from the left sidebar'}
            </p>
          </div>
        )}
      </main>

      {heldMessages.length > 0 && (
        <HeldMessageModal
          messages={heldMessages}
          onApprove={handleApproveMessage}
          onBlock={handleBlockMessage}
          onClose={() => setHeldMessages([])}
        />
      )}
    </div>
  );
}
