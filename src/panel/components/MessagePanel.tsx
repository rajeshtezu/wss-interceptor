import { useState, useEffect } from 'react';
import { MessageTable } from './MessageTable';
import { FilterConfig } from './FilterConfig';
import { bridge } from '../services/devtools-bridge';
import type { Message, JsonPropertyFilter } from '../../shared/types';

interface MessagePanelProps {
  connectionId: string;
}

export function MessagePanel({ connectionId }: MessagePanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [filters, setFilters] = useState<JsonPropertyFilter[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadMessages();
    loadFilters();

    // Poll for new messages every second
    const interval = setInterval(loadMessages, 1000);

    return () => clearInterval(interval);
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
        </div>
      </div>

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
