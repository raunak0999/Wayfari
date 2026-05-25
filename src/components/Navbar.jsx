import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import MagneticElement from './MagneticElement';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  // Safely get unread count (ChatContext may not be available on landing page)
  let totalUnread = 0;
  try {
    const { getTotalUnread } = useChat();
    totalUnread = getTotalUnread();
  } catch { /* not in provider */ }

  // Scroll-aware state & progress bar
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      setScrollY(currentY);
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? (currentY / docHeight) * 100 : 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`navbar${scrollY > 50 ? ' navbar--scrolled' : ''}`} id="main-navbar">
      <div className="navbar__progress" style={{ width: `${scrollProgress}%` }} />

      <div className="navbar__inner container">
        <Link to="/" className="navbar__logo" onClick={() => setMenuOpen(false)}>
          <img src="/logo.png" alt="Wayfari" className="navbar__logo-img" />
          <span className="navbar__logo-text">Wayfari</span>
        </Link>

        <button
          className={`navbar__hamburger ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
          id="navbar-hamburger"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`navbar__links ${menuOpen ? 'open' : ''}`}>
          {user ? (
            <>
              <MagneticElement strength={20}>
                <Link
                  to="/find-buddies"
                  className={`navbar__link ${isActive('/find-buddies') ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Find Buddies
                </Link>
              </MagneticElement>
              <MagneticElement strength={20}>
                <Link
                  to="/my-trips"
                  className={`navbar__link ${isActive('/my-trips') ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  My Trips
                </Link>
              </MagneticElement>
              <MagneticElement strength={20}>
                <Link
                  to="/chat"
                  className={`navbar__link ${isActive('/chat') ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Chat
                  {totalUnread > 0 && (
                    <span className="navbar__badge">{totalUnread}</span>
                  )}
                </Link>
              </MagneticElement>
              <MagneticElement strength={20}>
                <Link
                  to="/safety-hub"
                  className={`navbar__link navbar__link--safety ${isActive('/safety-hub') ? 'active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  🛡️ Safety Hub
                </Link>
              </MagneticElement>
              <div className="navbar__user">
                <div className="navbar__avatar">
                  {user.profile?.avatar ? (
                    <img src={user.profile.avatar} alt={user.name} />
                  ) : (
                    <span>{user.name?.[0]?.toUpperCase() || '?'}</span>
                  )}
                </div>
                <button className="btn btn--sm btn--outline" onClick={handleLogout} id="logout-btn">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <MagneticElement strength={20}>
                <Link to="/" className={`navbar__link ${isActive('/') ? 'active' : ''}`} onClick={() => setMenuOpen(false)}>
                  Home
                </Link>
              </MagneticElement>
              <MagneticElement strength={20}>
                <a href="#features" className="navbar__link" onClick={() => setMenuOpen(false)}>
                  Features
                </a>
              </MagneticElement>
              <MagneticElement strength={20}>
                <a href="#how-it-works" className="navbar__link" onClick={() => setMenuOpen(false)}>
                  How It Works
                </a>
              </MagneticElement>
              <Link to="/auth" className="btn btn--primary navbar__cta" onClick={() => setMenuOpen(false)} id="get-started-btn">
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
