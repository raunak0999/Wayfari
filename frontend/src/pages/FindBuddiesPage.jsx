import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBuddies } from '../context/BuddyContext';
import BuddyCard from '../components/BuddyCard';
import './FindBuddiesPage.css';

const HOBBIES = ['Hiking', 'Photography', 'Foodie', 'Culture', 'Beach', 'Gaming', 'Reading', 'Yoga', 'Nightlife', 'Cycling'];
const SORT_OPTIONS = [
  { value: 'compatibility', label: '🔥 Best Match' },
  { value: 'destination', label: '📍 Destination' },
  { value: 'date', label: '📅 Departure' },
];

export default function FindBuddiesPage() {
  const { user } = useAuth();
  const { buddies, searchBuddies, calculateCompatibility, loading } = useBuddies();
  const [filters, setFilters] = useState({
    destination: '',
    date: '',
    groupSize: '',
    travelStyle: '',
    experience: '',
    hobby: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('compatibility');

  const handleFilter = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({
      destination: '',
      date: '',
      groupSize: '',
      travelStyle: '',
      experience: '',
      hobby: '',
    });
  };

  const hasFilters = Object.values(filters).some(v => Boolean(v));

  // Find Buddies should ONLY show OTHER travelers' posts
  // A user's own trips belong exclusively in the "My Trips" section
  const otherBuddies = useMemo(() => {
    if (!user) return buddies;
    return buddies.filter(b => b.userId !== user.id);
  }, [buddies, user]);

  const filtered = useMemo(() => {
    if (hasFilters) {
      const searched = searchBuddies(filters);
      if (!user) return searched;
      return searched.filter(b => b.userId !== user.id);
    }
    return otherBuddies;
  }, [hasFilters, filters, searchBuddies, otherBuddies, user]);

  // Sort results
  const results = useMemo(() => {
    const sorted = [...filtered];
    switch (sortBy) {
      case 'compatibility':
        sorted.sort((a, b) => {
          const scoreA = calculateCompatibility(user, a);
          const scoreB = calculateCompatibility(user, b);
          return scoreB - scoreA;
        });
        break;
      case 'destination':
        sorted.sort((a, b) => (a.destination || '').localeCompare(b.destination || ''));
        break;
      case 'date':
        sorted.sort((a, b) => {
          const dateA = a.departure_date || a.departureDate || '9999-99-99';
          const dateB = b.departure_date || b.departureDate || '9999-99-99';
          return dateA.localeCompare(dateB);
        });
        break;
      default:
        break;
    }
    return sorted;
  }, [filtered, sortBy, calculateCompatibility, user]);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="find-page" id="find-buddies-page">
      <div className="container">
        {/* Header */}
        <div className="find-page__header animate-fade-in-up">
          <div>
            <h1>Find Your <span className="find-page__highlight">Travel Buddy</span></h1>
            <p>Discover fellow travelers planning upcoming adventures to your dream destinations.</p>
          </div>
        </div>

        {/* Search/Filter Bar */}
        <div className="find-page__search card animate-fade-in-up">
          <div className="find-page__search-row">
            <div className="find-page__search-input-wrap">
              <span className="find-page__search-icon">🔍</span>
              <input
                className="find-page__search-input"
                placeholder="Search by destination, place, or city (e.g. Bali, Dubai, Tokyo)..."
                value={filters.destination}
                onChange={e => handleFilter('destination', e.target.value)}
                id="search-destination"
              />
              {filters.destination && (
                <button
                  type="button"
                  onClick={() => handleFilter('destination', '')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: '1rem',
                    padding: '0 4px',
                  }}
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              className="btn btn--outline find-page__filter-toggle"
              onClick={() => setShowFilters(!showFilters)}
            >
              ⚙️ Filters {activeFilterCount > 0 && <span className="find-page__filter-dot">{activeFilterCount}</span>}
            </button>
          </div>

          {showFilters && (
            <div className="find-page__filters animate-fade-in">
              <div className="form-group">
                <label className="form-label">Travelling From Date (Upcoming)</label>
                <input
                  className="form-input"
                  type="date"
                  value={filters.date}
                  onChange={e => handleFilter('date', e.target.value)}
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
                  Only shows travelers with trips on or ahead of this date
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Group Size</label>
                <div className="pill-group">
                  {['', 'Solo', '2', '3', '4', '4+'].map(size => (
                    <button
                      key={size}
                      className={`pill-toggle ${filters.groupSize === size ? 'pill-toggle--active' : ''}`}
                      onClick={() => handleFilter('groupSize', size)}
                    >
                      {size || 'Any'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Travel Style</label>
                <div className="pill-group">
                  {['', 'Budget', 'Mid-range', 'Luxury'].map(style => (
                    <button
                      key={style}
                      className={`pill-toggle ${filters.travelStyle === style ? 'pill-toggle--active' : ''}`}
                      onClick={() => handleFilter('travelStyle', style)}
                    >
                      {style || 'Any'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Experience Level</label>
                <div className="pill-group">
                  {[
                    { val: '', label: 'Any' },
                    { val: 'beginner', label: '🔰 Beginners' },
                    { val: 'intermediate', label: '🧳 Intermediate' },
                    { val: 'expert', label: '🏔️ Experts / Mentors' }
                  ].map(item => (
                    <button
                      key={item.val}
                      className={`pill-toggle ${filters.experience === item.val ? 'pill-toggle--active' : ''}`}
                      onClick={() => handleFilter('experience', item.val)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Hobby</label>
                <div className="find-page__hobby-chips">
                  <button
                    className={`chip ${!filters.hobby ? 'chip--active' : ''}`}
                    onClick={() => handleFilter('hobby', '')}
                  >
                    All
                  </button>
                  {HOBBIES.map(hobby => (
                    <button
                      key={hobby}
                      className={`chip ${filters.hobby === hobby ? 'chip--active' : ''}`}
                      onClick={() => handleFilter('hobby', filters.hobby === hobby ? '' : hobby)}
                    >
                      {hobby}
                    </button>
                  ))}
                </div>
              </div>

              {hasFilters && (
                <button className="btn btn--sm btn--outline" onClick={clearFilters}>
                  Clear All Filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results Header with Sort */}
        <div className="find-page__results-header">
          <span className="find-page__results-info">
            {results.length} fellow traveler{results.length !== 1 ? 's' : ''} found
          </span>
          <div className="find-page__sort">
            <span className="find-page__sort-label">Sort by:</span>
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`find-page__sort-btn ${sortBy === opt.value ? 'active' : ''}`}
                onClick={() => setSortBy(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Buddy Grid / Empty State */}
        {results.length > 0 ? (
          <div className="grid grid--3 stagger">
            {results.map(buddy => (
              <BuddyCard key={buddy.id} buddy={buddy} />
            ))}
          </div>
        ) : loading && buddies.length === 0 ? (
          <div className="find-page__empty card">
            <span>⏳</span>
            <h3>Finding upcoming travelers...</h3>
          </div>
        ) : hasFilters ? (
          <div className="find-page__empty card">
            <span>🔍</span>
            <h3>No matching travelers found</h3>
            <p>No other travelers match your current search filters. Try typing a different place or clearing your filters.</p>
            <button className="btn btn--primary" onClick={clearFilters}>Clear Filters</button>
          </div>
        ) : (
          <div className="find-page__empty card">
            <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: '14px' }}>🌍</span>
            <h3>No Other Upcoming Trips Found Yet</h3>
            <p style={{ maxWidth: '460px', margin: '0 auto 20px', color: 'var(--text-secondary)' }}>
              {user ? (
                <>Your posted trips are stored in your <strong>My Trips</strong> section. When friends or other travelers post trips, they will appear here so you can connect!</>
              ) : (
                <>Be the first to share your travel plans! Sign up or log in to post your trip and find travel buddies.</>
              )}
            </p>
            <Link to={user ? "/my-trips" : "/auth"} className="btn btn--primary btn--lg">
              {user ? "View My Trips" : "Sign Up & Post a Trip"}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
