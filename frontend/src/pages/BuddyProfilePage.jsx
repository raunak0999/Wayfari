import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBuddies } from '../context/BuddyContext';
import { useChat } from '../context/ChatContext';
import './BuddyProfilePage.css';

const AVATAR_COLORS = [
  'linear-gradient(135deg, #F97316, #FB923C)',
  'linear-gradient(135deg, #8B5CF6, #A78BFA)',
  'linear-gradient(135deg, #EC4899, #F472B6)',
  'linear-gradient(135deg, #06B6D4, #22D3EE)',
  'linear-gradient(135deg, #10B981, #34D399)',
  'linear-gradient(135deg, #F59E0B, #FBBF24)',
];

export default function BuddyProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { buddies, calculateCompatibility, getCompatibilityBreakdown, sendConnectionRequest, getConnectionStatus } = useBuddies();
  const { getOrCreateConversation } = useChat();

  const buddy = buddies.find(b => b.id === id);

  if (!buddy) {
    return (
      <div className="buddy-profile" id="buddy-profile-page">
        <div className="container" style={{ paddingTop: '120px', textAlign: 'center' }}>
          <h2>Buddy not found</h2>
          <button className="btn btn--primary" onClick={() => navigate('/find-buddies')}>
            Back to Find Buddies
          </button>
        </div>
      </div>
    );
  }

  const compatibility = calculateCompatibility(user?.profile || user?.preferences || user, buddy);
  const breakdown = getCompatibilityBreakdown(user?.profile || user?.preferences || user, buddy);
  const connectionStatus = user ? getConnectionStatus(user.id, buddy.id) : null;
  const colorIdx = String(buddy.id);
  const colorIndex = colorIdx.charCodeAt(colorIdx.length - 1) % AVATAR_COLORS.length;

  // Handle both DB (snake_case) and seed (camelCase) fields
  const buddyHobbies = buddy.hobbies || [];
  const buddyMusic = buddy.music || [];
  const buddyAvatar = buddy.avatar || buddy.avatar_url;
  const buddyDest = buddy.destination || '';
  const buddyDepartureDate = buddy.departure_date || buddy.departureDate || 'Flexible';
  const buddyDuration = buddy.trip_duration || buddy.tripDuration || 'TBD';
  const buddyGroupSize = buddy.group_size || buddy.groupSize || '2';
  const buddyTravelStyle = buddy.travel_style || buddy.travelStyle || 'Mid-range';
  const buddyNoiseLevel = buddy.noise_level || buddy.noiseLevel || 'Moderate';
  const buddySleepSchedule = buddy.sleep_schedule || buddy.sleepSchedule || 'Flexible';

  const userHobbies = user?.hobbies || user?.interests?.hobbies || [];
  const userMusic = user?.music || user?.interests?.music || [];
  const hobbyOverlap = userHobbies.filter(h => buddyHobbies.includes(h));
  const musicOverlap = userMusic.filter(m => buddyMusic.includes(m));

  const handleConnect = () => {
    if (!user) { navigate('/auth'); return; }
    sendConnectionRequest(user.id, buddy.id);
  };

  const handleChat = async () => {
    if (!user) { navigate('/auth'); return; }
    await getOrCreateConversation(user.id, buddy.id, buddy.name, buddyAvatar);
    navigate('/chat');
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#22C55E';
    if (score >= 50) return '#F97316';
    return '#94A3B8';
  };

  return (
    <div className="buddy-profile" id="buddy-profile-page">
      <div className="container">
        {/* Hero */}
        <div className="buddy-profile__hero card animate-fade-in-up">
          <div className="buddy-profile__avatar-section">
            <div className="buddy-profile__avatar" style={{ background: AVATAR_COLORS[colorIndex] }}>
              {buddyAvatar ? (
                <img src={buddyAvatar} alt={buddy.name} />
              ) : (
                <span>{buddy.name?.[0]}</span>
              )}
            </div>
            {buddy.gender === 'female' && (
              <div className="buddy-profile__safety-badge">🛡️ Safety Verified</div>
            )}
          </div>

          <div className="buddy-profile__info">
            <h1>{buddy.name}, {buddy.age}</h1>
            <p className="buddy-profile__location">📍 {buddy.city}</p>
            <p className="buddy-profile__bio">{buddy.bio}</p>

            <div className="buddy-profile__compat">
              <div className="buddy-profile__compat-ring">
                <svg viewBox="0 0 100 100" className="buddy-profile__ring-svg">
                  <circle cx="50" cy="50" r="42" stroke="#E2E8F0" strokeWidth="6" fill="none" />
                  <circle
                    cx="50" cy="50" r="42"
                    stroke={getScoreColor(compatibility)}
                    strokeWidth="6" fill="none"
                    strokeDasharray={`${compatibility * 2.64} 264`}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                    className="buddy-profile__ring-fill"
                  />
                </svg>
                <div className="buddy-profile__ring-text">
                  <span className="buddy-profile__ring-num">{compatibility}%</span>
                  <span className="buddy-profile__ring-label">Match</span>
                </div>
              </div>
            </div>

            <div className="buddy-profile__actions">
              {connectionStatus === 'accepted' ? (
                <button className="btn btn--primary btn--lg" onClick={handleChat}>
                  💬 Chat Now
                </button>
              ) : connectionStatus === 'pending' ? (
                <button className="btn btn--outline btn--lg" disabled>
                  ⏳ Request Pending
                </button>
              ) : (
                <button className="btn btn--primary btn--lg" onClick={handleConnect} id="send-connection-btn">
                  🤝 Send Connection Request
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="buddy-profile__grid">
          {/* Travel Plans */}
          <div className="card animate-fade-in-up">
            <h3>✈️ Travel Plans</h3>
            <div className="buddy-profile__detail-list">
              <div className="buddy-profile__detail-item">
                <span>Destination</span>
                <strong>{buddyDest}</strong>
              </div>
              <div className="buddy-profile__detail-item">
                <span>Departure</span>
                <strong>{buddyDepartureDate}</strong>
              </div>
              <div className="buddy-profile__detail-item">
                <span>Duration</span>
                <strong>{buddyDuration}</strong>
              </div>
              <div className="buddy-profile__detail-item">
                <span>Group Size</span>
                <strong>{buddyGroupSize}</strong>
              </div>
              <div className="buddy-profile__detail-item">
                <span>Travel Style</span>
                <strong>{buddyTravelStyle}</strong>
              </div>
            </div>
          </div>

          {/* Compatibility Breakdown */}
          <div className="card animate-fade-in-up">
            <h3>📊 Compatibility Breakdown</h3>

            {/* Visual Progress Bars */}
            <div className="buddy-profile__breakdown">
              {breakdown.map((item, i) => (
                <div key={i} className="buddy-profile__breakdown-item">
                  <div className="buddy-profile__breakdown-header">
                    <span className="buddy-profile__breakdown-icon">{item.icon}</span>
                    <span className="buddy-profile__breakdown-label">{item.label}</span>
                    <span
                      className="buddy-profile__breakdown-score"
                      style={{ color: getScoreColor(item.score) }}
                    >
                      {item.score}%
                    </span>
                  </div>
                  <div className="buddy-profile__bar">
                    <div
                      className="buddy-profile__bar-fill"
                      style={{
                        width: `${item.score}%`,
                        background: getScoreColor(item.score),
                      }}
                    ></div>
                  </div>
                  <small className="buddy-profile__breakdown-detail">{item.detail}</small>
                </div>
              ))}
            </div>

            <div className="buddy-profile__compat-section">
              <h4>🎯 Hobbies Overlap</h4>
              <div className="buddy-profile__chips-compare">
                {buddyHobbies.map(h => (
                  <span
                    key={h}
                    className={`chip ${hobbyOverlap.includes(h) ? 'chip--active' : ''}`}
                  >
                    {hobbyOverlap.includes(h) && '✓ '}{h}
                  </span>
                ))}
              </div>
              {hobbyOverlap.length > 0 && (
                <p className="buddy-profile__match-text">
                  {hobbyOverlap.length} shared {hobbyOverlap.length === 1 ? 'hobby' : 'hobbies'}!
                </p>
              )}
            </div>

            <div className="buddy-profile__compat-section">
              <h4>🎵 Music Match</h4>
              <div className="buddy-profile__chips-compare">
                {buddyMusic.map(m => (
                  <span
                    key={m}
                    className={`chip ${musicOverlap.includes(m) ? 'chip--active' : ''}`}
                  >
                    {musicOverlap.includes(m) && '✓ '}{m}
                  </span>
                ))}
              </div>
              {musicOverlap.length > 0 && (
                <p className="buddy-profile__match-text">
                  {musicOverlap.length} shared music {musicOverlap.length === 1 ? 'taste' : 'tastes'}!
                </p>
              )}
            </div>

            <div className="buddy-profile__compat-section">
              <h4>🏷️ Lifestyle</h4>
              <div className="buddy-profile__lifestyle-tags">
                <span className="badge badge--primary">{buddyNoiseLevel}</span>
                <span className="badge badge--info">{buddySleepSchedule}</span>
                <span className="badge badge--success">{buddyTravelStyle}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
