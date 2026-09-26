import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useBuddies } from '../context/BuddyContext';
import ConversationList from '../components/ConversationList';
import ChatWindow from '../components/ChatWindow';
import './ChatPage.css';

export default function ChatPage() {
  const { user } = useAuth();
  const { conversations, setActiveConvoId, loadMessages } = useChat();
  const { getAcceptedConnections } = useBuddies();
  const { getOrCreateConversation } = useChat();
  const [activeConvo, setActiveConvo] = useState(null);
  // On mobile (<=768px), start on sidebar. On desktop, start without sidebar restriction
  const [showSidebar, setShowSidebar] = useState(true);

  const accepted = getAcceptedConnections(user?.id);

  // Auto-select first conversation on desktop if none selected
  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    if (!activeConvo && conversations.length > 0 && !isMobile) {
      const first = conversations[0];
      setActiveConvo(first);
      setActiveConvoId(first.id);
    }
  }, [conversations, activeConvo, setActiveConvoId]);

  const handleInitConvo = async (buddy) => {
    const convo = await getOrCreateConversation(user.id, buddy.id, buddy.name, buddy.avatar_url || buddy.avatar);
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
  };

  const buddiesWithoutConvo = accepted.filter(buddy => {
    return !conversations.find(c =>
      c.participant_1 === buddy.id || c.participant_2 === buddy.id ||
      c.id?.includes(buddy.id)
    );
  });

  return (
    <div className="chat-page" id="chat-page">
      <div className="chat-page__layout">
        {/* Sidebar — always visible on desktop, toggle-controlled on mobile */}
        <div className={`chat-page__sidebar ${showSidebar ? 'show' : ''}`}>
          {buddiesWithoutConvo.length > 0 && (
            <div className="chat-page__quick-start">
              <h4>Start chatting with your matches:</h4>
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
          <ConversationList
            activeId={activeConvo?.id}
            onSelect={handleSelectConvo}
          />
        </div>

        {/* Chat Area — always visible on desktop, toggle-controlled on mobile */}
        <div className={`chat-page__main ${!showSidebar ? 'show' : ''}`}>
          <ChatWindow conversation={activeConvo} onBack={handleBack} />
        </div>
      </div>

      {/* Empty state when no connections at all */}
      {accepted.length === 0 && conversations.length === 0 && (
        <div className="chat-page__empty-overlay">
          <div className="chat-page__empty-content">
            <span className="chat-page__empty-icon">🤝</span>
            <h2>No Connections Yet</h2>
            <p>Find and connect with travel buddies to start chatting!</p>
            <a href="/find-buddies" className="btn btn--primary btn--lg">Find Buddies →</a>
          </div>
        </div>
      )}
    </div>
  );
}
