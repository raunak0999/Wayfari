import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTrips } from '../context/TripContext';
import { formatTripDuration } from '../utils/tripUtils';
import TripForm from '../components/TripForm';
import './MyTripsPage.css';

export default function MyTripsPage() {
  const { user, updateProfile } = useAuth();
  const { getUserTrips, addTrip, updateTrip, deleteTrip } = useTrips();
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const myTrips = getUserTrips(user?.id);

  const handlePostTrip = (formData) => {
    const currentUserId = user?.id || 'local_' + Date.now();
    const resolvedAge = formData.age
      ? parseInt(formData.age, 10)
      : (user?.profile?.age || user?.age || null);
    const rawCity = formData.city || user?.profile?.city || user?.city || '';
    const resolvedCity = rawCity && rawCity !== 'Global Nomad' ? String(rawCity).trim() : '';

    if ((formData.age || formData.city) && updateProfile) {
      updateProfile({
        profile: {
          age: resolvedAge || undefined,
          city: resolvedCity || undefined,
        }
      });
    }

    addTrip({
      ...formData,
      userId: currentUserId,
      user_id: currentUserId,
      user_name: user?.profile?.displayName || user?.name || 'Traveler',
      user_avatar: user?.profile?.avatar || user?.profile?.avatar_url || null,
      user_city: resolvedCity,
      user_age: resolvedAge && !isNaN(resolvedAge) ? resolvedAge : null,
      user_gender: user?.gender || user?.profile?.gender || 'other',
      user_experience: user?.travel_experience || user?.travelExperience || user?.profile?.travelExperience || 'intermediate',
      user_hobbies: user?.hobbies || user?.interests?.hobbies || [],
      user_music: user?.music || user?.interests?.music || [],
      user_bio: user?.profile?.bio || '',
    });
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
                      <strong>{formatTripDuration(trip.duration || trip.trip_duration)}</strong>
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
                    onClick={async () => {
                      if (deletingId) return;
                      setDeletingId(trip.id);
                      try {
                        await deleteTrip(trip.id);
                      } finally {
                        setDeletingId(null);
                      }
                    }}
                    disabled={deletingId === trip.id}
                    style={{
                      color: '#EF4444',
                      borderColor: '#FCA5A5',
                      opacity: deletingId === trip.id ? 0.6 : 1,
                      cursor: deletingId === trip.id ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {deletingId === trip.id ? 'Deleting...' : '🗑️ Delete Trip'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <TripForm
          onSubmit={handlePostTrip}
          onClose={() => setShowForm(false)}
          defaultAge={user?.profile?.age || ''}
          defaultCity={user?.profile?.city && user.profile.city !== 'Global Nomad' ? user.profile.city : ''}
        />
      )}
    </div>
  );
}
