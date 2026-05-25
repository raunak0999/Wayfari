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
  const [trips, setTrips] = useState([]);
  const useSupabase = isSupabaseConfigured();

  // Load all trips
  const loadTrips = useCallback(async () => {
    if (useSupabase) {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && !error) {
        setTrips(data);
        return;
      }
    }
    // Local fallback
    setTrips(getStoredTrips());
  }, [useSupabase]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  // Persist locally when trips change
  useEffect(() => {
    if (!useSupabase && trips.length > 0) {
      saveStoredTrips(trips);
    }
  }, [trips, useSupabase]);

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

    if (useSupabase) {
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
        setTrips(prev => [data, ...prev]);
        return data;
      }
    }

    // Local fallback
    setTrips(prev => {
      const updated = [localTrip, ...prev];
      saveStoredTrips(updated);
      return updated;
    });
    return localTrip;
  }, [useSupabase]);

  const updateTrip = useCallback(async (tripId, updates) => {
    const dbUpdates = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.destination) dbUpdates.destination = updates.destination;

    if (useSupabase) {
      await supabase.from('trips').update(dbUpdates).eq('id', tripId);
    }

    setTrips(prev => {
      const updated = prev.map(t => t.id === tripId ? { ...t, ...dbUpdates } : t);
      if (!useSupabase) saveStoredTrips(updated);
      return updated;
    });
  }, [useSupabase]);

  const deleteTrip = useCallback(async (tripId) => {
    if (useSupabase) {
      await supabase.from('trips').delete().eq('id', tripId);
    }

    setTrips(prev => {
      const updated = prev.filter(t => t.id !== tripId);
      if (!useSupabase) saveStoredTrips(updated);
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
