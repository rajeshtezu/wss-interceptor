import { useState, useEffect } from 'react';
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

  // Load connections
  useEffect(() => {
    loadConnections();

    // Poll for connections every 2 seconds
    const interval = setInterval(loadConnections, 2000);

    // Listen for notifications
    const unsubscribe = bridge.onNotification((notification) => {
      console.log('[App] Notification:', notification);

      if (notification.type === 'CONNECTION_ADDED' || notification.type === 'CONNECTION_UPDATED') {
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
    try {
      const conns = await bridge.getConnections();
      setConnections(conns);
      if (loading && bridge.isConnected()) {
        setLoading(false);
      }
    } catch (err: any) {
      console.error('[App] Error loading connections:', err);
      // Don't show error if extension is being reloaded
      if (!err.message?.includes('Extension context invalidated')) {
        // Keep showing loading state, will retry
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

  async function handleApproveMessage(messageId: string) {
    if (!selectedConnectionId) return;

    try {
      await bridge.approveMessage(selectedConnectionId, messageId);
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

  if (loading) {
    return (
      <div className="app loading">
        <div className="loading-message">Loading WebSocket Interceptor...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Connections</h2>
          <span className="connection-count">{connections.length}</span>
        </div>
        <ConnectionList
          connections={connections}
          selectedId={selectedConnectionId}
          onSelect={setSelectedConnectionId}
        />
      </aside>

      <main className="main-content">
        {selectedConnectionId ? (
          <MessagePanel connectionId={selectedConnectionId} />
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
