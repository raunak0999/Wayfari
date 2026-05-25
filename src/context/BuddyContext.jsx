import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const BuddyContext = createContext(null);

const CONNECTIONS_KEY = 'wayfari_connections';

const isSupabaseConfigured = () => {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return key && key !== 'PASTE_YOUR_ANON_KEY_HERE' && key.length > 20;
};

const getStoredConnections = () => {
  try { return JSON.parse(localStorage.getItem(CONNECTIONS_KEY)) || []; }
  catch { return []; }
};

const setStoredConnections = (conns) => {
  localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(conns));
};

// Seed data — the buddies users can interact with
const SEED_BUDDIES = [
  {
    id: 'seed_0',
    name: 'Aanya Sharma', age: 26, gender: 'female', city: 'Mumbai',
    destination: 'Bali, Indonesia', bio: 'Yoga instructor who loves exploring hidden temples and local cuisine.',
    hobbies: ['Yoga', 'Foodie', 'Culture', 'Photography'],
    music: ['Jazz', 'World Music', 'Folk'],
    travel_style: 'Mid-range', group_size: '2', noise_level: 'Moderate', sleep_schedule: 'Early Bird',
    departure_date: '2026-06-15', trip_duration: '10 days', profile_complete: true
  },
  {
    id: 'seed_1',
    name: 'Marcus Chen', age: 29, gender: 'male', city: 'San Francisco',
    destination: 'Tokyo, Japan', bio: 'Software engineer by day, street photographer by night. Looking for a culture buddy!',
    hobbies: ['Photography', 'Gaming', 'Foodie', 'Culture'],
    music: ['Hip-Hop', 'EDM', 'Pop'],
    travel_style: 'Mid-range', group_size: '2', noise_level: 'Moderate', sleep_schedule: 'Night Owl',
    departure_date: '2026-07-01', trip_duration: '14 days', profile_complete: true
  },
  {
    id: 'seed_2',
    name: 'Priya Patel', age: 24, gender: 'female', city: 'London',
    destination: 'Santorini, Greece', bio: "Adventure seeker and sunset chaser. Let's find the best beaches together! 🌊",
    hobbies: ['Beach', 'Photography', 'Nightlife', 'Cycling'],
    music: ['Pop', 'EDM', 'Rock'],
    travel_style: 'Luxury', group_size: '3', noise_level: 'Lively', sleep_schedule: 'Night Owl',
    departure_date: '2026-06-20', trip_duration: '7 days', profile_complete: true
  },
  {
    id: 'seed_3',
    name: 'Jake Morrison', age: 31, gender: 'male', city: 'Sydney',
    destination: 'Patagonia, Argentina', bio: 'Hiking enthusiast and mountain lover. Looking for trekking partners for an epic adventure.',
    hobbies: ['Hiking', 'Photography', 'Cycling', 'Reading'],
    music: ['Rock', 'Folk', 'Classical'],
    travel_style: 'Budget', group_size: 'Solo', noise_level: 'Quiet', sleep_schedule: 'Early Bird',
    departure_date: '2026-08-10', trip_duration: '21 days', profile_complete: true
  },
  {
    id: 'seed_4',
    name: 'Sofia Rodriguez', age: 27, gender: 'female', city: 'Barcelona',
    destination: 'Marrakech, Morocco', bio: 'Foodie and culture lover. I travel for the food, stay for the stories. 🍜',
    hobbies: ['Foodie', 'Culture', 'Yoga', 'Reading'],
    music: ['World Music', 'Jazz', 'Folk'],
    travel_style: 'Budget', group_size: '4', noise_level: 'Moderate', sleep_schedule: 'Flexible',
    departure_date: '2026-07-15', trip_duration: '12 days', profile_complete: true
  },
  {
    id: 'seed_5',
    name: 'Ryan Kim', age: 25, gender: 'male', city: 'Seoul',
    destination: 'Bangkok, Thailand', bio: 'K-food blogger exploring street food scenes around the world. Always hungry! 🍜',
    hobbies: ['Foodie', 'Photography', 'Nightlife', 'Gaming'],
    music: ['Pop', 'Hip-Hop', 'EDM'],
    travel_style: 'Budget', group_size: '3', noise_level: 'Lively', sleep_schedule: 'Night Owl',
    departure_date: '2026-06-25', trip_duration: '10 days', profile_complete: true
  },
  {
    id: 'seed_6',
    name: 'Emma Wilson', age: 28, gender: 'female', city: 'Toronto',
    destination: 'Iceland', bio: 'Northern lights chaser and nature photographer. Looking for road trip buddies!',
    hobbies: ['Photography', 'Hiking', 'Reading', 'Yoga'],
    music: ['Classical', 'Folk', 'Jazz'],
    travel_style: 'Mid-range', group_size: '2', noise_level: 'Quiet', sleep_schedule: 'Early Bird',
    departure_date: '2026-09-01', trip_duration: '8 days', profile_complete: true
  },
  {
    id: 'seed_7',
    name: 'Diego Santos', age: 30, gender: 'male', city: 'São Paulo',
    destination: 'Barcelona, Spain', bio: "Beach volleyball player and nightlife enthusiast. Let's hit the Mediterranean!",
    hobbies: ['Beach', 'Nightlife', 'Cycling', 'Foodie'],
    music: ['EDM', 'Hip-Hop', 'World Music'],
    travel_style: 'Mid-range', group_size: '4+', noise_level: 'Lively', sleep_schedule: 'Night Owl',
    departure_date: '2026-07-20', trip_duration: '14 days', profile_complete: true
  },
  {
    id: 'seed_8',
    name: 'Lily Zhang', age: 23, gender: 'female', city: 'Shanghai',
    destination: 'Paris, France', bio: 'Art student with a passion for museums and cafés. Bonjour, travel buddy! 🎨',
    hobbies: ['Culture', 'Photography', 'Reading', 'Foodie'],
    music: ['Classical', 'Jazz', 'Pop'],
    travel_style: 'Mid-range', group_size: '2', noise_level: 'Moderate', sleep_schedule: 'Flexible',
    departure_date: '2026-08-05', trip_duration: '10 days', profile_complete: true
  }
];

export function BuddyProvider({ children }) {
  const [buddies, setBuddies] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const useSupabase = isSupabaseConfigured();

  // Load buddies
  const loadBuddies = useCallback(async () => {
    if (useSupabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('profile_complete', true);

      if (error || !data || data.length === 0) {
        setBuddies(SEED_BUDDIES);
      } else {
        setBuddies(data);
      }
    } else {
      setBuddies(SEED_BUDDIES);
    }
    setLoading(false);
  }, [useSupabase]);

  // Load connections
  const loadConnections = useCallback(async () => {
    if (useSupabase) {
      const { data } = await supabase.from('connections').select('*');
      if (data) {
        setConnections(data);
        return;
      }
    }
    // Local fallback
    setConnections(getStoredConnections());
  }, [useSupabase]);

  useEffect(() => {
    loadBuddies();
    loadConnections();

    if (useSupabase) {
      const connSub = supabase
        .channel('connections-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => {
          loadConnections();
        })
        .subscribe();

      return () => { supabase.removeChannel(connSub); };
    }
  }, [loadBuddies, loadConnections, useSupabase]);

  // Save connections to localStorage whenever they change
  useEffect(() => {
    if (!useSupabase && connections.length > 0) {
      setStoredConnections(connections);
    }
  }, [connections, useSupabase]);

  // ── Compatibility Algorithm ──
  const calculateCompatibility = useCallback((userProfile, buddy) => {
    const userHobbies = userProfile?.hobbies || userProfile?.interests?.hobbies || [];
    const userMusic = userProfile?.music || userProfile?.interests?.music || [];
    const userStyle = userProfile?.travelStyle || userProfile?.travel_style || userProfile?.preferences?.travelStyle;
    const userSize = userProfile?.groupSize || userProfile?.group_size || userProfile?.preferences?.groupSize;
    const userDest = userProfile?.destination || userProfile?.preferences?.destination || '';
    const userNoise = userProfile?.noiseLevel || userProfile?.noise_level || userProfile?.interests?.noiseLevel;
    const userSleep = userProfile?.sleepSchedule || userProfile?.sleep_schedule || userProfile?.interests?.sleepSchedule;

    const buddyHobbies = buddy.hobbies || [];
    const buddyMusic = buddy.music || [];
    const buddyStyle = buddy.travel_style || buddy.travelStyle;
    const buddySize = buddy.group_size || buddy.groupSize;
    const buddyDest = buddy.destination || '';
    const buddyNoise = buddy.noise_level || buddy.noiseLevel;
    const buddySleep = buddy.sleep_schedule || buddy.sleepSchedule;

    if (!userHobbies.length && !userMusic.length && !userStyle) {
      return Math.floor(Math.random() * 30) + 60;
    }

    let score = 0;
    let total = 0;

    // Hobbies overlap (30%)
    if (userHobbies.length && buddyHobbies.length) {
      const overlap = userHobbies.filter(h => buddyHobbies.includes(h)).length;
      const maxH = Math.max(userHobbies.length, buddyHobbies.length, 1);
      score += (overlap / maxH) * 30;
      total += 30;
    }

    // Music overlap (20%)
    if (userMusic.length && buddyMusic.length) {
      const overlap = userMusic.filter(m => buddyMusic.includes(m)).length;
      const maxM = Math.max(userMusic.length, buddyMusic.length, 1);
      score += (overlap / maxM) * 20;
      total += 20;
    }

    // Travel style (15%)
    if (userStyle) {
      score += (userStyle === buddyStyle ? 15 : 3);
      total += 15;
    }

    // Group size (10%)
    if (userSize) {
      score += (userSize === buddySize ? 10 : 3);
      total += 10;
    }

    // Destination match (15%)
    if (userDest && buddyDest) {
      const uLower = userDest.toLowerCase();
      const bLower = buddyDest.toLowerCase();
      if (uLower === bLower) {
        score += 15;
      } else if (bLower.includes(uLower) || uLower.includes(bLower)) {
        score += 10;
      } else {
        score += 2;
      }
      total += 15;
    }

    // Noise level (5%)
    if (userNoise) {
      score += (userNoise === buddyNoise ? 5 : 1);
      total += 5;
    }

    // Sleep schedule (5%)
    if (userSleep) {
      score += (userSleep === buddySleep ? 5 : 1);
      total += 5;
    }

    const pct = total > 0 ? Math.round((score / total) * 100) : 70;
    return Math.max(40, Math.min(99, pct));
  }, []);

  // ── Detailed Breakdown ──
  const getCompatibilityBreakdown = useCallback((userProfile, buddy) => {
    const userHobbies = userProfile?.hobbies || userProfile?.interests?.hobbies || [];
    const userMusic = userProfile?.music || userProfile?.interests?.music || [];
    const userStyle = userProfile?.travelStyle || userProfile?.travel_style || userProfile?.preferences?.travelStyle;
    const userSize = userProfile?.groupSize || userProfile?.group_size || userProfile?.preferences?.groupSize;
    const userDest = userProfile?.destination || userProfile?.preferences?.destination || '';

    const buddyHobbies = buddy.hobbies || [];
    const buddyMusic = buddy.music || [];
    const buddyStyle = buddy.travel_style || buddy.travelStyle;
    const buddySize = buddy.group_size || buddy.groupSize;
    const buddyDest = buddy.destination || '';

    const breakdown = [];

    // Hobbies
    const hobbyOverlap = userHobbies.filter(h => buddyHobbies.includes(h));
    const hobbyMax = Math.max(userHobbies.length, buddyHobbies.length, 1);
    const hobbyPct = userHobbies.length ? Math.round((hobbyOverlap.length / hobbyMax) * 100) : 0;
    breakdown.push({
      label: 'Hobbies',
      icon: '🎯',
      score: hobbyPct,
      detail: hobbyOverlap.length > 0 ? `${hobbyOverlap.length} shared: ${hobbyOverlap.join(', ')}` : 'No shared hobbies',
    });

    // Music
    const musicOverlap = userMusic.filter(m => buddyMusic.includes(m));
    const musicMax = Math.max(userMusic.length, buddyMusic.length, 1);
    const musicPct = userMusic.length ? Math.round((musicOverlap.length / musicMax) * 100) : 0;
    breakdown.push({
      label: 'Music',
      icon: '🎵',
      score: musicPct,
      detail: musicOverlap.length > 0 ? `${musicOverlap.length} shared: ${musicOverlap.join(', ')}` : 'No shared tastes',
    });

    // Travel Style
    const styleMatch = userStyle === buddyStyle;
    breakdown.push({
      label: 'Travel Style',
      icon: '✨',
      score: userStyle ? (styleMatch ? 100 : 20) : 0,
      detail: styleMatch ? `Both prefer ${buddyStyle}` : `You: ${userStyle || 'N/A'} · They: ${buddyStyle}`,
    });

    // Destination
    const destMatch = userDest && buddyDest &&
      (userDest.toLowerCase().includes(buddyDest.toLowerCase()) || buddyDest.toLowerCase().includes(userDest.toLowerCase()));
    breakdown.push({
      label: 'Destination',
      icon: '📍',
      score: !userDest ? 0 : destMatch ? 100 : 15,
      detail: destMatch ? `Both heading to ${buddyDest}!` : buddyDest,
    });

    // Group Size
    const sizeMatch = userSize === buddySize;
    breakdown.push({
      label: 'Group Size',
      icon: '👥',
      score: userSize ? (sizeMatch ? 100 : 30) : 0,
      detail: sizeMatch ? `Both want ${buddySize}` : `You: ${userSize || 'N/A'} · They: ${buddySize}`,
    });

    return breakdown;
  }, []);

  // ── Connections ──
  const sendConnectionRequest = useCallback(async (userId, buddyId) => {
    const existing = connections.find(c =>
      (c.from_user_id === userId && c.to_user_id === buddyId) ||
      (c.from_user_id === buddyId && c.to_user_id === userId)
    );
    if (existing) return existing;

    const conn = {
      id: 'conn_' + Date.now(),
      from_user_id: userId,
      to_user_id: buddyId,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    setConnections(prev => {
      const updated = [...prev, conn];
      setStoredConnections(updated);
      return updated;
    });

    if (useSupabase && !buddyId.startsWith('seed_')) {
      const { data, error } = await supabase
        .from('connections')
        .insert({ from_user_id: userId, to_user_id: buddyId, status: 'pending' })
        .select()
        .single();

      if (!error && data) {
        conn.id = data.id;
      }
    }

    // Auto-accept after 2 seconds
    setTimeout(() => {
      setConnections(prev => {
        const updated = prev.map(c =>
          c.id === conn.id ? { ...c, status: 'accepted' } : c
        );
        setStoredConnections(updated);
        return updated;
      });

      if (useSupabase && !buddyId.startsWith('seed_') && conn.id) {
        supabase.from('connections').update({ status: 'accepted' }).eq('id', conn.id);
      }
    }, 2000);

    return conn;
  }, [connections, useSupabase]);

  const getConnectionStatus = useCallback((userId, buddyId) => {
    const conn = connections.find(c =>
      (c.from_user_id === userId && c.to_user_id === buddyId) ||
      (c.from_user_id === buddyId && c.to_user_id === userId)
    );
    return conn?.status || null;
  }, [connections]);

  const getAcceptedConnections = useCallback((userId) => {
    return connections
      .filter(c => c.status === 'accepted' &&
        (c.from_user_id === userId || c.to_user_id === userId))
      .map(c => {
        const buddyId = c.from_user_id === userId ? c.to_user_id : c.from_user_id;
        return buddies.find(b => b.id === buddyId);
      })
      .filter(Boolean);
  }, [connections, buddies]);

  const searchBuddies = useCallback((filters) => {
    let results = [...buddies];

    if (filters.destination) {
      results = results.filter(b =>
        (b.destination || '').toLowerCase().includes(filters.destination.toLowerCase())
      );
    }
    if (filters.travelStyle) {
      results = results.filter(b => (b.travel_style || b.travelStyle) === filters.travelStyle);
    }
    if (filters.groupSize) {
      results = results.filter(b => (b.group_size || b.groupSize) === filters.groupSize);
    }
    if (filters.date) {
      results = results.filter(b => (b.departure_date || b.departureDate) >= filters.date);
    }
    if (filters.hobby) {
      results = results.filter(b => (b.hobbies || []).includes(filters.hobby));
    }

    return results;
  }, [buddies]);

  return (
    <BuddyContext.Provider value={{
      buddies,
      connections,
      calculateCompatibility,
      getCompatibilityBreakdown,
      sendConnectionRequest,
      getConnectionStatus,
      getAcceptedConnections,
      searchBuddies,
      loading
    }}>
      {children}
    </BuddyContext.Provider>
  );
}

export function useBuddies() {
  const ctx = useContext(BuddyContext);
  if (!ctx) throw new Error('useBuddies must be used within BuddyProvider');
  return ctx;
}
