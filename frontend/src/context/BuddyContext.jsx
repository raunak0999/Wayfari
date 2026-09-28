import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useTrips } from './TripContext';
import { matchesPreferenceDate } from '../utils/tripUtils';

const BuddyContext = createContext(null);

const CONNECTIONS_KEY = 'wayfari_connections';
const PROFILES_KEY = 'wayfari_profiles';

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

const getStoredLocalProfiles = () => {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY)) || {}; }
  catch { return {}; }
};

export function BuddyProvider({ children }) {
  const { trips, loading: tripsLoading } = useTrips();
  const [profiles, setProfiles] = useState(getStoredLocalProfiles);
  const [connections, setConnections] = useState(getStoredConnections);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const useSupabase = isSupabaseConfigured();

  // Load all user profiles from Supabase and merge with local storage
  const loadProfiles = useCallback(async () => {
    let dbProfiles = {};
    if (useSupabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*');

        if (!error && data) {
          data.forEach(p => {
            dbProfiles[p.id] = p;
          });
        }
      } catch (err) {
        console.warn('Supabase loadProfiles error:', err);
      }
    }
    const localProfiles = getStoredLocalProfiles();
    const merged = { ...localProfiles, ...dbProfiles };
    setProfiles(merged);
    setProfilesLoading(false);
  }, [useSupabase]);

  // Load connections
  const loadConnections = useCallback(async () => {
    if (useSupabase) {
      try {
        const { data } = await supabase.from('connections').select('*');
        if (data) {
          setConnections(data);
          return;
        }
      } catch (err) {
        console.warn('Supabase loadConnections error:', err);
      }
    }
    setConnections(getStoredConnections());
  }, [useSupabase]);

  useEffect(() => {
    loadProfiles();
    loadConnections();

    if (useSupabase) {
      try {
        const profileSub = supabase
          .channel('profiles-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
            loadProfiles();
          })
          .subscribe();

        const connSub = supabase
          .channel('connections-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => {
            loadConnections();
          })
          .subscribe();

        return () => {
          supabase.removeChannel(profileSub);
          supabase.removeChannel(connSub);
        };
      } catch (err) {
        console.warn('Supabase realtime subscription error:', err);
      }
    }
  }, [loadProfiles, loadConnections, useSupabase]);

  // Save connections locally whenever they change
  useEffect(() => {
    if (!useSupabase && connections.length > 0) {
      setStoredConnections(connections);
    }
  }, [connections, useSupabase]);

  /**
   * Derive REAL travelers dynamically from active trips.
   * - No dummy / seed data!
   * - Shows every upcoming trip where travel has not ended yet.
   */
  const buddies = useMemo(() => {
    if (!trips || trips.length === 0) return [];

    return trips
      .filter(trip => {
        if (trip.status === 'completed') return false;
        const depDate = trip.departure_date || trip.departureDate;
        const rawDur = trip.duration || trip.trip_duration || '7 days';
        const duration = typeof rawDur === 'string' && rawDur.trim().startsWith('[') ? '7 days' : rawDur;
        return matchesPreferenceDate(depDate, duration, null);
      })
      .map(trip => {
        const userId = trip.user_id || trip.userId;
        const profile = profiles[userId] || {};
        const rawDur = trip.duration || trip.trip_duration || '7 days';
        const cleanDur = typeof rawDur === 'string' && rawDur.trim().startsWith('[') ? '7 days' : rawDur;

        return {
          id: trip.id,
          tripId: trip.id,
          userId: userId,
          name: profile.name || trip.user_name || 'Traveler',
          age: profile.age || trip.user_age || 25,
          gender: profile.gender || trip.user_gender || 'other',
          city: profile.city || trip.user_city || 'Global Nomad',
          bio: profile.bio || trip.user_bio || 'Excited to explore with fellow travel buddies!',
          avatar: profile.avatar_url || profile.avatar || trip.user_avatar || null,
          avatar_url: profile.avatar_url || profile.avatar || trip.user_avatar || null,
          hobbies: profile.hobbies && profile.hobbies.length > 0 ? profile.hobbies : (trip.user_hobbies || []),
          music: profile.music && profile.music.length > 0 ? profile.music : (trip.user_music || []),
          travel_experience: profile.travel_experience || trip.user_experience || 'intermediate',
          noise_level: profile.noise_level || 'Moderate',
          sleep_schedule: profile.sleep_schedule || 'Flexible',
          destination: trip.destination,
          departure_date: trip.departure_date || trip.departureDate,
          departureDate: trip.departure_date || trip.departureDate,
          return_date: trip.return_date,
          trip_duration: cleanDur,
          duration: cleanDur,
          group_size: trip.group_size || trip.groupSize || '2',
          groupSize: trip.group_size || trip.groupSize || '2',
          travel_style: trip.travel_style || trip.travelStyle || 'Mid-range',
          travelStyle: trip.travel_style || trip.travelStyle || 'Mid-range',
          status: trip.status || 'active',
          profile_complete: true,
          created_at: trip.created_at || profile.created_at || new Date().toISOString(),
        };
      })
      .sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });
  }, [trips, profiles]);

  // ── Compatibility Algorithm ──
  const calculateCompatibility = useCallback((userProfile, buddy) => {
    if (!buddy) return 75;
    const userHobbies = userProfile?.hobbies || userProfile?.interests?.hobbies || [];
    const userStyle = userProfile?.travelStyle || userProfile?.travel_style || userProfile?.preferences?.travelStyle;
    const userSize = userProfile?.groupSize || userProfile?.group_size || userProfile?.preferences?.groupSize;
    const userDest = userProfile?.destination || userProfile?.preferences?.destination || '';
    const userExp = userProfile?.travelExperience || userProfile?.travel_experience || 'beginner';

    const buddyHobbies = buddy.hobbies || [];
    const buddyStyle = buddy.travel_style || buddy.travelStyle;
    const buddySize = buddy.group_size || buddy.groupSize;
    const buddyDest = buddy.destination || '';
    const buddyExp = buddy.travel_experience || buddy.travelExperience || 'intermediate';

    let score = 0;
    let total = 0;

    // 1. Mentorship / Experience match (25 points)
    total += 25;
    if (userExp === 'beginner' && buddyExp === 'expert') score += 25;
    else if (userExp === 'beginner' && buddyExp === 'intermediate') score += 20;
    else if (userExp === 'expert' && buddyExp === 'beginner') score += 25;
    else if (userExp === buddyExp) score += 18;
    else score += 12;

    // 2. Destination match (25 points)
    if (userDest && buddyDest) {
      total += 25;
      const u = userDest.toLowerCase();
      const b = buddyDest.toLowerCase();
      if (u === b) score += 25;
      else if (u.includes(b) || b.includes(u)) score += 20;
      else score += 5;
    }

    // 3. Travel style / budget match (15 points)
    if (userStyle && buddyStyle) {
      total += 15;
      score += (userStyle === buddyStyle ? 15 : 5);
    }

    // 4. Hobbies overlap (20 points)
    if (userHobbies.length > 0 && buddyHobbies.length > 0) {
      total += 20;
      const overlap = userHobbies.filter(h => buddyHobbies.includes(h)).length;
      const maxPossible = Math.max(userHobbies.length, buddyHobbies.length, 1);
      score += Math.round((overlap / maxPossible) * 20);
    }

    // 5. Group size (15 points)
    if (userSize && buddySize) {
      total += 15;
      score += (userSize === buddySize ? 15 : 5);
    }

    const pct = total > 0 ? Math.round((score / total) * 100) : 80;
    return Math.max(50, Math.min(99, pct));
  }, []);

  // ── Detailed Breakdown ──
  const getCompatibilityBreakdown = useCallback((userProfile, buddy) => {
    if (!buddy) return [];
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
      detail: hobbyOverlap.length > 0 ? `${hobbyOverlap.length} shared: ${hobbyOverlap.join(', ')}` : 'No shared hobbies yet',
    });

    // Music
    const musicOverlap = userMusic.filter(m => buddyMusic.includes(m));
    const musicMax = Math.max(userMusic.length, buddyMusic.length, 1);
    const musicPct = userMusic.length ? Math.round((musicOverlap.length / musicMax) * 100) : 0;
    breakdown.push({
      label: 'Music Taste',
      icon: '🎵',
      score: musicPct,
      detail: musicOverlap.length > 0 ? `${musicOverlap.length} shared genres` : 'Different musical vibes',
    });

    // Travel Style
    const styleMatch = userStyle && buddyStyle && userStyle === buddyStyle;
    breakdown.push({
      label: 'Travel Style',
      icon: '✨',
      score: styleMatch ? 100 : 30,
      detail: styleMatch ? `Both prefer ${userStyle}` : `You: ${userStyle || 'Flexible'} · They: ${buddyStyle || 'Flexible'}`,
    });

    // Destination
    const destMatch = userDest && buddyDest && userDest.toLowerCase().includes(buddyDest.toLowerCase());
    breakdown.push({
      label: 'Destination',
      icon: '📍',
      score: destMatch ? 100 : 20,
      detail: destMatch ? `Both heading to ${buddyDest}!` : `Their trip: ${buddyDest || 'Various'}`,
    });

    // Group Size
    const sizeMatch = userSize && buddySize && userSize === buddySize;
    breakdown.push({
      label: 'Group Size',
      icon: '👥',
      score: sizeMatch ? 100 : 40,
      detail: sizeMatch ? `Both prefer group of ${userSize}` : `You: ${userSize || 'Any'} · They: ${buddySize || 'Any'}`,
    });

    return breakdown;
  }, []);

  // ── Connection Management ──
  const sendConnectionRequest = useCallback(async (userId, targetBuddy) => {
    const targetUserId = typeof targetBuddy === 'object'
      ? (targetBuddy.userId || targetBuddy.id)
      : targetBuddy;

    if (!userId || !targetUserId || userId === targetUserId) return;

    // Check if connection already exists
    const existing = connections.find(c =>
      (c.from_user_id === userId && c.to_user_id === targetUserId) ||
      (c.from_user_id === targetUserId && c.to_user_id === userId)
    );
    if (existing) return existing;

    const newConn = {
      id: 'conn_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      from_user_id: userId,
      to_user_id: targetUserId,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    setConnections(prev => [...prev, newConn]);

    if (useSupabase) {
      try {
        const { data, error } = await supabase
          .from('connections')
          .insert({
            from_user_id: userId,
            to_user_id: targetUserId,
            status: 'pending'
          })
          .select()
          .single();

        if (data && !error) {
          setConnections(prev => prev.map(c => c.id === newConn.id ? data : c));
          newConn.id = data.id;
        }
      } catch (err) {
        console.warn('Supabase sendConnectionRequest error:', err);
      }
    }

    // Auto-accept after 1.5s so users can immediately test chatting with their match
    setTimeout(async () => {
      setConnections(prev => prev.map(c =>
        c.id === newConn.id ? { ...c, status: 'accepted' } : c
      ));

      if (useSupabase) {
        try {
          await supabase
            .from('connections')
            .update({ status: 'accepted' })
            .eq('id', newConn.id);
        } catch { /* ignore */ }
      }
    }, 1500);

    return newConn;
  }, [connections, useSupabase]);

  const getConnectionStatus = useCallback((userId, targetBuddy) => {
    const targetUserId = typeof targetBuddy === 'object'
      ? (targetBuddy.userId || targetBuddy.id)
      : targetBuddy;

    const conn = connections.find(c =>
      (c.from_user_id === userId && c.to_user_id === targetUserId) ||
      (c.from_user_id === targetUserId && c.to_user_id === userId)
    );
    return conn?.status || null;
  }, [connections]);

  const getAcceptedConnections = useCallback((userId) => {
    if (!userId) return [];
    return connections
      .filter(c => c.status === 'accepted' && (c.from_user_id === userId || c.to_user_id === userId))
      .map(c => {
        const buddyUserId = c.from_user_id === userId ? c.to_user_id : c.from_user_id;
        const prof = profiles[buddyUserId];
        if (prof) {
          return {
            id: buddyUserId,
            userId: buddyUserId,
            name: prof.name || 'Traveler',
            avatar: prof.avatar_url || prof.avatar || null,
            avatar_url: prof.avatar_url || prof.avatar || null,
            city: prof.city || '',
            bio: prof.bio || '',
            destination: prof.destination || 'Upcoming Adventure',
          };
        }
        const fromBuddies = buddies.find(b => b.userId === buddyUserId);
        if (fromBuddies) {
          return {
            id: buddyUserId,
            userId: buddyUserId,
            name: fromBuddies.name,
            avatar: fromBuddies.avatar,
            avatar_url: fromBuddies.avatar_url,
            city: fromBuddies.city,
            bio: fromBuddies.bio,
            destination: fromBuddies.destination,
          };
        }
        return {
          id: buddyUserId,
          userId: buddyUserId,
          name: 'Traveler',
          avatar: null,
          destination: 'Trip Match',
        };
      })
      .filter(Boolean);
  }, [connections, profiles, buddies]);

  // ── Search & Filter Buddies ──
  const searchBuddies = useCallback((filters = {}) => {
    let results = [...buddies];

    // Destination or place filter (case-insensitive substring)
    if (filters.destination && filters.destination.trim()) {
      const q = filters.destination.toLowerCase().trim();
      results = results.filter(b =>
        (b.destination || '').toLowerCase().includes(q) ||
        (b.city || '').toLowerCase().includes(q)
      );
    }

    // Preference date filter:
    // Only show if anyone is travelling on/ahead of preference date, and trip not ended
    if (filters.date) {
      results = results.filter(b => {
        const depDate = b.departure_date || b.departureDate;
        const dur = b.trip_duration || b.duration || '7 days';
        return matchesPreferenceDate(depDate, dur, filters.date);
      });
    }

    // Travel style filter
    if (filters.travelStyle) {
      results = results.filter(b => (b.travel_style || b.travelStyle) === filters.travelStyle);
    }

    // Group size filter
    if (filters.groupSize) {
      results = results.filter(b => (b.group_size || b.groupSize) === filters.groupSize);
    }

    // Experience filter
    if (filters.experience) {
      results = results.filter(b => (b.travel_experience || b.travelExperience) === filters.experience);
    }

    // Hobby filter
    if (filters.hobby) {
      results = results.filter(b => (b.hobbies || []).includes(filters.hobby));
    }

    return results;
  }, [buddies]);

  return (
    <BuddyContext.Provider value={{
      buddies,
      profiles,
      connections,
      calculateCompatibility,
      getCompatibilityBreakdown,
      sendConnectionRequest,
      getConnectionStatus,
      getAcceptedConnections,
      searchBuddies,
      loading: tripsLoading || profilesLoading,
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
