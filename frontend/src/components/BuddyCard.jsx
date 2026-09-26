import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBuddies } from '../context/BuddyContext';
import './BuddyCard.css';

const AVATAR_COLORS = [
  '#F97316',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#10B981',
  '#F59E0B',
];

export default function BuddyCard({ buddy, showConnect = true }) {
  const { user } = useAuth();
  const { calculateCompatibility, sendConnectionRequest, getConnectionStatus } = useBuddies();
  const navigate = useNavigate();
  const cardRef = useRef(null);

  const compatibility = calculateCompatibility(user?.profile || user?.preferences || user, buddy);
  const connectionStatus = user ? getConnectionStatus(user.id, buddy.id) : null;

  const buddyAvatar = buddy.avatar || buddy.avatar_url;
  const buddyHobbies = buddy.hobbies || [];
  const buddyMusic = buddy.music || [];
  const buddyDest = buddy.destination || '';
  const colorIdx = String(buddy.id);
  const colorIndex = colorIdx.charCodeAt(colorIdx.length - 1) % AVATAR_COLORS.length;

  const handleConnect = (e) => {
    e.stopPropagation();
    if (!user) {
      navigate('/auth');
      return;
    }
    sendConnectionRequest(user.id, buddy.id);
  };

  const handleCardClick = () => {
    navigate(`/buddy/${buddy.id}`);
  };

  // 3D tilt on mouse move
  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px) scale(1.02)`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateY(0) scale(1)';
  };

  return (
    <div
      className="buddy-card card"
      onClick={handleCardClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      ref={cardRef}
      id={`buddy-card-${buddy.id}`}
    >
      <div className="buddy-card__shine" />

      {buddy.gender === 'female' && (
        <div className="buddy-card__safety-badge" title="Verified Safety Hub User">
          🛡️
        </div>
      )}
      <div className="buddy-card__compat">
        <div className="compat-badge">
          <span>🔥</span> {compatibility}% Match
        </div>
      </div>

      <div className="buddy-card__header">
        <div className="buddy-card__avatar" style={{ background: AVATAR_COLORS[colorIndex] }}>
          {buddyAvatar ? (
            <img src={buddyAvatar} alt={buddy.name} />
          ) : (
            <span>{buddy.name?.[0]}</span>
          )}
          <div className="buddy-card__avatar-ring" />
        </div>
        <div className="buddy-card__info">
          <h4 className="buddy-card__name">{buddy.name}</h4>
          <p className="buddy-card__meta">{buddy.age} · {buddy.city}</p>
        </div>
      </div>

      <div className="buddy-card__destination">
        <span className="buddy-card__dest-icon">📍</span>
        <span>{buddyDest}</span>
      </div>

      <div style={{ padding: '0 16px', marginBottom: '8px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="badge badge--info" style={{ fontSize: '0.75rem' }}>
          {buddy.travel_experience === 'expert' ? '🏔️ Seasoned Expert Mentor' : buddy.travel_experience === 'beginner' ? '🔰 First-Time Traveler' : '🧳 Intermediate Traveler'}
        </span>
        {user?.travel_experience === 'beginner' && buddy.travel_experience === 'expert' && (
          <span className="badge badge--success" style={{ fontSize: '0.72rem' }}>
            🤝 Top Guide Match
          </span>
        )}
      </div>

      <div className="buddy-card__chips">
        {buddyHobbies.slice(0, 4).map(h => (
          <span key={h} className="chip chip--active buddy-card__hobby">{h}</span>
        ))}
      </div>

      <div className="buddy-card__music">
        <span className="buddy-card__music-icon">🎵</span>
        <span>{buddyMusic.slice(0, 3).join(', ')}</span>
      </div>

      {showConnect && (
        <div className="buddy-card__actions">
          {connectionStatus === 'accepted' ? (
            <button className="btn btn--sm btn--primary buddy-card__btn" disabled style={{ opacity: 0.7 }}>
              ✓ Connected
            </button>
          ) : connectionStatus === 'pending' ? (
            <button className="btn btn--sm btn--outline buddy-card__btn" disabled>
              Pending...
            </button>
          ) : (
            <button className="btn btn--sm btn--primary buddy-card__btn" onClick={handleConnect}>
              Connect
            </button>
          )}
        </div>
      )}
    </div>
  );
}
