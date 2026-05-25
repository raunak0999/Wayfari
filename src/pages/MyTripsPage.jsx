import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../context/TripContext';
import TripForm from '../components/TripForm';
import './MyTripsPage.css';

export default function MyTripsPage() {
  const { user } = useAuth();
  const { getUserTrips, addTrip, updateTrip, deleteTrip } = useTrips();
  const [showForm, setShowForm] = useState(false);

  const myTrips = getUserTrips(user?.id);

  const handlePostTrip = (formData) => {
    addTrip({ ...formData, userId: user.id });
    setShowForm(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'badge--success';
      case 'matched': return 'badge--primary';
      case 'completed': return 'badge--info';
      default: return 'badge--primary';
    }
  };

  const cycleStatus = (tripId, currentStatus) => {
    const next = { active: 'matched', matched: 'completed', completed: 'active' };
    updateTrip(tripId, { status: next[currentStatus] });
  };

  return (
    <div className="trips-page" id="my-trips-page">
      <div className="container">
        <div className="trips-page__header animate-fade-in-up">
          <div>
            <h1>🗺️ My Trips</h1>
            <p>Manage your posted trips and track their status.</p>
          </div>
          <button className="btn btn--primary btn--lg" onClick={() => setShowForm(true)} id="post-trip-btn">
            + Post New Trip
          </button>
        </div>

        {myTrips.length === 0 ? (
          <div className="trips-page__empty card animate-fade-in-up">
            <span>🌍</span>
            <h3>No trips posted yet</h3>
            <p>Post your first trip and start finding travel buddies!</p>
            <button className="btn btn--primary" onClick={() => setShowForm(true)}>
              Post Your First Trip
            </button>
          </div>
        ) : (
          <div className="trips-page__list stagger">
            {myTrips.map(trip => (
              <div className="trips-page__trip card" key={trip.id}>
                <div className="trips-page__trip-header">
                  <div className="trips-page__trip-dest">
                    <span className="trips-page__trip-icon">📍</span>
                    <h3>{trip.destination}</h3>
                  </div>
                  <button
                    className={`badge ${getStatusColor(trip.status)}`}
                    onClick={() => cycleStatus(trip.id, trip.status)}
                    title="Click to change status"
                  >
                    {trip.status}
                  </button>
                </div>

                <div className="trips-page__trip-details">
                  <div className="trips-page__detail">
                    <span>📅</span>
                    <div>
                      <small>Departure</small>
                      <strong>{trip.departure_date || trip.departureDate || 'TBD'}</strong>
                    </div>
                  </div>
                  <div className="trips-page__detail">
                    <span>⏱️</span>
                    <div>
                      <small>Duration</small>
                      <strong>{trip.duration || 'TBD'}</strong>
                    </div>
                  </div>
                  <div className="trips-page__detail">
                    <span>👥</span>
                    <div>
                      <small>Group Size</small>
                      <strong>{trip.group_size || trip.groupSize}</strong>
                    </div>
                  </div>
                  <div className="trips-page__detail">
                    <span>✨</span>
                    <div>
                      <small>Style</small>
                      <strong>{trip.travel_style || trip.travelStyle}</strong>
                    </div>
                  </div>
                </div>

                <div className="trips-page__trip-actions">
                  <button
                    className="btn btn--sm btn--outline"
                    onClick={() => deleteTrip(trip.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && <TripForm onSubmit={handlePostTrip} onClose={() => setShowForm(false)} />}
    </div>
  );
}
