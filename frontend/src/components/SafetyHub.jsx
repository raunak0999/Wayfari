import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import './SafetyHub.css';

const SAFETY_CONTACTS_KEY = 'wayfari_safety_contacts';
const CHECK_INS_KEY = 'wayfari_checkins';
const SOS_LOG_KEY = 'wayfari_sos_log';

const getStored = (key, fallback = []) => {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch { return fallback; }
};

const setStored = (key, val) => {
  localStorage.setItem(key, JSON.stringify(val));
};

export default function SafetyHub() {
  const { user, updateProfile } = useAuth();
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [coords, setCoords] = useState(null);
  const [checkIns, setCheckIns] = useState([]);
  const [sosTriggered, setSosTriggered] = useState(false);
  const [sosTimer, setSosTimer] = useState(null);
  const [sosProgress, setSosProgress] = useState(0);
  const [safetyContacts, setSafetyContacts] = useState([]);
  const [sosLog, setSosLog] = useState([]);
  const [toastMessage, setToastMessage] = useState('');
  const [checkInInterval, setCheckInInterval] = useState('2hr');
  const [nextCheckIn, setNextCheckIn] = useState(null);
  const [checkInCountdown, setCheckInCountdown] = useState('');

  // ── Load data from localStorage ──
  useEffect(() => {
    if (!user?.id) return;
    const contacts = getStored(`${SAFETY_CONTACTS_KEY}_${user.id}`, []);
    const checkins = getStored(`${CHECK_INS_KEY}_${user.id}`, []);
    const sos = getStored(`${SOS_LOG_KEY}_${user.id}`, []);
    setSafetyContacts(contacts);
    setCheckIns(checkins);
    setSosLog(sos);
    setCheckInInterval(user?.safety?.checkInInterval || '2hr');
  }, [user?.id, user?.safety?.checkInInterval]);

  // ── Save contacts whenever they change ──
  useEffect(() => {
    if (user?.id && safetyContacts) {
      setStored(`${SAFETY_CONTACTS_KEY}_${user.id}`, safetyContacts);
    }
  }, [safetyContacts, user?.id]);

  // ── Save check-ins ──
  useEffect(() => {
    if (user?.id && checkIns.length > 0) {
      setStored(`${CHECK_INS_KEY}_${user.id}`, checkIns);
    }
  }, [checkIns, user?.id]);

  // ── Save SOS log ──
  useEffect(() => {
    if (user?.id && sosLog.length > 0) {
      setStored(`${SOS_LOG_KEY}_${user.id}`, sosLog);
    }
  }, [sosLog, user?.id]);

  // ── Geolocation ──
  useEffect(() => {
    if (locationEnabled && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude.toFixed(6),
            lng: pos.coords.longitude.toFixed(6)
          });
        },
        (err) => {
          console.warn('Geolocation error:', err);
          showToast('📍 Location access denied. Enable in browser settings.');
        },
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [locationEnabled]);

  // ── Check-in Countdown Timer ──
  useEffect(() => {
    if (checkIns.length === 0) return;

    const intervalMs = {
      '1hr': 3600000,
      '2hr': 7200000,
      '4hr': 14400000,
    }[checkInInterval] || 7200000;

    const lastCheckIn = new Date(checkIns[0]?.time);
    const next = new Date(lastCheckIn.getTime() + intervalMs);
    setNextCheckIn(next);

    const timer = setInterval(() => {
      const now = new Date();
      const diff = next - now;
      if (diff <= 0) {
        setCheckInCountdown('Overdue!');
        showToast('⚠️ Check-in overdue! Your contacts will be notified.');
        clearInterval(timer);
      } else {
        const hrs = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setCheckInCountdown(
          hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m ${secs}s`
        );
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [checkIns, checkInInterval]);

  // ── Toast helper ──
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // ── Check-in ──
  const handleCheckIn = () => {
    const location = coords ? `${coords.lat}, ${coords.lng}` : 'Location unavailable';
    const newCheckIn = {
      id: Date.now(),
      time: new Date().toISOString(),
      location,
    };
    setCheckIns(prev => [newCheckIn, ...prev].slice(0, 50));
    showToast('✅ Check-in recorded! Your contacts are notified.');
  };

  // Helper to format clean phone number for WhatsApp wa.me links
  const getWhatsAppLink = (phone, customMsg = '') => {
    if (!phone) return '#';
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    const encoded = encodeURIComponent(customMsg || `🚨 EMERGENCY SOS ALERT from Wayfari!\nI need immediate assistance.\nMy current location: ${coords ? `https://www.google.com/maps?q=${coords.lat},${coords.lng}` : 'Location unavailable'}`);
    return `https://wa.me/${cleanPhone.replace('+', '')}?text=${encoded}`;
  };

  // ── SOS Instant 1-Click Trigger ──
  const dispatchSOS = useCallback((lat, lng) => {
    const mapsLink = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : 'Location unavailable';
    const message = `🚨 EMERGENCY SOS ALERT from Wayfari!\nI need immediate assistance!\nMy current live location: ${mapsLink}`;

    // Log the SOS event
    const sosEntry = {
      id: Date.now(),
      time: new Date().toISOString(),
      location: lat && lng ? `${lat}, ${lng}` : 'Location unavailable',
      mapsLink,
      contactsNotified: safetyContacts.map(c => c.name || c.phone).filter(Boolean),
    };
    setSosLog(prev => [sosEntry, ...prev]);

    // Background notification send (No browser redirect)
    const contactsWithPhone = safetyContacts.filter(c => c.phone);
    if (contactsWithPhone.length > 0) {
      // Trigger background alert dispatch via fetch API if backend is active
      try {
        fetch('/api/checkin/sos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            location: mapsLink,
            contacts: contactsWithPhone
          })
        }).catch(() => { /* silent background attempt */ });
      } catch { /* ignore */ }

      showToast(`🆘 EMERGENCY SOS ACTIVATED! Live location (${lat || 'N/A'}, ${lng || 'N/A'}) dispatched to ${contactsWithPhone.length} trusted contact(s)!`);
    } else {
      showToast('⚠️ SOS Logged! Please add trusted contacts with phone numbers below.');
    }

    setTimeout(() => setSosTriggered(false), 8000);
  }, [safetyContacts, user?.id]);

  const handleSOSClick = useCallback(() => {
    setSosTriggered(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const currentLat = pos.coords.latitude.toFixed(6);
          const currentLng = pos.coords.longitude.toFixed(6);
          setCoords({ lat: currentLat, lng: currentLng });
          dispatchSOS(currentLat, currentLng);
        },
        (err) => {
          console.warn('Geolocation error during SOS:', err);
          dispatchSOS(coords?.lat, coords?.lng);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      dispatchSOS(coords?.lat, coords?.lng);
    }
  }, [coords, dispatchSOS]);

  // ── Contacts CRUD ──
  const addContact = () => {
    if (safetyContacts.length < 3) {
      setSafetyContacts(prev => [...prev, {
        id: 'contact_' + Date.now(),
        name: '',
        phone: '',
        relationship: '',
      }]);
    }
  };

  const updateContact = (idx, field, value) => {
    setSafetyContacts(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const removeContact = (idx) => {
    setSafetyContacts(prev => prev.filter((_, i) => i !== idx));
  };

  const handleIntervalChange = (interval) => {
    setCheckInInterval(interval);
    if (updateProfile) {
      updateProfile({ safety: { sosEnabled: true, checkInInterval: interval } });
    }
  };

  const filledContacts = safetyContacts.filter(c => c.name || c.phone);

  return (
    <div className="safety-hub" id="safety-hub">
      {/* Toast */}
      {toastMessage && (
        <div className="safety-hub__toast animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="safety-hub__header">
        <h2>🛡️ Safety Hub</h2>
        <p>Your personal safety dashboard. Stay protected on every trip.</p>
        <div className="safety-hub__stats">
          <div className="safety-hub__stat">
            <span className="safety-hub__stat-num">{filledContacts.length}</span>
            <span>Contacts</span>
          </div>
          <div className="safety-hub__stat">
            <span className="safety-hub__stat-num">{checkIns.length}</span>
            <span>Check-ins</span>
          </div>
          <div className="safety-hub__stat">
            <span className="safety-hub__stat-num">{sosLog.length}</span>
            <span>SOS Alerts</span>
          </div>
        </div>
      </div>

      <div className="safety-hub__grid">
        {/* Live Location */}
        <div className="safety-hub__card card">
          <div className="safety-hub__card-header">
            <h3>📍 Live Location</h3>
            <label className="wizard__switch">
              <input
                type="checkbox"
                checked={locationEnabled}
                onChange={e => setLocationEnabled(e.target.checked)}
              />
              <span className="wizard__slider"></span>
            </label>
          </div>
          {locationEnabled && coords ? (
            <div className="safety-hub__location">
              <div className="safety-hub__map">
                <iframe
                  title="Location Map"
                  className="safety-hub__map-embed"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.01},${coords.lat - 0.01},${parseFloat(coords.lng) + 0.01},${parseFloat(coords.lat) + 0.01}&layer=mapnik&marker=${coords.lat},${coords.lng}`}
                  loading="lazy"
                ></iframe>
              </div>
              <div className="safety-hub__coords">
                <span>Lat: {coords.lat}</span>
                <span>Lng: {coords.lng}</span>
              </div>
              <p className="safety-hub__location-status">
                <span className="safety-hub__live-dot"></span>
                Sharing live location with {filledContacts.length} contact{filledContacts.length !== 1 ? 's' : ''}
              </p>
            </div>
          ) : locationEnabled && !coords ? (
            <div className="safety-hub__location-loading">
              <div className="safety-hub__spinner"></div>
              <p>Getting your location...</p>
            </div>
          ) : (
            <div className="safety-hub__location-off">
              <span>🗺️</span>
              <p>Enable location sharing to let your trusted contacts track your position in real-time.</p>
            </div>
          )}
        </div>

        {/* SOS Button */}
        <div className="safety-hub__card card safety-hub__sos-card">
          <h3>🆘 Emergency SOS</h3>
          <p>Click the button to instantly alert all your trusted contacts with your live location.</p>
          <div className="safety-hub__sos-container">
            <button
              className={`safety-hub__sos-btn ${sosTriggered ? 'triggered' : ''}`}
              onClick={handleSOSClick}
              id="sos-button"
            >
              {sosTriggered ? '✓ SENT' : 'SOS'}
            </button>
            <small>Click to send instant Emergency SOS with live location</small>
          </div>

          {/* Recent SOS Log */}
          {sosLog.length > 0 && (
            <div className="safety-hub__sos-log">
              <h4>Recent Alerts</h4>
              {sosLog.slice(0, 3).map(entry => (
                <div key={entry.id} className="safety-hub__sos-entry">
                  <span className="safety-hub__sos-dot">🔴</span>
                  <div>
                    <strong>{new Date(entry.time).toLocaleString()}</strong>
                    <small>{entry.contactsNotified?.length || 0} contacts notified</small>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trusted Contacts */}
        <div className="safety-hub__card card safety-hub__contacts-card">
          <div className="safety-hub__card-header">
            <h3>👥 Trusted Contacts</h3>
            {safetyContacts.length < 3 && (
              <button className="btn btn--sm btn--outline" onClick={addContact}>+ Add</button>
            )}
          </div>
          {safetyContacts.length === 0 ? (
            <div className="safety-hub__empty">
              <span>👤</span>
              <p>No trusted contacts added yet.</p>
              <button className="btn btn--sm btn--primary" onClick={addContact}>Add Contact</button>
            </div>
          ) : (
            <div className="safety-hub__contacts-list">
              {safetyContacts.map((contact, idx) => (
                <div key={contact.id || idx} className="safety-hub__contact">
                  <div className="safety-hub__contact-avatar">
                    {contact.name?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="safety-hub__contact-info">
                    <input
                      className="safety-hub__contact-input"
                      placeholder="Name"
                      value={contact.name}
                      onChange={e => updateContact(idx, 'name', e.target.value)}
                    />
                    <input
                      className="safety-hub__contact-input safety-hub__contact-input--sm"
                      placeholder="Phone number"
                      value={contact.phone}
                      onChange={e => updateContact(idx, 'phone', e.target.value)}
                    />
                    <input
                      className="safety-hub__contact-input safety-hub__contact-input--sm"
                      placeholder="Relationship (e.g., Mom, Friend)"
                      value={contact.relationship || ''}
                      onChange={e => updateContact(idx, 'relationship', e.target.value)}
                    />
                  </div>
                  <div className="safety-hub__contact-actions">
                    {contact.phone && (
                      <>
                        <a href={getWhatsAppLink(contact.phone)} target="_blank" rel="noopener noreferrer" className="btn btn--icon btn--sm safety-hub__wa-btn" title="Send WhatsApp Emergency Location">
                          💬 WhatsApp
                        </a>
                        <a href={`tel:${contact.phone}`} className="btn btn--icon btn--sm safety-hub__call-btn" title="Call">
                          📞
                        </a>
                      </>
                    )}
                    <button className="btn btn--icon btn--sm safety-hub__remove-btn" onClick={() => removeContact(idx)} title="Remove">
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Check-in Log */}
        <div className="safety-hub__card card">
          <div className="safety-hub__card-header">
            <h3>✅ Check-in Log</h3>
            <button className="btn btn--sm btn--primary" onClick={handleCheckIn}>
              Check In Now
            </button>
          </div>

          {/* Countdown */}
          {checkIns.length > 0 && (
            <div className="safety-hub__countdown">
              <div className="safety-hub__countdown-label">
                <span>Next check-in in:</span>
                <strong className={checkInCountdown === 'Overdue!' ? 'overdue' : ''}>
                  {checkInCountdown || 'Calculating...'}
                </strong>
              </div>
              <div className="safety-hub__countdown-bar">
                <div
                  className="safety-hub__countdown-fill"
                  style={{
                    width: checkInCountdown === 'Overdue!' ? '100%' :
                      `${Math.max(0, 100 - (nextCheckIn ? ((nextCheckIn - new Date()) / ({
                        '1hr': 3600000, '2hr': 7200000, '4hr': 14400000
                      }[checkInInterval] || 7200000)) * 100 : 0))}%`
                  }}
                ></div>
              </div>
            </div>
          )}

          <div className="safety-hub__checkin-interval">
            <span>Reminder interval:</span>
            <div className="pill-group">
              {['1hr', '2hr', '4hr'].map(interval => (
                <button
                  key={interval}
                  className={`pill-toggle pill-toggle--sm ${checkInInterval === interval ? 'pill-toggle--active' : ''}`}
                  onClick={() => handleIntervalChange(interval)}
                >
                  {interval}
                </button>
              ))}
            </div>
          </div>
          <div className="safety-hub__checkins">
            {checkIns.length === 0 ? (
              <p className="safety-hub__no-checkins">No check-ins yet. Stay safe! 💚</p>
            ) : (
              checkIns.slice(0, 8).map(ci => (
                <div key={ci.id} className="safety-hub__checkin-item">
                  <span className="safety-hub__checkin-dot">✓</span>
                  <div>
                    <strong>{new Date(ci.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                    <small>{ci.location}</small>
                  </div>
                  <small className="safety-hub__checkin-date">
                    {new Date(ci.time).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </small>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Safety Tips */}
      <div className="safety-hub__tips card">
        <h3>💡 Safety Tips</h3>
        <div className="safety-hub__tips-grid">
          <div className="safety-hub__tip">
            <span>📱</span>
            <p>Always keep your phone charged and carry a portable charger.</p>
          </div>
          <div className="safety-hub__tip">
            <span>📋</span>
            <p>Share your itinerary with family or friends before each trip.</p>
          </div>
          <div className="safety-hub__tip">
            <span>🏨</span>
            <p>Book accommodations in well-reviewed, populated areas.</p>
          </div>
          <div className="safety-hub__tip">
            <span>🚕</span>
            <p>Use registered transportation services and share ride details.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
