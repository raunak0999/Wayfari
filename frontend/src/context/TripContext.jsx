import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

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
  const useSupabase = isSupabaseConfigured();

  // Load all trips and merge with local storage
  const loadTrips = useCallback(async () => {
    let dbTrips = [];
    if (useSupabase) {
      try {
        const { data, error } = await supabase
          .from('trips')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          dbTrips = data;
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
  }, [useSupabase]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  // Persist locally whenever trips change
  useEffect(() => {
    if (trips.length > 0) {
      saveStoredTrips(trips);
    }
  }, [trips]);

  const addTrip = useCallback(async (trip) => {
    const localTrip = {
      ...trip,
      id: 'trip_' + Date.now(),
      user_id: trip.userId,
      destination: trip.destination,
      departure_date: trip.departureDate || null,
      departure_time: trip.departureTime || null,
      duration: trip.duration,
      group_size: trip.groupSize,
      travel_style: trip.travelStyle,
      status: 'active',
      created_at: new Date().toISOString(),
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
            departure_date: trip.departureDate || null,
            departure_time: trip.departureTime || null,
            duration: trip.duration,
            group_size: trip.groupSize,
            travel_style: trip.travelStyle,
            status: 'active'
          })
          .select()
          .single();

        if (!error && data) {
          setTrips(prev => {
            const updated = prev.map(t => t.id === localTrip.id ? data : t);
            saveStoredTrips(updated);
            return updated;
          });
          return data;
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
    return trips.filter(t => t.user_id === userId || t.userId === userId);
  }, [trips]);

  return (
    <TripContext.Provider value={{ trips, addTrip, updateTrip, deleteTrip, getUserTrips }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrips() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrips must be used within TripProvider');
  return ctx;
}
