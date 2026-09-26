import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import './ChatWindow.css';

const QUICK_EMOJIS = ['😊', '😍', '🎉', '✈️', '🌍', '🗺️', '📸', '🍜', '❤️', '👍', '🔥', '😂'];

export default function ChatWindow({ conversation }) {
  const { user } = useAuth();
  const { getMessages, sendMessage, typingUsers, markAsRead } = useChat();
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const messages = conversation ? getMessages(conversation.id) : [];
  const isTyping = conversation ? typingUsers[conversation.id] : false;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (conversation) {
      markAsRead(conversation.id);
      inputRef.current?.focus();
    }
  }, [conversation, markAsRead]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim() || !conversation) return;
    sendMessage(conversation.id, user.id, text.trim());
    setText('');
    setShowEmoji(false);
  };

  const addEmoji = (emoji) => {
    setText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  if (!conversation) {
    return (
      <div className="chat-window chat-window--empty" id="chat-window">
        <div className="chat-window__placeholder">
          <span>💬</span>
          <h3>Select a conversation</h3>
          <p>Choose a buddy from the sidebar to start chatting</p>
        </div>
      </div>
    );
  }

  const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateSeparator = (ts) => {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getStatusIcon = (msg) => {
    if (msg.senderId !== user.id) return null;
    if (msg.status === 'delivered') return '✓✓';
    if (msg.status === 'sent') return '✓';
    return '✓';
  };

  // Group messages by date
  let lastDate = '';

  return (
    <div className="chat-window" id="chat-window">
      {/* Header */}
      <div className="chat-window__header">
        <div className="chat-window__buddy">
          <div className="chat-window__avatar">
            {conversation.buddyAvatar ? (
              <img src={conversation.buddyAvatar} alt={conversation.buddyName} />
            ) : (
              <span>{conversation.buddyName?.[0]}</span>
            )}
            <div className="chat-window__online-dot"></div>
          </div>
          <div>
            <h4>{conversation.buddyName}</h4>
            <small className="chat-window__status">
              {isTyping ? (
                <span className="chat-window__typing-text">Typing...</span>
              ) : 'Online'}
            </small>
          </div>
        </div>
        <div className="chat-window__header-actions">
          <span className="chat-window__msg-count">{messages.length} messages</span>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-window__messages">
        {messages.length === 0 && (
          <div className="chat-window__empty-chat">
            <span>👋</span>
            <p>Say hello to <strong>{conversation.buddyName}</strong>!</p>
            <div className="chat-window__suggestions">
              {['Hi! 😊', "Let's plan a trip!", 'Where should we go?'].map(suggestion => (
                <button
                  key={suggestion}
                  className="chat-window__suggestion"
                  onClick={() => {
                    sendMessage(conversation.id, user.id, suggestion);
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => {
          const msgDate = formatDateSeparator(msg.timestamp);
          let showDate = false;
          if (msgDate !== lastDate) {
            lastDate = msgDate;
            showDate = true;
          }

          const isSent = msg.senderId === user.id;

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="chat-window__date-sep">
                  <span>{msgDate}</span>
                </div>
              )}
              <div className={`chat-window__bubble-row ${isSent ? 'sent' : 'received'}`}>
                <div className={`chat-window__bubble ${isSent ? 'chat-window__bubble--sent' : 'chat-window__bubble--received'}`}>
                  <p>{msg.text}</p>
                  <span className="chat-window__time">
                    {formatTime(msg.timestamp)}
                    {isSent && (
                      <span className={`chat-window__status-icon ${msg.status === 'delivered' ? 'delivered' : ''}`}>
                        {getStatusIcon(msg)}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="chat-window__bubble-row received">
            <div className="chat-window__bubble chat-window__bubble--received">
              <div className="chat-window__typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker */}
      {showEmoji && (
        <div className="chat-window__emoji-bar">
          {QUICK_EMOJIS.map(emoji => (
            <button
              key={emoji}
              className="chat-window__emoji-btn"
              onClick={() => addEmoji(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form className="chat-window__input-bar" onSubmit={handleSend}>
        <button
          type="button"
          className={`chat-window__emoji-toggle ${showEmoji ? 'active' : ''}`}
          onClick={() => setShowEmoji(!showEmoji)}
        >
          😊
        </button>
        <input
          ref={inputRef}
          className="chat-window__input"
          placeholder="Type a message..."
          value={text}
          onChange={e => setText(e.target.value)}
          id="chat-input"
        />
        <button
          type="submit"
          className="chat-window__send-btn"
          disabled={!text.trim()}
          id="chat-send-btn"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </form>
    </div>
  );
}
