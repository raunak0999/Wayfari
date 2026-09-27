import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getTripEndDate } from '../utils/tripUtils';

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
  const [loading, setLoading] = useState(false);
  const useSupabase = isSupabaseConfigured();

  // Load all trips from Supabase and merge with local storage
  const loadTrips = useCallback(async () => {
    setLoading(true);
    let dbTrips = [];

    if (useSupabase) {
      try {
        // Try join query with profiles first
        let { data, error } = await supabase
          .from('trips')
          .select('*, profiles(*)')
          .order('created_at', { ascending: false });

        // Fallback to simple select if join fails
        if (error || !data) {
          const fallback = await supabase
            .from('trips')
            .select('*')
            .order('created_at', { ascending: false });
          data = fallback.data;
          error = fallback.error;
        }

        if (!error && data) {
          dbTrips = data.map(t => {
            // Parse metadata from title if JSON
            let meta = {};
            if (t.title && typeof t.title === 'string' && t.title.startsWith('{')) {
              try { meta = JSON.parse(t.title); } catch { /* ignore */ }
            }

            const p = t.profiles || {};
            return {
              ...t,
              id: t.id,
              userId: t.user_id,
              user_id: t.user_id,
              destination: t.destination,
              departure_date: t.departure_date,
              departureDate: t.departure_date,
              return_date: t.return_date,
              duration: meta.duration || p.trip_duration || '7 days',
              trip_duration: meta.duration || p.trip_duration || '7 days',
              group_size: meta.group_size || p.group_size || '2',
              groupSize: meta.group_size || p.group_size || '2',
              travel_style: meta.travel_style || p.travel_style || 'Mid-range',
              travelStyle: meta.travel_style || p.travel_style || 'Mid-range',
              status: meta.status || 'active',
              user_name: p.name || 'Traveler',
              user_avatar: p.avatar_url || null,
              user_city: p.city || '',
              user_age: p.age || null,
              user_gender: p.gender || 'other',
              user_hobbies: p.hobbies || [],
              user_music: p.music || [],
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
    const departureDate = trip.departureDate || trip.departure_date || null;
    const duration = trip.duration || '7 days';
    const returnDate = getTripEndDate(departureDate, duration);

    // Meta object stored as JSON in title
    const meta = {
      duration: duration,
      group_size: trip.groupSize || trip.group_size || '2',
      travel_style: trip.travelStyle || trip.travel_style || 'Mid-range',
      status: 'active'
    };

    const localTrip = {
      ...trip,
      id: 'trip_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      user_id: trip.userId,
      userId: trip.userId,
      destination: trip.destination,
      departure_date: departureDate,
      departureDate: departureDate,
      return_date: returnDate,
      duration: duration,
      trip_duration: duration,
      group_size: meta.group_size,
      groupSize: meta.group_size,
      travel_style: meta.travel_style,
      travelStyle: meta.travel_style,
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
        // Valid Supabase columns: id, user_id, destination, title, departure_date, return_date
        const dbPayload = {
          user_id: trip.userId,
          destination: trip.destination,
          title: JSON.stringify(meta),
          departure_date: departureDate,
          return_date: returnDate,
        };

        const { data, error } = await supabase
          .from('trips')
          .insert(dbPayload)
          .select()
          .single();

        if (!error && data) {
          const fullData = {
            ...localTrip,
            id: data.id,
            created_at: data.created_at,
          };
          setTrips(prev => {
            const updated = prev.map(t => t.id === localTrip.id ? fullData : t);
            saveStoredTrips(updated);
            return updated;
          });
          return fullData;
        } else if (error) {
          console.warn('Supabase trip insert error details:', error);
        }
      } catch (err) {
        console.warn('Supabase trip insert error:', err);
      }
    }

    return localTrip;
  }, [useSupabase]);

  const updateTrip = useCallback(async (tripId, updates) => {
    const tripToUpdate = trips.find(t => t.id === tripId);
    let updatedMeta = null;

    if (tripToUpdate) {
      const currentMeta = {
        duration: tripToUpdate.duration || '7 days',
        group_size: tripToUpdate.group_size || '2',
        travel_style: tripToUpdate.travel_style || 'Mid-range',
        status: updates.status || tripToUpdate.status || 'active',
      };
      updatedMeta = currentMeta;
    }

    if (useSupabase && updatedMeta) {
      try {
        const dbUpdates = {};
        if (updates.destination) dbUpdates.destination = updates.destination;
        dbUpdates.title = JSON.stringify(updatedMeta);

        await supabase.from('trips').update(dbUpdates).eq('id', tripId);
      } catch (err) {
        console.warn('Supabase trip update error:', err);
      }
    }

    setTrips(prev => {
      const updated = prev.map(t => t.id === tripId ? { ...t, ...updates } : t);
      saveStoredTrips(updated);
      return updated;
    });
  }, [useSupabase, trips]);

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

  return (
    <TripContext.Provider value={{
      trips,
      loading,
      loadTrips,
      addTrip,
      updateTrip,
      deleteTrip,
      getUserTrips,
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
