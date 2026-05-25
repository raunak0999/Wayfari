import { useState } from 'react';
import './TripForm.css';

export default function TripForm({ onSubmit, onClose }) {
  const [form, setForm] = useState({
    destination: '',
    departureDate: '',
    departureTime: '',
    duration: '',
    groupSize: '2',
    travelStyle: 'Mid-range'
  });

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="trip-form-overlay" onClick={onClose}>
      <div className="trip-form card animate-fade-in-up" onClick={e => e.stopPropagation()} id="trip-form">
        <div className="trip-form__header">
          <h3>🗺️ Post a New Trip</h3>
          <button className="trip-form__close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Destination</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g., Bali, Indonesia"
              value={form.destination}
              onChange={e => handleChange('destination', e.target.value)}
              required
            />
          </div>

          <div className="trip-form__row">
            <div className="form-group">
              <label className="form-label">Departure Date</label>
              <input
                className="form-input"
                type="date"
                value={form.departureDate}
                onChange={e => handleChange('departureDate', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Departure Time</label>
              <input
                className="form-input"
                type="time"
                value={form.departureTime}
                onChange={e => handleChange('departureTime', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Trip Duration</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g., 7 days"
              value={form.duration}
              onChange={e => handleChange('duration', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Group Size</label>
            <div className="pill-group">
              {['Solo', '2', '3', '4', '4+'].map(size => (
                <button
                  key={size}
                  type="button"
                  className={`pill-toggle ${form.groupSize === size ? 'pill-toggle--active' : ''}`}
                  onClick={() => handleChange('groupSize', size)}
                >
                  {size}
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
                  className={`pill-toggle ${form.travelStyle === style ? 'pill-toggle--active' : ''}`}
                  onClick={() => handleChange('travelStyle', style)}
                >
                  {style === 'Budget' ? '💰' : style === 'Mid-range' ? '✨' : '👑'} {style}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn--primary btn--lg trip-form__submit">
            Post Trip 🚀
          </button>
        </form>
      </div>
    </div>
  );
}
