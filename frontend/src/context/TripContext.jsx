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

const getCleanDuration = (dur) => {
  if (!dur) return '7 days';
  if (typeof dur === 'string' && dur.trim().startsWith('[')) return '7 days';
  return dur;
};

export function TripProvider({ children }) {
  const [trips, setTrips] = useState(getStoredTrips);
  const [loading, setLoading] = useState(false);
  const useSupabase = isSupabaseConfigured();
  const syncingRef = useRef(false);

  // Helper to map a `trips` table DB row to unified trip object
  const formatDbTrip = (t) => {
    let meta = {};
    if (t.title && typeof t.title === 'string' && t.title.startsWith('{')) {
      try { meta = JSON.parse(t.title); } catch { /* ignore */ }
    }

    const p = t.profiles || {};
    const dur = getCleanDuration(meta.duration || p.trip_duration || '7 days');

    return {
      ...t,
      id: t.id,
      userId: t.user_id,
      user_id: t.user_id,
      destination: t.destination,
      departure_date: t.departure_date,
      departureDate: t.departure_date,
      return_date: t.return_date || getTripEndDate(t.departure_date, dur),
      duration: dur,
      trip_duration: dur,
      group_size: meta.group_size || p.group_size || '2',
      groupSize: meta.group_size || p.group_size || '2',
      travel_style: meta.travel_style || p.travel_style || 'Mid-range',
      travelStyle: meta.travel_style || p.travel_style || 'Mid-range',
      status: meta.status || 'active',
      created_at: t.created_at || p.created_at || new Date().toISOString(),
      user_name: p.name || 'Traveler',
      user_avatar: p.avatar_url || null,
      user_city: p.city || '',
      user_age: p.age || null,
      user_gender: p.gender || 'other',
      user_hobbies: p.hobbies || [],
      user_music: p.music || [],
    };
  };

  // Helper to unpack trips stored inside a `profiles` row (Dual-Storage for guaranteed cross-user visibility)
  const parseProfileTrips = (p) => {
    if (!p || !p.id) return [];

    // Case 1: JSON array of trips stored in p.trip_duration
    if (p.trip_duration && typeof p.trip_duration === 'string' && p.trip_duration.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(p.trip_duration);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(item => item && item.destination && item.status !== 'completed')
            .map(item => {
              const depDate = item.departure_date || item.departureDate || p.departure_date || null;
              const dur = getCleanDuration(item.duration || item.trip_duration || '7 days');
              return {
                id: item.id || `prof_trip_${p.id}_${item.destination}_${depDate || 'any'}`,
                userId: p.id,
                user_id: p.id,
                destination: item.destination,
                departure_date: depDate,
                departureDate: depDate,
                return_date: item.return_date || getTripEndDate(depDate, dur),
                duration: dur,
                trip_duration: dur,
                group_size: item.group_size || item.groupSize || p.group_size || '2',
                groupSize: item.group_size || item.groupSize || p.group_size || '2',
                travel_style: item.travel_style || item.travelStyle || p.travel_style || 'Mid-range',
                travelStyle: item.travel_style || item.travelStyle || p.travel_style || 'Mid-range',
                status: item.status || 'active',
                created_at: item.created_at || p.created_at || new Date().toISOString(),
                user_name: p.name || item.user_name || 'Traveler',
                user_avatar: p.avatar_url || item.user_avatar || null,
                user_city: p.city || item.user_city || '',
                user_age: p.age || item.user_age || null,
                user_gender: p.gender || item.user_gender || 'other',
                user_hobbies: p.hobbies && p.hobbies.length > 0 ? p.hobbies : (item.user_hobbies || []),
                user_music: p.music && p.music.length > 0 ? p.music : (item.user_music || []),
              };
            });
        }
      } catch {
        // Fallback below if JSON parse fails
      }
    }

    // Case 2: Single trip fields on `profiles` row (from onboarding or profile update)
    if (p.destination && p.trip_duration !== '[]') {
      const dur = getCleanDuration(p.trip_duration || '7 days');
      return [{
        id: `prof_trip_${p.id}_${p.destination}_${p.departure_date || 'any'}`,
        userId: p.id,
        user_id: p.id,
        destination: p.destination,
        departure_date: p.departure_date || null,
        departureDate: p.departure_date || null,
        return_date: getTripEndDate(p.departure_date, dur),
        duration: dur,
        trip_duration: dur,
        group_size: p.group_size || '2',
        groupSize: p.group_size || '2',
        travel_style: p.travel_style || 'Mid-range',
        travelStyle: p.travel_style || 'Mid-range',
        status: 'active',
        created_at: p.created_at || new Date().toISOString(),
        user_name: p.name || 'Traveler',
        user_avatar: p.avatar_url || null,
        user_city: p.city || '',
        user_age: p.age || null,
        user_gender: p.gender || 'other',
        user_hobbies: p.hobbies || [],
        user_music: p.music || [],
      }];
    }

    return [];
  };

  // Sync a user's active trips into their `profiles` row in Supabase (guaranteed public SELECT & own-user UPDATE)
  const syncTripsToProfile = useCallback(async (userId, allTripsList) => {
    if (!useSupabase || !userId) return;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(userId));
    if (!isUUID) return;

    try {
      const userTrips = allTripsList.filter(t => {
        const tUid = t.user_id || t.userId;
        const belongsToUser =
          tUid === userId ||
          !tUid ||
          String(tUid).startsWith('local_') ||
          String(tUid).startsWith('user_');
        return belongsToUser && t.destination && t.status !== 'completed';
      });

      // Deduplicate by destination + departure_date
      const seen = new Set();
      const uniqueTrips = [];
      for (const t of userTrips) {
        const dep = t.departure_date || t.departureDate || '';
        const key = `${String(t.destination).toLowerCase().trim()}_${dep}`;
        if (!seen.has(key)) {
          seen.add(key);
          const dur = getCleanDuration(t.duration || t.trip_duration || '7 days');
          uniqueTrips.push({
            id: t.id,
            user_id: userId,
            destination: t.destination,
            departure_date: dep || null,
            return_date: t.return_date || getTripEndDate(dep, dur),
            duration: dur,
            group_size: t.group_size || t.groupSize || '2',
            travel_style: t.travel_style || t.travelStyle || 'Mid-range',
            status: t.status || 'active',
            created_at: t.created_at || new Date().toISOString(),
          });
        }
      }

      // Sort newest first
      uniqueTrips.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const latest = uniqueTrips[0] || null;
      const rawDate = latest?.departure_date || null;
      const validDate = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(String(rawDate)) ? rawDate : null;

      const profilePayload = {
        destination: latest ? latest.destination : null,
        departure_date: validDate,
        trip_duration: JSON.stringify(uniqueTrips),
        group_size: latest ? (latest.group_size || '2') : '2',
        travel_style: latest ? (latest.travel_style || 'Mid-range') : 'Mid-range',
        profile_complete: true,
      };

      await supabase
        .from('profiles')
        .update(profilePayload)
        .eq('id', userId);
    } catch (err) {
      console.warn('syncTripsToProfile error:', err);
    }
  }, [useSupabase]);

  // Load all trips from Supabase (`profiles` + `trips`) and auto-sync local trips
  const loadTrips = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    let cloudTrips = [];
    let currentAuthUserId = null;

    if (useSupabase) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          currentAuthUserId = authData.user.id;
        }
      } catch { /* ignore */ }

      // 1. Fetch all profiles (publicly readable across all users!)
      let profilesList = [];
      try {
        const { data: profData, error: profErr } = await supabase
          .from('profiles')
          .select('*');
        if (!profErr && profData) {
          profilesList = profData;
        }
      } catch (err) {
        console.warn('Supabase profiles fetch error in loadTrips:', err);
      }

      // 2. Fetch from `trips` table if accessible
      let dbTripsRows = [];
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
          dbTripsRows = data.map(formatDbTrip);
        }
      } catch (err) {
        console.warn('Supabase trips fetch error:', err);
      }

      // 3. Extract trips from all profiles
      const profileExtractedTrips = profilesList.flatMap(parseProfileTrips);

      // 4. Merge dbTripsRows and profileExtractedTrips without duplicates
      const combinedCloud = [...dbTripsRows, ...profileExtractedTrips];
      const seenCloudKeys = new Set();
      for (const ct of combinedCloud) {
        const key = `${ct.user_id}_${String(ct.destination || '').toLowerCase().trim()}_${ct.departure_date || ''}`;
        if (!seenCloudKeys.has(key)) {
          seenCloudKeys.add(key);
          cloudTrips.push(ct);
        }
      }

      // 5. Auto-sync current user's localStorage trips to their Supabase `profiles` row if not yet synced
      if (currentAuthUserId && !syncingRef.current) {
        try {
          syncingRef.current = true;
          const localTrips = getStoredTrips();
          const myLocalTrips = localTrips.filter(lt => {
            const uid = lt.user_id || lt.userId;
            return (uid === currentAuthUserId || !uid || String(uid).startsWith('local_') || String(uid).startsWith('user_')) && lt.destination;
          });

          const myCloudKeys = new Set(
            cloudTrips
              .filter(ct => ct.user_id === currentAuthUserId)
              .map(ct => `${String(ct.destination || '').toLowerCase().trim()}_${ct.departure_date || ''}`)
          );

          const hasUnsyncedLocal = myLocalTrips.some(lt => {
            const key = `${String(lt.destination || '').toLowerCase().trim()}_${lt.departure_date || lt.departureDate || ''}`;
            return !myCloudKeys.has(key);
          });

          if (hasUnsyncedLocal) {
            const allMyTrips = [
              ...myLocalTrips.map(lt => ({ ...lt, user_id: currentAuthUserId, userId: currentAuthUserId })),
              ...cloudTrips.filter(ct => ct.user_id === currentAuthUserId)
            ];
            await syncTripsToProfile(currentAuthUserId, allMyTrips);

            // Also ensure local trips are merged into cloudTrips immediately for current session
            for (const lt of myLocalTrips) {
              const dep = lt.departure_date || lt.departureDate || '';
              const key = `${currentAuthUserId}_${String(lt.destination || '').toLowerCase().trim()}_${dep}`;
              if (!seenCloudKeys.has(key)) {
                seenCloudKeys.add(key);
                cloudTrips.push({
                  ...lt,
                  user_id: currentAuthUserId,
                  userId: currentAuthUserId,
                });
              }
            }
          }
        } catch (syncErr) {
          console.warn('Auto-sync to profile error:', syncErr);
        } finally {
          syncingRef.current = false;
        }
      }
    }

    // 6. Merge cloud trips with current user's local trips
    const localTrips = getStoredTrips();
    const cloudKeys = new Set(
      cloudTrips.map(ct => `${ct.user_id}_${String(ct.destination || '').toLowerCase().trim()}_${ct.departure_date || ''}`)
    );

    const ownExtraLocal = localTrips
      .filter(lt => {
        const uid = lt.user_id || lt.userId;
        const isOwn = !currentAuthUserId || uid === currentAuthUserId || !uid || String(uid).startsWith('local_') || String(uid).startsWith('user_');
        if (!isOwn) return false; // Never keep stale deleted trips from other users
        const effectiveUid = currentAuthUserId || uid;
        const dep = lt.departure_date || lt.departureDate || '';
        const key = `${effectiveUid}_${String(lt.destination || '').toLowerCase().trim()}_${dep}`;
        return !cloudKeys.has(key) && lt.destination;
      })
      .map(lt => currentAuthUserId ? { ...lt, user_id: currentAuthUserId, userId: currentAuthUserId } : lt);

    const merged = [...cloudTrips, ...ownExtraLocal];

    // Sort all trips by created_at descending (most recently posted first!)
    merged.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });

    setTrips(merged);
    saveStoredTrips(merged);
    if (!silent) setLoading(false);
  }, [useSupabase, syncTripsToProfile]);

  useEffect(() => {
    loadTrips(false);

    // Refresh when window regains focus
    const handleFocus = () => loadTrips(true);
    window.addEventListener('focus', handleFocus);

    // Poll every 8 seconds so new trips posted by any user appear live at the top of Find Buddies
    const pollInterval = setInterval(() => {
      loadTrips(true);
    }, 8000);

    let channel = null;
    if (useSupabase) {
      try {
        channel = supabase
          .channel('trips-and-profiles-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
            loadTrips(true);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
            loadTrips(true);
          })
          .subscribe();
      } catch (err) {
        console.warn('Realtime channel subscription error:', err);
      }
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(pollInterval);
      if (channel && useSupabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadTrips, useSupabase]);

  // Persist locally whenever trips change (even when empty)
  useEffect(() => {
    saveStoredTrips(trips);
  }, [trips]);

  const addTrip = useCallback(async (trip) => {
    const departureDate = trip.departureDate || trip.departure_date || null;
    const duration = getCleanDuration(trip.duration || '7 days');
    const returnDate = getTripEndDate(departureDate, duration);

    const meta = {
      duration: duration,
      group_size: trip.groupSize || trip.group_size || '2',
      travel_style: trip.travelStyle || trip.travel_style || 'Mid-range',
      status: 'active'
    };

    const targetUserId = trip.userId || trip.user_id || 'user_' + Date.now();

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

    // 1. Update local state and localStorage IMMEDIATELY (0ms delay!)
    let nextTripsSnapshot = [];
    setTrips(prev => {
      const updated = [localTrip, ...prev];
      nextTripsSnapshot = updated;
      saveStoredTrips(updated);
      return updated;
    });

    // 2. Sync to Supabase (`profiles` + `trips`) in the background
    if (useSupabase) {
      (async () => {
        try {
          let authId = targetUserId;
          const { data: authData } = await supabase.auth.getUser();
          if (authData?.user) {
            authId = authData.user.id;
          }

          // Stamp authId onto localTrip if needed
          const syncedList = nextTripsSnapshot.map(t =>
            t.id === localTrip.id ? { ...t, user_id: authId, userId: authId } : t
          );

          // Primary Cross-User Sync: Save to user's `profiles` row
          await syncTripsToProfile(authId, syncedList);

          // Secondary Sync: Attempt insert into `trips` table
          const dbPayload = {
            user_id: authId,
            destination: trip.destination,
            title: JSON.stringify(meta),
            departure_date: departureDate && /^\d{4}-\d{2}-\d{2}$/.test(String(departureDate)) ? departureDate : null,
            return_date: returnDate && /^\d{4}-\d{2}-\d{2}$/.test(String(returnDate)) ? returnDate : null,
          };

          const { data, error } = await supabase
            .from('trips')
            .insert(dbPayload)
            .select();

          if (!error && data && data.length > 0) {
            const inserted = data[0];
            setTrips(prev => {
              const updated = prev.map(t =>
                t.id === localTrip.id
                  ? { ...localTrip, id: inserted.id, user_id: authId, userId: authId, created_at: inserted.created_at || localTrip.created_at }
                  : t
              );
              saveStoredTrips(updated);
              return updated;
            });
          }
        } catch (err) {
          console.warn('Background Supabase trip sync error:', err);
        }
      })();
    }

    return localTrip;
  }, [useSupabase, syncTripsToProfile]);

  const updateTrip = useCallback(async (tripId, updates) => {
    let nextTripsSnapshot = [];
    setTrips(prev => {
      const updated = prev.map(t => t.id === tripId ? { ...t, ...updates } : t);
      nextTripsSnapshot = updated;
      saveStoredTrips(updated);
      return updated;
    });

    if (useSupabase) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          await syncTripsToProfile(authData.user.id, nextTripsSnapshot);
        }
      } catch (err) {
        console.warn('Supabase trip update error:', err);
      }
    }
  }, [useSupabase, syncTripsToProfile]);

  const deleteTrip = useCallback(async (tripId) => {
    if (!tripId) return;

    const tripToDelete = trips.find(t => t.id === tripId);
    const dest = tripToDelete?.destination;
    const uId = tripToDelete?.user_id || tripToDelete?.userId;

    // 1. Immediately remove from local state and localStorage
    let remainingTrips = [];
    setTrips(prev => {
      const updated = prev.filter(t => {
        if (t.id === tripId) return false;
        if (dest && (t.user_id === uId || t.userId === uId) && t.destination === dest) {
          return false;
        }
        return true;
      });
      remainingTrips = updated;
      saveStoredTrips(updated);
      return updated;
    });

    // 2. Remove from Supabase (`profiles` + `trips`)
    if (useSupabase) {
      try {
        let authId = uId;
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          authId = authData.user.id;
        }

        if (authId) {
          await syncTripsToProfile(authId, remainingTrips);
        }

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(tripId));
        if (isUUID) {
          await supabase.from('trips').delete().eq('id', tripId);
        }

        if (authId && dest) {
          const isUserUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(authId));
          if (isUserUUID) {
            await supabase
              .from('trips')
              .delete()
              .eq('user_id', authId)
              .eq('destination', dest);
          }
        }
      } catch (err) {
        console.warn('Supabase trip delete error:', err);
      }
    }
  }, [useSupabase, trips, syncTripsToProfile]);

  const getUserTrips = useCallback((userId) => {
    if (!userId) return trips;
    return trips.filter(t =>
      t.user_id === userId ||
      t.userId === userId ||
      !t.user_id ||
      String(t.user_id).startsWith('local_') ||
      String(t.user_id).startsWith('user_')
    );
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
