import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

const FLOATING_DESTINATIONS = ['Bali', 'Tokyo', 'Paris', 'Machu Picchu', 'Santorini', 'Iceland'];

export default function AuthPage() {
  const [mode, setMode] = useState('signup');
  const [form, setForm] = useState({ name: '', email: '', password: '', gender: '' });
  const [error, setError] = useState('');
  const { signup, login } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        if (!form.name || !form.email || !form.password || !form.gender) {
          setError('Please fill in all fields');
          setSubmitting(false);
          return;
        }
        const result = await signup(form.name, form.email, form.password, form.gender);
        if (result.success) navigate('/profile-setup');
        else setError(result.error);
      } else {
        if (!form.email || !form.password) {
          setError('Please fill in all fields');
          setSubmitting(false);
          return;
        }
        const result = await login(form.email, form.password);
        if (result.success) navigate('/find-buddies');
        else setError(result.error);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page" id="auth-page">
      <div className="auth-page__left">
        <div className="auth-page__floating-tags">
          {FLOATING_DESTINATIONS.map((dest, i) => (
            <span key={dest} className="auth-page__floating-tag" style={{ animationDelay: `${i * 2.5}s` }}>
              ✈️ {dest}
            </span>
          ))}
        </div>
        <div className="auth-page__branding">
          <h1>
            <img src="/logo.png" alt="" style={{ width: '36px', height: '36px', objectFit: 'contain', filter: 'invert(1)', verticalAlign: 'middle', marginRight: '10px' }} />
            Wayfari
          </h1>
          <p>Your journey to finding the perfect travel buddy starts here.</p>
          <div className="auth-page__features">
            <div className="auth-page__feature"><span>🎯</span> Smart compatibility matching</div>
            <div className="auth-page__feature"><span>🛡️</span> Built-in safety features</div>
            <div className="auth-page__feature"><span>💬</span> Real-time chat with matches</div>
          </div>
        </div>
      </div>

      <div className="auth-page__right">
        <div className="auth-page__form-container animate-fade-in-up">
          <div className="auth-page__tabs">
            <button className={`auth-page__tab ${mode === 'signup' ? 'active' : ''}`} onClick={() => { setMode('signup'); setError(''); }} id="tab-signup">Sign Up</button>
            <button className={`auth-page__tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError(''); }} id="tab-login">Login</button>
          </div>

          <h2>{mode === 'signup' ? 'Create Your Account' : 'Welcome Back'}</h2>
          <p className="auth-page__subtitle">
            {mode === 'signup' ? 'Join Wayfari and start finding travel buddies!' : 'Log in to continue your travel journey.'}
          </p>

          {error && <div className="auth-page__error">{error}</div>}

          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-input" type="text" placeholder="John Doe" value={form.name} onChange={e => handleChange('name', e.target.value)} id="input-name" />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" placeholder="hello@wayfari.com" value={form.email} onChange={e => handleChange('email', e.target.value)} id="input-email" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => handleChange('password', e.target.value)} id="input-password" />
            </div>
            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label">Gender</label>
                <div className="pill-group">
                  {['Male', 'Female', 'Other'].map(g => (
                    <button key={g} type="button" className={`pill-toggle ${form.gender === g ? 'pill-toggle--active' : ''}`} onClick={() => handleChange('gender', g)} id={`gender-${g.toLowerCase()}`}>
                      {g === 'Male' ? '♂️' : g === 'Female' ? '♀️' : '⚧️'} {g}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button type="submit" className="btn btn--primary btn--lg auth-page__submit" id="auth-submit" disabled={submitting}>
              {submitting ? 'Please wait...' : mode === 'signup' ? 'Create Account →' : 'Log In →'}
            </button>
          </form>

          <p className="auth-page__switch">
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
            <button onClick={() => { setMode(mode === 'signup' ? 'login' : 'signup'); setError(''); }}>
              {mode === 'signup' ? 'Log In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
