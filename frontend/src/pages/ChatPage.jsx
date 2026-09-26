import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useBuddies } from '../context/BuddyContext';
import ConversationList from '../components/ConversationList';
import ChatWindow from '../components/ChatWindow';
import './ChatPage.css';

export default function ChatPage() {
  const { user } = useAuth();
  const { conversations, setActiveConvoId, loadMessages, getOrCreateConversation } = useChat();
  const { getAcceptedConnections } = useBuddies();
  const [activeConvo, setActiveConvo] = useState(null);
  const [showSidebar, setShowSidebar] = useState(true);

  const accepted = getAcceptedConnections(user?.id);

  // Auto-select first conversation on desktop if none selected
  useEffect(() => {
    const isMobile = window.innerWidth <= 900;
    if (!activeConvo && conversations.length > 0 && !isMobile) {
      const first = conversations[0];
      setActiveConvo(first);
      setActiveConvoId(first.id);
    }
  }, [conversations, activeConvo, setActiveConvoId]);

  const handleInitConvo = async (buddy) => {
    const convo = await getOrCreateConversation(
      user.id,
      buddy.id,
      buddy.name,
      buddy.avatar_url || buddy.avatar
    );
    if (convo) {
      setActiveConvo(convo);
      setActiveConvoId(convo.id);
      setShowSidebar(false);
      loadMessages(convo.id);
    }
  };

  const handleSelectConvo = (convo) => {
    setActiveConvo(convo);
    setActiveConvoId(convo.id);
    setShowSidebar(false);
    loadMessages(convo.id);
  };

  const handleBack = () => {
    setShowSidebar(true);
    setActiveConvo(null);
  };

  // Buddies with accepted connections but no conversation yet
  const buddiesWithoutConvo = accepted.filter(buddy => {
    if (!buddy) return false;
    return !conversations.find(c =>
      c.participant_1 === buddy.id || c.participant_2 === buddy.id ||
      c.id?.includes(buddy.id)
    );
  });

  const hasAnything = accepted.length > 0 || conversations.length > 0;

  // If nothing at all — show empty overlay
  if (!hasAnything) {
    return (
      <div className="chat-page" id="chat-page">
        <div className="chat-page__empty-overlay">
          <div className="chat-page__empty-content">
            <span className="chat-page__empty-icon">🤝</span>
            <h2>No Connections Yet</h2>
            <p>Find and connect with travel buddies to start chatting!</p>
            <Link to="/find-buddies" className="btn btn--primary btn--lg">Find Buddies →</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-page" id="chat-page">
      <div className="chat-page__layout">
        {/* Sidebar — conversation list */}
        <div className={`chat-page__sidebar ${showSidebar ? 'show' : ''}`}>
          {/* Accepted connections that haven't started chatting yet */}
          {buddiesWithoutConvo.length > 0 && (
            <div className="chat-page__quick-start">
              <h4>✨ Start chatting with your matches:</h4>
              <div className="chat-page__buddy-list">
                {buddiesWithoutConvo.map(buddy => (
                  <button
                    key={buddy.id}
                    className="chat-page__buddy-pill"
                    onClick={() => handleInitConvo(buddy)}
                  >
                    <span className="chat-page__buddy-dot">{buddy.name[0]}</span>
                    {buddy.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Existing conversations */}
          {conversations.length === 0 && buddiesWithoutConvo.length > 0 ? (
            <div className="chat-page__tap-hint">
              <span>👆</span>
              <p>Tap a name above to start your first chat!</p>
            </div>
          ) : (
            <ConversationList
              activeId={activeConvo?.id}
              onSelect={handleSelectConvo}
            />
          )}
        </div>

        {/* Chat window — shows after selecting a conversation */}
        <div className={`chat-page__main ${!showSidebar ? 'show' : ''}`}>
          <ChatWindow conversation={activeConvo} onBack={handleBack} />
        </div>
      </div>
    </div>
  );
}
