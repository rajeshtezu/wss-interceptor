import type { Message } from '../../shared/types';
import { formatTime, formatBytes, formatJSON } from '../../shared/utils';

interface HeldMessageModalProps {
  messages: Message[];
  onApprove: (messageId: string) => void;
  onBlock: (messageId: string) => void;
  onClose: () => void;
}

export function HeldMessageModal({ messages, onApprove, onBlock, onClose }: HeldMessageModalProps) {
  if (messages.length === 0) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content held-message-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⚠️ Messages Held for Review</h3>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <p className="modal-description">
            The following {messages.length} message{messages.length !== 1 ? 's' : ''} matched your
            filter rules and {messages.length !== 1 ? 'are' : 'is'} being held. Review and approve or block each message.
          </p>

          <div className="held-messages-list">
            {messages.map(message => (
              <div key={message.id} className="held-message-item">
                <div className="held-message-header">
                  <span className={`direction-badge ${message.direction}`}>
                    {message.direction === 'outgoing' ? '↑ Outgoing' : '↓ Incoming'}
                  </span>
                  <span className="held-message-time">{formatTime(message.timestamp)}</span>
                  <span className="held-message-size">{formatBytes(message.size || 0)}</span>
                </div>

                <div className="held-message-content">
                  <pre>{formatJSON(message.data, 2)}</pre>
                </div>

                <div className="held-message-actions">
                  <button
                    className="btn-block"
                    onClick={() => onBlock(message.id)}
                    title="Block this message (will not be sent/delivered)"
                  >
                    🚫 Block
                  </button>
                  <button
                    className="btn-approve"
                    onClick={() => onApprove(message.id)}
                    title="Allow this message to pass through"
                  >
                    ✓ Allow
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Review Later
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              messages.forEach(m => onApprove(m.id));
            }}
          >
            Allow All ({messages.length})
          </button>
        </div>
      </div>
    </div>
  );
}
