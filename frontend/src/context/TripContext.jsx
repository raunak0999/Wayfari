import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  const syncingRef = useRef(false);

  // Helper to map DB row to unified trip object
  const formatDbTrip = (t) => {
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
  };

  // Load all trips from Supabase and auto-sync any local trips
  const loadTrips = useCallback(async () => {
    setLoading(true);
    let dbTrips = [];

    if (useSupabase) {
      try {
        let { data, error } = await supabase
          .from('trips')
          .select('*, profiles(*)')
          .order('created_at', { ascending: false });

        if (error || !data) {
          const fallback = await supabase
            .from('trips')
            .select('*')
            .order('created_at', { ascending: false });
          data = fallback.data;
          error = fallback.error;
        }

        if (!error && data) {
          dbTrips = data.map(formatDbTrip);
        }
      } catch (err) {
        console.warn('Supabase loadTrips error:', err);
      }

      // Auto-sync: Check if current logged in user has local trips not yet in Supabase
      if (!syncingRef.current) {
        try {
          syncingRef.current = true;
          const { data: { user: authUser } } = await supabase.auth.getUser();

          if (authUser) {
            const localTrips = getStoredTrips();
            const existingDbDests = new Set(
              dbTrips.filter(t => t.user_id === authUser.id).map(t => `${t.destination}_${t.departure_date}`)
            );

            const unsyncedTrips = localTrips.filter(lt => {
              const matchesUser = lt.user_id === authUser.id || lt.userId === authUser.id || !lt.user_id;
              const notInCloud = !existingDbDests.has(`${lt.destination}_${lt.departure_date || lt.departureDate}`);
              return matchesUser && notInCloud && lt.destination;
            });

            if (unsyncedTrips.length > 0) {
              console.log(`Auto-syncing ${unsyncedTrips.length} local trip(s) to Supabase cloud for user:`, authUser.email);
              for (const unsynced of unsyncedTrips) {
                const depDate = unsynced.departureDate || unsynced.departure_date || null;
                const dur = unsynced.duration || unsynced.trip_duration || '7 days';
                const retDate = unsynced.return_date || getTripEndDate(depDate, dur);

                const meta = {
                  duration: dur,
                  group_size: unsynced.groupSize || unsynced.group_size || '2',
                  travel_style: unsynced.travelStyle || unsynced.travel_style || 'Mid-range',
                  status: 'active'
                };

                await supabase.from('trips').insert({
                  user_id: authUser.id,
                  destination: unsynced.destination,
                  title: JSON.stringify(meta),
                  departure_date: depDate,
                  return_date: retDate,
                });
              }

              // Re-fetch after syncing so state has the cloud trips
              const refetch = await supabase
                .from('trips')
                .select('*, profiles(*)')
                .order('created_at', { ascending: false });

              if (refetch.data && !refetch.error) {
                dbTrips = refetch.data.map(formatDbTrip);
              }
            }
          }
        } catch (syncErr) {
          console.warn('Auto-sync error:', syncErr);
        } finally {
          syncingRef.current = false;
        }
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
          .channel('trips-realtime-feed')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
            console.log('Realtime trip change detected — reloading trips');
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

  // Persist locally whenever trips change (even when empty)
  useEffect(() => {
    saveStoredTrips(trips);
  }, [trips]);

  const addTrip = useCallback(async (trip) => {
    const departureDate = trip.departureDate || trip.departure_date || null;
    const duration = trip.duration || '7 days';
    const returnDate = getTripEndDate(departureDate, duration);

    const meta = {
      duration: duration,
      group_size: trip.groupSize || trip.group_size || '2',
      travel_style: trip.travelStyle || trip.travel_style || 'Mid-range',
      status: 'active'
    };

    let targetUserId = trip.userId;
    if (useSupabase) {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          targetUserId = authUser.id;
        }
      } catch { /* ignore */ }
    }

    const localTrip = {
      ...trip,
      id: 'trip_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      user_id: targetUserId,
      userId: targetUserId,
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

    // Update local state immediately
    setTrips(prev => {
      const updated = [localTrip, ...prev];
      saveStoredTrips(updated);
      return updated;
    });

    if (useSupabase && targetUserId) {
      try {
        const dbPayload = {
          user_id: targetUserId,
          destination: trip.destination,
          title: JSON.stringify(meta),
          departure_date: departureDate,
          return_date: returnDate,
        };

        const { data, error } = await supabase
          .from('trips')
          .insert(dbPayload)
          .select();

        if (!error && data && data.length > 0) {
          const inserted = data[0];
          const fullData = {
            ...localTrip,
            id: inserted.id,
            created_at: inserted.created_at,
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
      updatedMeta = {
        duration: tripToUpdate.duration || '7 days',
        group_size: tripToUpdate.group_size || '2',
        travel_style: tripToUpdate.travel_style || 'Mid-range',
        status: updates.status || tripToUpdate.status || 'active',
      };
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
    if (!tripId) return;

    // Find the trip object before removing
    const tripToDelete = trips.find(t => t.id === tripId);
    const dest = tripToDelete?.destination;
    const uId = tripToDelete?.user_id || tripToDelete?.userId;

    // 1. Immediately remove from local state and localStorage
    setTrips(prev => {
      const updated = prev.filter(t => {
        if (t.id === tripId) return false;
        // Also remove if matching destination and user
        if (dest && (t.user_id === uId || t.userId === uId) && t.destination === dest) {
          return false;
        }
        return true;
      });
      saveStoredTrips(updated);
      return updated;
    });

    // 2. Remove from Supabase cloud
    if (useSupabase) {
      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(tripId));
        if (isUUID) {
          await supabase.from('trips').delete().eq('id', tripId);
        }

        // Also delete by user_id and destination to clean up any cloud duplicate
        if (uId && dest) {
          const isUserUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(uId));
          if (isUserUUID) {
            await supabase
              .from('trips')
              .delete()
              .eq('user_id', uId)
              .eq('destination', dest);
          }
        }
      } catch (err) {
        console.warn('Supabase trip delete error:', err);
      }
    }
  }, [useSupabase, trips]);

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
