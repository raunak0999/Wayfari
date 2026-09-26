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
              <img src="/logo.png" alt="Wayfari" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
              <span>Wayfari</span>
            </Link>
            <p className="footer__desc">
              Connect with like-minded travelers, plan unforgettable trips, and explore the world together safely.
            </p>
            <div className="footer__socials">
              <a href="#" className="footer__social" aria-label="Twitter / X">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 1.15h3.68l-8.04 9.2L24 22.85h-7.4l-5.8-7.58-6.63 7.58H.49l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93Zm-1.29 19.5h2.04L6.48 3.24H4.3l13.31 17.41Z"/></svg>
              </a>
              <a href="#" className="footer__social" aria-label="Instagram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5"/></svg>
              </a>
              <a href="#" className="footer__social" aria-label="LinkedIn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77Z"/></svg>
              </a>
              <a href="#" className="footer__social" aria-label="YouTube">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div className="footer__col">
            <h4>Product</h4>
            <div className="footer__links-col">
              <Link to="/find-buddies">Find Buddies</Link>
              <Link to="/my-trips">My Trips</Link>
              <Link to="/chat">Chat</Link>
              <Link to="/safety-hub">Safety Hub</Link>
            </div>
          </div>

          {/* Company Links */}
          <div className="footer__col">
            <h4>Company</h4>
            <div className="footer__links-col">
              <a href="#about">About Us</a>
              <a href="#careers">Careers</a>
              <a href="#blog">Blog</a>
              <a href="#press">Press</a>
            </div>
          </div>

          {/* Newsletter */}
          <div className="footer__col footer__newsletter">
            <h4>Stay Updated</h4>
            <p>Get travel tips, buddy alerts, and destination guides.</p>
            {subscribed ? (
              <p className="footer__newsletter-success">🎉 You're subscribed! Check your inbox.</p>
            ) : (
              <form className="footer__newsletter-form" onSubmit={handleSubscribe}>
                <input
                  type="email"
                  className="footer__newsletter-input"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit" className="footer__newsletter-submit">
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="footer__bottom">
          <p>&copy; {new Date().getFullYear()} Wayfari. All rights reserved.</p>
          <div className="footer__links">
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
            <a href="#cookies">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
