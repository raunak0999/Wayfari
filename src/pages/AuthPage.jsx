import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './AuthPage.css';

const FLOATING_DESTINATIONS = ['Bali', 'Tokyo', 'Paris', 'Machu Picchu', 'Santorini', 'Iceland'];

export default function AuthPage() {
  const [mode, setMode] = useState('signup');
  const [form, setForm] = useState({ name: '', email: '', password: '', gender: '' });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const { signup, login, socialLogin } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleGoogleLogin = async () => {
    setError('');
    setSuccessMsg('');
    const res = await socialLogin('google');
    if (!res.success) {
      setError(res.error || 'Google authentication failed.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        if (!form.name || !form.email || !form.password || !form.gender) {
          setError('Please fill in all fields');
          setSubmitting(false);
          return;
        }
        const result = await signup(form.name, form.email, form.password, form.gender);
        if (result.needsConfirmation) {
          setSuccessMsg(result.message);
        } else if (result.success) {
          navigate('/profile-setup');
        } else {
          setError(result.error);
        }
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
      const msg = typeof err === 'string' ? err : (err?.message || 'Something went wrong. Please try again.');
      setError(msg === '{}' || msg === '' ? 'Something went wrong. Please try again.' : msg);
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
          {successMsg && <div className="auth-page__success">{successMsg}</div>}

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

          <div className="auth-page__divider">
            <span>or</span>
          </div>

          <button
            type="button"
            className="auth-page__google-btn"
            onClick={handleGoogleLogin}
            id="google-login-btn"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            <span>Sign In with Google</span>
          </button>

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
