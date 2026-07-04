import { useState } from 'react';
import type { Message } from '../../shared/types';
import { formatTime, formatBytes, prettyPrint } from '../../shared/utils';

interface HeldMessageModalProps {
  messages: Message[];
  onApprove: (messageId: string, data?: any) => void;
  onBlock: (messageId: string) => void;
  onClose: () => void;
}

export function HeldMessageModal({ messages, onApprove, onBlock, onClose }: HeldMessageModalProps) {
  // Per-message edited payloads, keyed by message id. Absent = unmodified.
  const [edits, setEdits] = useState<Record<string, string>>({});

  if (messages.length === 0) return null;

  function approve(message: Message) {
    const edited = edits[message.id];
    // Only send an override when the payload was actually changed.
    if (edited !== undefined && edited !== originalText(message)) {
      onApprove(message.id, edited);
    } else {
      onApprove(message.id);
    }
  }

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
            filter rules and {messages.length !== 1 ? 'are' : 'is'} being held. Review, edit if needed,
            then allow or block each message.
          </p>

          <div className="held-messages-list">
            {messages.map(message => {
              const isEditing = edits[message.id] !== undefined;
              return (
                <div key={message.id} className="held-message-item">
                  <div className="held-message-header">
                    <span className={`direction-badge ${message.direction}`}>
                      {message.direction === 'outgoing' ? '↑ Outgoing' : '↓ Incoming'}
                    </span>
                    <span className="held-message-time">{formatTime(message.timestamp)}</span>
                    <span className="held-message-size">{formatBytes(message.size || 0)}</span>
                    <button
                      className="held-message-edit-toggle"
                      onClick={() =>
                        setEdits(prev => {
                          const next = { ...prev };
                          if (isEditing) {
                            delete next[message.id];
                          } else {
                            next[message.id] = originalText(message);
                          }
                          return next;
                        })
                      }
                      title={isEditing ? 'Discard edits' : 'Edit payload before allowing'}
                    >
                      {isEditing ? 'Cancel edit' : '✎ Edit'}
                    </button>
                  </div>

                  <div className="held-message-content">
                    {isEditing ? (
                      <textarea
                        className="held-message-editor"
                        value={edits[message.id]}
                        spellCheck={false}
                        onChange={e =>
                          setEdits(prev => ({ ...prev, [message.id]: e.target.value }))
                        }
                      />
                    ) : (
                      <pre>{prettyPrint(message.data, 2)}</pre>
                    )}
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
                      onClick={() => approve(message)}
                      title={isEditing ? 'Deliver the edited payload' : 'Allow this message to pass through'}
                    >
                      {isEditing ? '✓ Allow edited' : '✓ Allow'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Review Later
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              messages.forEach(m => approve(m));
            }}
          >
            Allow All ({messages.length})
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * The editable text for a message. JSON payloads (usually strings) are shown
 * pretty-printed so they're easy to tweak; anything else falls back to a string.
 */
function originalText(message: Message): string {
  return typeof message.data === 'string' ? message.data : prettyPrint(message.data, 2);
}
