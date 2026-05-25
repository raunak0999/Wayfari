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
  const [showSidebar, setShowSidebar] = useState(true);

  // Get accepted connections for quick-start
  const accepted = getAcceptedConnections(user?.id);

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!activeConvo && conversations.length > 0) {
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

  // Check if there are buddies without conversations yet
  const buddiesWithoutConvo = accepted.filter(buddy => {
    return !conversations.find(c =>
      c.participant_1 === buddy.id || c.participant_2 === buddy.id ||
      c.id?.includes(buddy.id)
    );
  });

  return (
    <div className="chat-page" id="chat-page">
      <div className="chat-page__layout">
        {/* Sidebar */}
        <div className={`chat-page__sidebar ${showSidebar ? 'show' : ''}`}>
          {/* Connected buddies quick-start */}
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

        {/* Chat Area */}
        <div className="chat-page__main">
          {/* Mobile back button */}
          {!showSidebar && (
            <button className="chat-page__back-btn" onClick={() => setShowSidebar(true)}>
              ← Back
            </button>
          )}
          <ChatWindow conversation={activeConvo} />
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
