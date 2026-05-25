import { useState, useMemo } from 'react';
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
  const { buddies, searchBuddies, calculateCompatibility } = useBuddies();
  const [filters, setFilters] = useState({
    destination: '',
    date: '',
    groupSize: '',
    travelStyle: '',
    hobby: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('compatibility');

  const handleFilter = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setFilters({ destination: '', date: '', groupSize: '', travelStyle: '', hobby: '' });
  };

  const hasFilters = Object.values(filters).some(v => v);
  const filtered = hasFilters ? searchBuddies(filters) : buddies;

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
          const dateA = a.departure_date || a.departureDate || '9999';
          const dateB = b.departure_date || b.departureDate || '9999';
          return dateA.localeCompare(dateB);
        });
        break;
      default:
        break;
    }
    return sorted;
  }, [filtered, sortBy, calculateCompatibility, user]);

  const activeFilterCount = Object.values(filters).filter(v => v).length;

  return (
    <div className="find-page" id="find-buddies-page">
      <div className="container">
        {/* Header */}
        <div className="find-page__header animate-fade-in-up">
          <div>
            <h1>Find Your <span style={{ color: 'var(--primary)' }}>Travel Buddy</span></h1>
            <p>Discover compatible travelers heading to your dream destinations.</p>
          </div>
        </div>

        {/* Search/Filter Bar */}
        <div className="find-page__search card animate-fade-in-up">
          <div className="find-page__search-row">
            <div className="find-page__search-input-wrap">
              <span className="find-page__search-icon">🔍</span>
              <input
                className="find-page__search-input"
                placeholder="Search by destination..."
                value={filters.destination}
                onChange={e => handleFilter('destination', e.target.value)}
                id="search-destination"
              />
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
                <label className="form-label">Date From</label>
                <input
                  className="form-input"
                  type="date"
                  value={filters.date}
                  onChange={e => handleFilter('date', e.target.value)}
                />
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
            {results.length} traveler{results.length !== 1 ? 's' : ''} found
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

        {/* Buddy Grid */}
        {results.length > 0 ? (
          <div className="grid grid--3 stagger">
            {results.map(buddy => (
              <BuddyCard key={buddy.id} buddy={buddy} />
            ))}
          </div>
        ) : (
          <div className="find-page__empty card">
            <span>🔍</span>
            <h3>No travelers found</h3>
            <p>Try adjusting your filters to see more results.</p>
            <button className="btn btn--primary" onClick={clearFilters}>Clear Filters</button>
          </div>
        )}
      </div>
    </div>
  );
}
