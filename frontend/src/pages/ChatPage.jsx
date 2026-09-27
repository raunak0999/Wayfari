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
  const {
    conversations,
    setActiveConvoId,
    loadMessages,
    getOrCreateConversation,
  } = useChat();
  const { getAcceptedConnections } = useBuddies();

  const [activeConvo, setActiveConvo] = useState(null);
  // Mobile: show sidebar first; Desktop: both always visible
  const [showSidebar, setShowSidebar] = useState(true);

  const accepted = getAcceptedConnections(user?.id) || [];

  // Auto-open first conversation on desktop
  useEffect(() => {
    const isMobile = window.innerWidth <= 900;
    if (!activeConvo && conversations.length > 0 && !isMobile) {
      const first = conversations[0];
      setActiveConvo(first);
      setActiveConvoId(first.id);
    }
  }, [conversations]); // eslint-disable-line

  const handleInitConvo = async (buddy) => {
    if (!buddy || !user) return;
    const targetUserId = buddy.userId || buddy.id;
    const convo = await getOrCreateConversation(
      user.id,
      targetUserId,
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
  };

  // Accepted buddies without an existing conversation
  const buddiesWithoutConvo = accepted.filter((buddy) => {
    if (!buddy) return false;
    const bId = buddy.userId || buddy.id;
    return !conversations.some(
      (c) =>
        c.participant_1 === bId ||
        c.participant_2 === bId ||
        (c.id && c.id.includes(bId))
    );
  });

  const hasConnections = accepted.length > 0 || conversations.length > 0;

  // ─── Empty state — no connections yet ────────────────
  if (!hasConnections) {
    return (
      <div className="chat-page">
        <div className="chat-page__empty">
          <div className="chat-page__empty-content">
            <span className="chat-page__empty-icon">✈️</span>
            <h2>No Travel Buddies Yet</h2>
            <p>
              Connect with travelers heading to your dream destination and
              start planning together!
            </p>
            <Link to="/find-buddies" className="btn btn--primary btn--lg">
              Find Your Buddy →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main layout ─────────────────────────────────────
  return (
    <div className="chat-page">
      <div className="chat-page__layout">
        {/* ── Sidebar ── */}
        <div className={`chat-page__sidebar ${showSidebar ? 'show' : ''}`}>
          {/* New connections that haven't chatted yet */}
          {buddiesWithoutConvo.length > 0 && (
            <div className="chat-page__quick-start">
              <h4>✨ New Matches — Start Chatting</h4>
              <div className="chat-page__buddy-list">
                {buddiesWithoutConvo.map((buddy) => (
                  <button
                    key={buddy.id}
                    className="chat-page__buddy-pill"
                    onClick={() => handleInitConvo(buddy)}
                  >
                    <span className="chat-page__buddy-dot">
                      {buddy.name?.[0] || '?'}
                    </span>
                    {buddy.name?.split(' ')[0] || 'Buddy'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Conversation list OR first-chat hint */}
          {conversations.length === 0 ? (
            <div className="chat-page__tap-hint">
              <span>👆</span>
              <p>Tap a buddy above to start your first conversation!</p>
            </div>
          ) : (
            <ConversationList
              activeId={activeConvo?.id}
              onSelect={handleSelectConvo}
            />
          )}
        </div>

        {/* ── Chat window ── */}
        <div className={`chat-page__main ${!showSidebar ? 'show' : ''}`}>
          <ChatWindow conversation={activeConvo} onBack={handleBack} />
        </div>
      </div>
    </div>
  );
}
