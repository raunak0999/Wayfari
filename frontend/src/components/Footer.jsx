import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) setSubscribed(true);
  };

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          {/* Brand */}
          <div className="footer__col footer__brand">
            <Link to="/" className="footer__logo">
              <img src="/logo.png" alt="Wayfari" style={{ width: '28px', height: '28px', objectFit: 'contain', filter: 'invert(1)' }} />
              Wayfari
            </Link>
            <p className="footer__desc">
              Connect with like-minded travelers, plan unforgettable trips, and explore the world together.
            </p>
            <div className="footer__social">
              {['✕', '📷', '📘', '▶️'].map((icon, i) => (
                <a key={i} href="#" className="footer__social-link">{icon}</a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div className="footer__col">
            <h4>Product</h4>
            <Link to="/buddies">Find Buddies</Link>
            <Link to="/trips">My Trips</Link>
            <Link to="/chat">Chat</Link>
            <Link to="/safety">Safety Hub</Link>
          </div>

          {/* Company */}
          <div className="footer__col">
            <h4>Company</h4>
            <Link to="/about">About Us</Link>
            <Link to="/careers">Careers</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/press">Press</Link>
          </div>

          {/* Newsletter */}
          <div className="footer__col footer__newsletter">
            <h4>Stay Updated</h4>
            <p>Get travel tips and updates</p>
            {subscribed ? (
              <p className="footer__success">🎉 You're subscribed! Check your inbox.</p>
            ) : (
              <form className="footer__form" onSubmit={handleSubscribe}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit">Subscribe</button>
              </form>
            )}
          </div>
        </div>

        <div className="footer__bottom">
          <p>&copy; {new Date().getFullYear()} Wayfari. All rights reserved.</p>
          <div className="footer__legal">
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/cookies">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
