import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './ProfileWizard.css';

const HOBBIES = ['Hiking', 'Photography', 'Foodie', 'Culture', 'Beach', 'Gaming', 'Reading', 'Yoga', 'Nightlife', 'Cycling'];
const MUSIC = ['Pop', 'Rock', 'Jazz', 'Hip-Hop', 'Folk', 'Classical', 'EDM', 'World Music'];

export default function ProfileWizard() {
  const { user, updateProfile, isFemale } = useAuth();
  const navigate = useNavigate();
  const totalSteps = isFemale ? 4 : 3;
  const [step, setStep] = useState(1);

  const [profile, setProfile] = useState({
    avatar: user?.profile?.avatar || '',
    displayName: user?.name || '',
    age: '',
    city: '',
    bio: '',
  });

  const [preferences, setPreferences] = useState({
    destination: '',
    departureDate: '',
    departureTime: '',
    tripDuration: '',
    groupSize: '2',
    travelStyle: 'Mid-range',
  });

  const [interests, setInterests] = useState({
    hobbies: [],
    music: [],
    buddyGender: 'Any',
    noiseLevel: 'Moderate',
    sleepSchedule: 'Flexible',
  });

  const [safety, setSafety] = useState({
    contacts: [{ name: '', phone: '', relationship: '' }],
    sosEnabled: false,
    checkInInterval: '2hr',
  });

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleChip = (field, value, setter) => {
    setter(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }));
  };

  const addContact = () => {
    if (safety.contacts.length < 3) {
      setSafety(prev => ({
        ...prev,
        contacts: [...prev.contacts, { name: '', phone: '', relationship: '' }]
      }));
    }
  };

  const updateContact = (idx, field, value) => {
    setSafety(prev => ({
      ...prev,
      contacts: prev.contacts.map((c, i) => i === idx ? { ...c, [field]: value } : c)
    }));
  };

  const removeContact = (idx) => {
    setSafety(prev => ({
      ...prev,
      contacts: prev.contacts.filter((_, i) => i !== idx)
    }));
  };

  const handleFinish = () => {
    updateProfile({
      profileComplete: true,
      profile,
      preferences,
      interests,
      hobbies: interests.hobbies,
      music: interests.music,
      travelStyle: preferences.travelStyle,
      groupSize: preferences.groupSize,
      safety: isFemale ? safety : undefined,
    });
    navigate('/find-buddies');
  };

  const canNext = () => {
    switch (step) {
      case 1: return profile.displayName && profile.age && profile.city;
      case 2: return preferences.destination;
      case 3: return interests.hobbies.length > 0;
      case 4: return true;
      default: return true;
    }
  };

  return (
    <div className="wizard" id="profile-wizard">
      {/* Progress Bar */}
      <div className="wizard__progress">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className="wizard__step-track">
            <div
              className={`wizard__step-dot ${step > i + 1 ? 'completed' : ''} ${step === i + 1 ? 'active' : ''}`}
            >
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span className="wizard__step-label">
              {['Profile', 'Travel', 'Interests', 'Safety'][i]}
            </span>
            {i < totalSteps - 1 && (
              <div className={`wizard__step-line ${step > i + 1 ? 'filled' : ''}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Profile Info */}
      {step === 1 && (
        <div className="wizard__panel animate-fade-in-up" id="wizard-step-1">
          <h2>👤 Set Up Your Profile</h2>
          <p className="wizard__desc">Let other travelers get to know you!</p>

          <div className="wizard__avatar-upload">
            <label htmlFor="avatar-input" className="wizard__avatar-label">
              {profile.avatar ? (
                <img src={profile.avatar} alt="Avatar" />
              ) : (
                <div className="wizard__avatar-placeholder">
                  <span>📷</span>
                  <small>Upload Photo</small>
                </div>
              )}
            </label>
            <input
              type="file"
              id="avatar-input"
              accept="image/*"
              onChange={handleAvatarUpload}
              hidden
            />
          </div>

          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input
              className="form-input"
              placeholder="Your name"
              value={profile.displayName}
              onChange={e => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
            />
          </div>

          <div className="wizard__row">
            <div className="form-group">
              <label className="form-label">Age</label>
              <input
                className="form-input"
                type="number"
                min="18"
                max="99"
                placeholder="25"
                value={profile.age}
                onChange={e => setProfile(prev => ({ ...prev, age: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input
                className="form-input"
                placeholder="e.g., Mumbai"
                value={profile.city}
                onChange={e => setProfile(prev => ({ ...prev, city: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea
              className="form-input"
              placeholder="Tell us about yourself and what kind of travel buddy you're looking for..."
              value={profile.bio}
              onChange={e => setProfile(prev => ({ ...prev, bio: e.target.value }))}
            />
          </div>
        </div>
      )}

      {/* Step 2: Travel Preferences */}
      {step === 2 && (
        <div className="wizard__panel animate-fade-in-up" id="wizard-step-2">
          <h2>✈️ Travel Preferences</h2>
          <p className="wizard__desc">Tell us about your upcoming trip plans.</p>

          <div className="form-group">
            <label className="form-label">Dream Destination</label>
            <input
              className="form-input"
              placeholder="e.g., Bali, Indonesia"
              value={preferences.destination}
              onChange={e => setPreferences(prev => ({ ...prev, destination: e.target.value }))}
            />
          </div>

          <div className="wizard__row">
            <div className="form-group">
              <label className="form-label">Departure Date</label>
              <input
                className="form-input"
                type="date"
                value={preferences.departureDate}
                onChange={e => setPreferences(prev => ({ ...prev, departureDate: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Departure Time</label>
              <input
                className="form-input"
                type="time"
                value={preferences.departureTime}
                onChange={e => setPreferences(prev => ({ ...prev, departureTime: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Trip Duration</label>
            <input
              className="form-input"
              placeholder="e.g., 10 days"
              value={preferences.tripDuration}
              onChange={e => setPreferences(prev => ({ ...prev, tripDuration: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Group Size</label>
            <div className="pill-group">
              {['Solo', '2', '3', '4', '4+'].map(size => (
                <button
                  key={size}
                  type="button"
                  className={`pill-toggle ${preferences.groupSize === size ? 'pill-toggle--active' : ''}`}
                  onClick={() => setPreferences(prev => ({ ...prev, groupSize: size }))}
                >
                  {size === 'Solo' ? '🧍 Solo' : `👥 ${size}`}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Travel Style</label>
            <div className="pill-group">
              {['Budget', 'Mid-range', 'Luxury'].map(style => (
                <button
                  key={style}
                  type="button"
                  className={`pill-toggle ${preferences.travelStyle === style ? 'pill-toggle--active' : ''}`}
                  onClick={() => setPreferences(prev => ({ ...prev, travelStyle: style }))}
                >
                  {style === 'Budget' ? '💰' : style === 'Mid-range' ? '✨' : '👑'} {style}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Interests & Lifestyle */}
      {step === 3 && (
        <div className="wizard__panel animate-fade-in-up" id="wizard-step-3">
          <h2>🎯 Interests & Lifestyle</h2>
          <p className="wizard__desc">Help us find your perfect match!</p>

          <div className="form-group">
            <label className="form-label">Hobbies (select at least 1)</label>
            <div className="wizard__chips">
              {HOBBIES.map(hobby => (
                <button
                  key={hobby}
                  type="button"
                  className={`chip ${interests.hobbies.includes(hobby) ? 'chip--active' : ''}`}
                  onClick={() => toggleChip('hobbies', hobby, setInterests)}
                >
                  {hobby}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Music Taste</label>
            <div className="wizard__chips">
              {MUSIC.map(genre => (
                <button
                  key={genre}
                  type="button"
                  className={`chip ${interests.music.includes(genre) ? 'chip--active' : ''}`}
                  onClick={() => toggleChip('music', genre, setInterests)}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Preferred Buddy Gender</label>
            <div className="pill-group">
              {['Any', 'Male', 'Female'].map(g => (
                <button
                  key={g}
                  type="button"
                  className={`pill-toggle ${interests.buddyGender === g ? 'pill-toggle--active' : ''}`}
                  onClick={() => setInterests(prev => ({ ...prev, buddyGender: g }))}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Noise Level Preference</label>
            <div className="pill-group">
              {['Quiet', 'Moderate', 'Lively'].map(n => (
                <button
                  key={n}
                  type="button"
                  className={`pill-toggle ${interests.noiseLevel === n ? 'pill-toggle--active' : ''}`}
                  onClick={() => setInterests(prev => ({ ...prev, noiseLevel: n }))}
                >
                  {n === 'Quiet' ? '🤫' : n === 'Moderate' ? '😊' : '🎉'} {n}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Sleep Schedule</label>
            <div className="pill-group">
              {['Early Bird', 'Night Owl', 'Flexible'].map(s => (
                <button
                  key={s}
                  type="button"
                  className={`pill-toggle ${interests.sleepSchedule === s ? 'pill-toggle--active' : ''}`}
                  onClick={() => setInterests(prev => ({ ...prev, sleepSchedule: s }))}
                >
                  {s === 'Early Bird' ? '🌅' : s === 'Night Owl' ? '🦉' : '🔄'} {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Safety Hub (Female Only) */}
      {step === 4 && isFemale && (
        <div className="wizard__panel animate-fade-in-up" id="wizard-step-4">
          <h2>🛡️ Safety Hub Setup</h2>
          <p className="wizard__desc">Your safety is our top priority. Set up your safety network.</p>

          <div className="wizard__safety-section">
            <h4>Trusted Contacts (up to 3)</h4>
            {safety.contacts.map((contact, idx) => (
              <div key={idx} className="wizard__contact-row">
                <input
                  className="form-input"
                  placeholder="Name"
                  value={contact.name}
                  onChange={e => updateContact(idx, 'name', e.target.value)}
                />
                <input
                  className="form-input"
                  placeholder="Phone"
                  value={contact.phone}
                  onChange={e => updateContact(idx, 'phone', e.target.value)}
                />
                <input
                  className="form-input"
                  placeholder="Relationship"
                  value={contact.relationship}
                  onChange={e => updateContact(idx, 'relationship', e.target.value)}
                />
                {safety.contacts.length > 1 && (
                  <button className="wizard__remove-contact" onClick={() => removeContact(idx)}>✕</button>
                )}
              </div>
            ))}
            {safety.contacts.length < 3 && (
              <button className="btn btn--sm btn--outline" onClick={addContact}>
                + Add Contact
              </button>
            )}
          </div>

          <div className="wizard__safety-section">
            <div className="wizard__toggle-row">
              <div>
                <h4>🆘 Emergency SOS</h4>
                <p className="wizard__toggle-desc">Long-press SOS to silently text all contacts with your live GPS location.</p>
              </div>
              <label className="wizard__switch">
                <input
                  type="checkbox"
                  checked={safety.sosEnabled}
                  onChange={e => setSafety(prev => ({ ...prev, sosEnabled: e.target.checked }))}
                />
                <span className="wizard__slider"></span>
              </label>
            </div>
          </div>

          <div className="wizard__safety-section">
            <h4>⏰ Check-in Reminders</h4>
            <p className="wizard__toggle-desc">Auto-alert your contacts if you don't check in on time.</p>
            <div className="pill-group" style={{ marginTop: '12px' }}>
              {['1hr', '2hr', '4hr'].map(interval => (
                <button
                  key={interval}
                  type="button"
                  className={`pill-toggle ${safety.checkInInterval === interval ? 'pill-toggle--active' : ''}`}
                  onClick={() => setSafety(prev => ({ ...prev, checkInInterval: interval }))}
                >
                  Every {interval}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="wizard__nav">
        {step > 1 && (
          <button className="btn btn--outline" onClick={() => setStep(s => s - 1)}>
            ← Back
          </button>
        )}
        <div style={{ flex: 1 }} />
        {step < totalSteps ? (
          <button
            className="btn btn--primary"
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext()}
          >
            Next →
          </button>
        ) : (
          <button className="btn btn--primary btn--lg" onClick={handleFinish} disabled={!canNext()}>
            Complete Setup 🎉
          </button>
        )}
      </div>
    </div>
  );
}
