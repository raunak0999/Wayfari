import './MascotBadge.css';

export default function MascotBadge({ message = "Ready for your next trip?" }) {
  return (
    <div className="mascot-badge animate-float">
      <div className="mascot-badge__speech">
        <span className="mascot-badge__text">{message}</span>
        <span className="mascot-badge__sparkle">✨</span>
      </div>
      
      <div className="mascot-badge__character">
        <svg className="mascot-svg" viewBox="0 0 100 100" width="56" height="56">
          {/* Head circle */}
          <circle cx="50" cy="50" r="38" fill="#F97316" />
          {/* Ears */}
          <polygon points="20,28 32,6 42,28" fill="#EA580C" />
          <polygon points="80,28 68,6 58,28" fill="#EA580C" />
          <polygon points="24,26 32,12 38,26" fill="#FFEDD5" />
          <polygon points="76,26 68,12 62,26" fill="#FFEDD5" />
          {/* Muzzle */}
          <polygon points="34,50 66,50 50,78" fill="#FFFFFF" />
          {/* Nose */}
          <polygon points="45,58 55,58 50,65" fill="#1E293B" />
          {/* Eyes */}
          <circle cx="38" cy="42" r="5" fill="#0F172A" />
          <circle cx="62" cy="42" r="5" fill="#0F172A" />
          <circle cx="40" cy="40" r="1.5" fill="#FFFFFF" />
          <circle cx="64" cy="40" r="1.5" fill="#FFFFFF" />
          {/* Cheeks */}
          <circle cx="30" cy="48" r="4" fill="#FCA5A5" opacity="0.7" />
          <circle cx="70" cy="48" r="4" fill="#FCA5A5" opacity="0.7" />
          {/* Travel Goggles */}
          <rect x="26" y="32" width="48" height="10" rx="5" fill="#38BDF8" opacity="0.85" stroke="#0284C7" strokeWidth="2" />
          <line x1="20" y1="37" x2="26" y2="37" stroke="#0F172A" strokeWidth="3" />
          <line x1="74" y1="37" x2="80" y2="37" stroke="#0F172A" strokeWidth="3" />
        </svg>
        <span className="mascot-badge__status-dot" />
      </div>
    </div>
  );
}
