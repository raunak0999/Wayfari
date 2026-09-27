import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { matchesPreferenceDate } from '../utils/tripUtils';

const TripContext = createContext(null);
const TRIPS_KEY = 'wayfari_trips';

const isSupabaseConfigured = () => {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return key && key !== 'PASTE_YOUR_ANON_KEY_HERE' && key.length > 20;
};

const getStoredTrips = () => {
  try { return JSON.parse(localStorage.getItem(TRIPS_KEY)) || []; }
  catch { return []; }
};

const saveStoredTrips = (trips) => {
  localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
};

export function TripProvider({ children }) {
  const [trips, setTrips] = useState(getStoredTrips);
  const [loading, setLoading] = useState(true);
  const useSupabase = isSupabaseConfigured();

  // Load all trips and merge with local storage
  const loadTrips = useCallback(async () => {
    let dbTrips = [];
    if (useSupabase) {
      try {
        const { data, error } = await supabase
          .from('trips')
          .select('*, profiles(*)')
          .order('created_at', { ascending: false });

        if (!error && data) {
          dbTrips = data.map(t => {
            const p = t.profiles || {};
            return {
              ...t,
              user_name: p.name || t.user_name || 'Traveler',
              user_avatar: p.avatar_url || t.user_avatar || null,
              user_city: p.city || t.user_city || '',
              user_age: p.age || t.user_age || null,
              user_gender: p.gender || t.user_gender || 'other',
              user_experience: p.travel_experience || t.user_experience || 'intermediate',
              user_hobbies: p.hobbies || t.user_hobbies || [],
              user_music: p.music || t.user_music || [],
              user_bio: p.bio || t.user_bio || '',
            };
          });
        }
      } catch (err) {
        console.warn('Supabase loadTrips error:', err);
      }
    }
    const localTrips = getStoredTrips();
    const dbIds = new Set(dbTrips.map(t => t.id));
    const extraLocal = localTrips.filter(t => !dbIds.has(t.id));
    const merged = [...dbTrips, ...extraLocal];
    setTrips(merged);
    saveStoredTrips(merged);
    setLoading(false);
  }, [useSupabase]);

  useEffect(() => {
    loadTrips();

    if (useSupabase) {
      try {
        const channel = supabase
          .channel('trips-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
            loadTrips();
          })
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (err) {
        console.warn('Realtime trips channel subscription error:', err);
      }
    }
  }, [loadTrips, useSupabase]);

  // Persist locally whenever trips change
  useEffect(() => {
    if (trips.length > 0) {
      saveStoredTrips(trips);
    }
  }, [trips]);

  const addTrip = useCallback(async (trip) => {
    const localTrip = {
      ...trip,
      id: 'trip_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      user_id: trip.userId,
      userId: trip.userId,
      destination: trip.destination,
      departure_date: trip.departureDate || trip.departure_date || null,
      departure_time: trip.departureTime || trip.departure_time || null,
      duration: trip.duration || '7 days',
      group_size: trip.groupSize || trip.group_size || '2',
      travel_style: trip.travelStyle || trip.travel_style || 'Mid-range',
      status: 'active',
      created_at: new Date().toISOString(),
      user_name: trip.user_name || 'Traveler',
      user_avatar: trip.user_avatar || null,
      user_city: trip.user_city || '',
      user_age: trip.user_age || null,
      user_gender: trip.user_gender || 'other',
      user_experience: trip.user_experience || 'intermediate',
      user_hobbies: trip.user_hobbies || [],
      user_music: trip.user_music || [],
      user_bio: trip.user_bio || '',
    };

    // Update local state and localStorage immediately
    setTrips(prev => {
      const updated = [localTrip, ...prev];
      saveStoredTrips(updated);
      return updated;
    });

    if (useSupabase) {
      try {
        const { data, error } = await supabase
          .from('trips')
          .insert({
            user_id: trip.userId,
            destination: trip.destination,
            departure_date: trip.departureDate || trip.departure_date || null,
            departure_time: trip.departureTime || trip.departure_time || null,
            duration: trip.duration,
            group_size: trip.groupSize || trip.group_size || '2',
            travel_style: trip.travelStyle || trip.travel_style || 'Mid-range',
            status: 'active'
          })
          .select('*, profiles(*)')
          .single();

        if (!error && data) {
          const p = data.profiles || {};
          const fullData = {
            ...data,
            user_name: p.name || localTrip.user_name,
            user_avatar: p.avatar_url || localTrip.user_avatar,
            user_city: p.city || localTrip.user_city,
            user_age: p.age || localTrip.user_age,
            user_gender: p.gender || localTrip.user_gender,
            user_experience: p.travel_experience || localTrip.user_experience,
            user_hobbies: p.hobbies || localTrip.user_hobbies,
            user_music: p.music || localTrip.user_music,
            user_bio: p.bio || localTrip.user_bio,
          };
          setTrips(prev => {
            const updated = prev.map(t => t.id === localTrip.id ? fullData : t);
            saveStoredTrips(updated);
            return updated;
          });
          return fullData;
        }
      } catch (err) {
        console.warn('Supabase trip insert error:', err);
      }
    }

    return localTrip;
  }, [useSupabase]);

  const updateTrip = useCallback(async (tripId, updates) => {
    const dbUpdates = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.destination) dbUpdates.destination = updates.destination;

    if (useSupabase) {
      try {
        await supabase.from('trips').update(dbUpdates).eq('id', tripId);
      } catch (err) {
        console.warn('Supabase trip update error:', err);
      }
    }

    setTrips(prev => {
      const updated = prev.map(t => t.id === tripId ? { ...t, ...dbUpdates } : t);
      saveStoredTrips(updated);
      return updated;
    });
  }, [useSupabase]);

  const deleteTrip = useCallback(async (tripId) => {
    if (useSupabase) {
      try {
        await supabase.from('trips').delete().eq('id', tripId);
      } catch (err) {
        console.warn('Supabase trip delete error:', err);
      }
    }

    setTrips(prev => {
      const updated = prev.filter(t => t.id !== tripId);
      saveStoredTrips(updated);
      return updated;
    });
  }, [useSupabase]);

  const getUserTrips = useCallback((userId) => {
    if (!userId) return [];
    return trips.filter(t => t.user_id === userId || t.userId === userId);
  }, [trips]);

  // Returns upcoming trips that haven't ended, filtered by optional preferenceDate
  const getUpcomingTrips = useCallback((preferenceDate = null) => {
    return trips.filter(t => {
      if (t.status === 'completed') return false;
      const depDate = t.departure_date || t.departureDate;
      const duration = t.duration || t.trip_duration;
      return matchesPreferenceDate(depDate, duration, preferenceDate);
    });
  }, [trips]);

  return (
    <TripContext.Provider value={{
      trips,
      loading,
      loadTrips,
      addTrip,
      updateTrip,
      deleteTrip,
      getUserTrips,
      getUpcomingTrips
    }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrips() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrips must be used within TripProvider');
  return ctx;
}
