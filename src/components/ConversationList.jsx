import { useChat } from '../context/ChatContext';
import './ConversationList.css';

export default function ConversationList({ activeId, onSelect }) {
  const { conversations } = useChat();

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="convo-list" id="conversation-list">
      <div className="convo-list__header">
        <h3>💬 Messages</h3>
        <span className="convo-list__count">{conversations.length}</span>
      </div>

      {conversations.length === 0 ? (
        <div className="convo-list__empty">
          <span>🤝</span>
          <p>No conversations yet</p>
          <small>Connect with a buddy to start chatting!</small>
        </div>
      ) : (
        <div className="convo-list__items">
          {conversations.map(convo => (
            <button
              key={convo.id}
              className={`convo-list__item ${activeId === convo.id ? 'active' : ''}`}
              onClick={() => onSelect(convo)}
              id={`convo-${convo.id}`}
            >
              <div className="convo-list__avatar">
                {convo.buddyAvatar ? (
                  <img src={convo.buddyAvatar} alt={convo.buddyName} />
                ) : (
                  <span>{convo.buddyName?.[0]}</span>
                )}
              </div>
              <div className="convo-list__info">
                <div className="convo-list__top">
                  <strong>{convo.buddyName}</strong>
                  <small>{formatTime(convo.lastMessageTime)}</small>
                </div>
                <div className="convo-list__bottom">
                  <p className="convo-list__preview">
                    {convo.lastMessage || 'Start a conversation...'}
                  </p>
                  {convo.unreadCount > 0 && (
                    <span className="convo-list__badge">{convo.unreadCount}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
