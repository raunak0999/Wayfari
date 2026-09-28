import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getTripEndDate } from '../utils/tripUtils';

const TripContext = createContext(null);
const TRIPS_KEY = 'wayfari_trips';
const PEER_TRIPS_KEY = 'wayfari_peer_trips';
const DELETED_TRIPS_KEY = 'wayfari_deleted_trips';
const PROFILES_KEY = 'wayfari_profiles';
const TRIP_SYNC_PREFIX = '__WAYFARI_TRIP_SYNC__:';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUUID = (val) => Boolean(val && UUID_REGEX.test(String(val)));

const getStoredTrips = () => {
  try { return JSON.parse(localStorage.getItem(TRIPS_KEY)) || []; }
  catch { return []; }
};

const saveStoredTrips = (trips) => {
  try { localStorage.setItem(TRIPS_KEY, JSON.stringify(trips)); }
  catch { /* ignore quota errors */ }
};

const getStoredPeerTrips = () => {
  try { return JSON.parse(localStorage.getItem(PEER_TRIPS_KEY)) || {}; }
  catch { return {}; }
};

const saveStoredPeerTrips = (peerMap) => {
  try { localStorage.setItem(PEER_TRIPS_KEY, JSON.stringify(peerMap)); }
  catch { /* ignore */ }
};

const getStoredDeletedTrips = () => {
  try { return new Set(JSON.parse(localStorage.getItem(DELETED_TRIPS_KEY)) || []); }
  catch { return new Set(); }
};

const saveStoredDeletedTrips = (deletedSet) => {
  try { localStorage.setItem(DELETED_TRIPS_KEY, JSON.stringify(Array.from(deletedSet))); }
  catch { /* ignore */ }
};

const getStoredLocalProfiles = () => {
  try { return JSON.parse(localStorage.getItem(PROFILES_KEY)) || {}; }
  catch { return {}; }
};

const getCleanDuration = (dur) => {
  if (!dur) return '7 days';
  if (typeof dur === 'string') {
    const trimmed = dur.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed[0]?.duration || '7 days';
        if (parsed && typeof parsed === 'object') return parsed.duration || '7 days';
      } catch {
        return '7 days';
      }
    }
  }
  return dur;
};

const makeTripDedupKey = (userId, destination, depDate) => {
  const cleanDest = String(destination || '').toLowerCase().trim();
  const cleanDep = depDate ? String(depDate).trim().slice(0, 10) : '';
  return `${userId || 'anon'}_${cleanDest}_${cleanDep}`;
};

const makeDestDateKey = (destination, depDate) => {
  const cleanDest = String(destination || '').toLowerCase().trim();
  const cleanDep = depDate ? String(depDate).trim().slice(0, 10) : '';
  return `${cleanDest}_${cleanDep}`;
};

export function TripProvider({ children }) {
  const [trips, setTrips] = useState(getStoredTrips);
  const [loading, setLoading] = useState(false);
  const useSupabase = isSupabaseConfigured();

  const tripsRef = useRef(trips);
  const peerTripsRef = useRef(getStoredPeerTrips());
  const deletedTripsRef = useRef(getStoredDeletedTrips());
  const syncingRef = useRef(false);
  const lastSyncedSignatureRef = useRef('');
  const realtimeChannelRef = useRef(null);
  const currentUserIdRef = useRef(null);

  const setTripsAndPersist = useCallback((nextTrips) => {
    tripsRef.current = nextTrips;
    saveStoredTrips(nextTrips);
    setTrips(nextTrips);
  }, []);

  // Enrich a trip with the best available traveler metadata from trip, local profiles, auth metadata, or DB profile
  const enrichTripWithProfile = useCallback((t, ownerId, profilesById = {}, authUser = null) => {
    const uid = ownerId || t.user_id || t.userId;
    const dbProf = (uid && profilesById[uid]) || t.profiles || {};
    const localProfiles = getStoredLocalProfiles();
    const localProf = (uid && localProfiles[uid]) || {};
    const isAuthOwner = Boolean(authUser && uid && authUser.id === uid);
    const metaProf = (isAuthOwner && authUser.user_metadata?.wayfari_profile) || {};

    const depDateRaw = t.departure_date || t.departureDate || null;
    const depDate = depDateRaw && /^\d{4}-\d{2}-\d{2}/.test(String(depDateRaw))
      ? String(depDateRaw).slice(0, 10)
      : null;
    const dur = getCleanDuration(t.duration || t.trip_duration || '7 days');

    const resolvedName =
      (t.user_name && t.user_name !== 'Traveler' ? t.user_name : null) ||
      localProf.name ||
      metaProf.name ||
      dbProf.name ||
      (isAuthOwner ? (authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0]) : null) ||
      t.user_name ||
      'Traveler';

    const resolvedGender =
      (t.user_gender && t.user_gender !== 'other' ? t.user_gender : null) ||
      (localProf.gender && localProf.gender !== 'other' ? localProf.gender : null) ||
      (metaProf.gender && metaProf.gender !== 'other' ? metaProf.gender : null) ||
      (isAuthOwner ? authUser.user_metadata?.gender : null) ||
      dbProf.gender ||
      t.user_gender ||
      'other';

    const resolvedHobbies =
      (Array.isArray(t.user_hobbies) && t.user_hobbies.length > 0 ? t.user_hobbies : null) ||
      (Array.isArray(localProf.hobbies) && localProf.hobbies.length > 0 ? localProf.hobbies : null) ||
      (Array.isArray(metaProf.hobbies) && metaProf.hobbies.length > 0 ? metaProf.hobbies : null) ||
      (Array.isArray(dbProf.hobbies) && dbProf.hobbies.length > 0 ? dbProf.hobbies : []);

    const resolvedMusic =
      (Array.isArray(t.user_music) && t.user_music.length > 0 ? t.user_music : null) ||
      (Array.isArray(localProf.music) && localProf.music.length > 0 ? localProf.music : null) ||
      (Array.isArray(metaProf.music) && metaProf.music.length > 0 ? metaProf.music : null) ||
      (Array.isArray(dbProf.music) && dbProf.music.length > 0 ? dbProf.music : []);

    return {
      ...t,
      id: t.id || `trip_${uid || 'anon'}_${String(t.destination || '').toLowerCase().trim()}_${depDate || 'any'}`,
      userId: uid,
      user_id: uid,
      destination: t.destination,
      departure_date: depDate,
      departureDate: depDate,
      return_date: t.return_date || getTripEndDate(depDate, dur),
      duration: dur,
      trip_duration: dur,
      group_size: t.group_size || t.groupSize || localProf.group_size || metaProf.group_size || dbProf.group_size || '2',
      groupSize: t.group_size || t.groupSize || localProf.group_size || metaProf.group_size || dbProf.group_size || '2',
      travel_style: t.travel_style || t.travelStyle || localProf.travel_style || metaProf.travel_style || dbProf.travel_style || 'Mid-range',
      travelStyle: t.travel_style || t.travelStyle || localProf.travel_style || metaProf.travel_style || dbProf.travel_style || 'Mid-range',
      status: t.status || 'active',
      created_at: t.created_at || dbProf.created_at || new Date().toISOString(),
      user_name: resolvedName,
      user_avatar: t.user_avatar || localProf.avatar_url || metaProf.avatar_url || dbProf.avatar_url || null,
      user_city: t.user_city || localProf.city || metaProf.city || dbProf.city || '',
      user_age: t.user_age || localProf.age || metaProf.age || dbProf.age || null,
      user_gender: resolvedGender,
      user_experience: t.user_experience || localProf.travel_experience || metaProf.travel_experience || dbProf.travel_experience || 'intermediate',
      user_hobbies: resolvedHobbies,
      user_music: resolvedMusic,
      user_bio: t.user_bio || localProf.bio || metaProf.bio || dbProf.bio || '',
    };
  }, []);

  // Helper to map a `trips` table DB row to unified trip object
  const formatDbTrip = useCallback((t, profilesById = {}, authUser = null) => {
    let meta = {};
    if (t.title && typeof t.title === 'string' && t.title.trim().startsWith('{')) {
      try { meta = JSON.parse(t.title); } catch { /* ignore */ }
    } else if (t.duration && typeof t.duration === 'string' && t.duration.trim().startsWith('{')) {
      try { meta = JSON.parse(t.duration); } catch { /* ignore */ }
    }

    const p = t.profiles || profilesById[t.user_id] || {};
    const dur = getCleanDuration(meta.duration || t.duration || p.trip_duration || '7 days');

    const baseTrip = {
      ...t,
      id: t.id,
      userId: t.user_id,
      user_id: t.user_id,
      destination: t.destination,
      departure_date: t.departure_date,
      departureDate: t.departure_date,
      return_date: t.return_date || meta.return_date || getTripEndDate(t.departure_date, dur),
      duration: dur,
      trip_duration: dur,
      group_size: meta.group_size || t.group_size || p.group_size || '2',
      groupSize: meta.group_size || t.group_size || p.group_size || '2',
      travel_style: meta.travel_style || t.travel_style || p.travel_style || 'Mid-range',
      travelStyle: meta.travel_style || t.travel_style || p.travel_style || 'Mid-range',
      status: meta.status || t.status || 'active',
      created_at: t.created_at || meta.created_at || p.created_at || new Date().toISOString(),
      user_name: meta.user_name || p.name || 'Traveler',
      user_avatar: meta.user_avatar || p.avatar_url || null,
      user_city: meta.user_city || p.city || '',
      user_age: meta.user_age || p.age || null,
      user_gender: meta.user_gender || p.gender || 'other',
      user_experience: meta.user_experience || p.travel_experience || 'intermediate',
      user_hobbies: meta.user_hobbies || p.hobbies || [],
      user_music: meta.user_music || p.music || [],
      user_bio: meta.user_bio || p.bio || '',
    };

    return enrichTripWithProfile(baseTrip, t.user_id, profilesById, authUser);
  }, [enrichTripWithProfile]);

  // Helper to unpack trips stored inside a `profiles` row
  const parseProfileTrips = useCallback((p, profilesById = {}, authUser = null) => {
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
              return enrichTripWithProfile({
                ...item,
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
                user_gender: (p.gender && p.gender !== 'other' ? p.gender : null) || item.user_gender || p.gender || 'other',
                user_experience: p.travel_experience || item.user_experience || 'intermediate',
                user_hobbies: p.hobbies && p.hobbies.length > 0 ? p.hobbies : (item.user_hobbies || []),
                user_music: p.music && p.music.length > 0 ? p.music : (item.user_music || []),
                user_bio: p.bio || item.user_bio || '',
              }, p.id, profilesById, authUser);
            });
        }
      } catch {
        // Fallback below if JSON parse fails
      }
    }

    // Case 2: Single trip fields on `profiles` row (from onboarding or profile update)
    if (p.destination && p.trip_duration !== '[]') {
      const dur = getCleanDuration(p.trip_duration || '7 days');
      return [enrichTripWithProfile({
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
        user_experience: p.travel_experience || 'intermediate',
        user_hobbies: p.hobbies || [],
        user_music: p.music || [],
        user_bio: p.bio || '',
      }, p.id, profilesById, authUser)];
    }

    return [];
  }, [enrichTripWithProfile]);

  // Multi-schema fallback insert into `public.trips`
  const insertTripIntoDb = useCallback(async (authId, tripObj, fullMeta) => {
    if (!useSupabase || !isUUID(authId)) return null;
    const validDep = tripObj.departure_date && /^\d{4}-\d{2}-\d{2}$/.test(String(tripObj.departure_date))
      ? tripObj.departure_date
      : null;
    const validRet = tripObj.return_date && /^\d{4}-\d{2}-\d{2}$/.test(String(tripObj.return_date))
      ? tripObj.return_date
      : null;

    // Candidate payloads covering both `title/return_date` schema and `supabase/schema.sql` columns
    const candidatePayloads = [
      {
        user_id: authId,
        destination: tripObj.destination,
        title: JSON.stringify(fullMeta),
        departure_date: validDep,
        return_date: validRet,
      },
      {
        user_id: authId,
        destination: tripObj.destination,
        departure_date: validDep,
        duration: JSON.stringify(fullMeta),
        group_size: fullMeta.group_size || '2',
        travel_style: fullMeta.travel_style || 'Mid-range',
        status: 'active',
      },
      {
        user_id: authId,
        destination: tripObj.destination,
        departure_date: validDep,
        duration: fullMeta.duration || '7 days',
        group_size: fullMeta.group_size || '2',
        travel_style: fullMeta.travel_style || 'Mid-range',
        status: 'active',
      },
      {
        user_id: authId,
        destination: tripObj.destination,
        departure_date: validDep,
      }
    ];

    for (const payload of candidatePayloads) {
      try {
        const { data, error } = await supabase
          .from('trips')
          .insert(payload)
          .select();

        if (!error && data && data.length > 0) {
          return data[0];
        }
        // If error is RLS violation (42501), other column schemas won't change RLS, so break
        if (error && (error.code === '42501' || String(error.message || '').toLowerCase().includes('row-level security'))) {
          break;
        }
      } catch {
        // Continue to next schema candidate
      }
    }
    return null;
  }, [useSupabase]);

  // Relay trips via `public.conversations` + `public.messages` (works across users even if `profiles` UPDATE and `trips` SELECT are blocked by RLS!)
  const relayTripsToPeersViaMessages = useCallback(async (userId, compactTrips) => {
    if (!useSupabase || !isUUID(userId)) return;
    try {
      const { data: allProfs } = await supabase
        .from('profiles')
        .select('id')
        .limit(30);

      if (!allProfs || allProfs.length === 0) return;
      const peerIds = allProfs
        .map(p => p.id)
        .filter(pid => isUUID(pid) && pid !== userId);

      const syncText = TRIP_SYNC_PREFIX + JSON.stringify({
        user_id: userId,
        trips: compactTrips,
        updated_at: new Date().toISOString(),
      });

      await Promise.all(peerIds.map(async (peerId) => {
        try {
          const [p1, p2] = [userId, peerId].sort();
          let convoId = null;

          const { data: existingConvo } = await supabase
            .from('conversations')
            .select('id')
            .or(`and(participant_1.eq.${p1},participant_2.eq.${p2}),and(participant_1.eq.${p2},participant_2.eq.${p1})`)
            .maybeSingle();

          if (existingConvo?.id) {
            convoId = existingConvo.id;
          } else {
            const { data: createdConvo } = await supabase
              .from('conversations')
              .insert({ participant_1: p1, participant_2: p2, last_message: '' })
              .select('id')
              .maybeSingle();
            convoId = createdConvo?.id || null;
          }

          if (!convoId) return;

          const { data: existingSyncMsgs } = await supabase
            .from('messages')
            .select('id')
            .eq('conversation_id', convoId)
            .eq('sender_id', userId)
            .like('text', `${TRIP_SYNC_PREFIX}%`)
            .order('created_at', { ascending: false });

          if (existingSyncMsgs && existingSyncMsgs.length > 0) {
            const latestMsgId = existingSyncMsgs[0].id;
            const { data: updatedMsg, error: updErr } = await supabase
              .from('messages')
              .update({ text: syncText })
              .eq('id', latestMsgId)
              .select('id');

            if (updErr || !updatedMsg || updatedMsg.length === 0) {
              await supabase.from('messages').insert({
                conversation_id: convoId,
                sender_id: userId,
                text: syncText,
                read: true,
              });
            }
          } else {
            await supabase.from('messages').insert({
              conversation_id: convoId,
              sender_id: userId,
              text: syncText,
              read: true,
            });
          }
        } catch {
          // Ignore individual peer relay errors
        }
      }));
    } catch (err) {
      console.warn('Peer message trip relay warning:', err);
    }
  }, [useSupabase]);

  // Sync a user's active trips across all 5 channels (`profiles`, `auth.users` metadata, `Realtime`, `messages` relay)
  const syncTripsToProfile = useCallback(async (userId, allTripsList) => {
    if (!useSupabase || !isUUID(userId)) return;

    try {
      let authUser = null;
      try {
        const { data: authData } = await supabase.auth.getUser();
        authUser = authData?.user || null;
      } catch { /* ignore */ }

      const userTrips = (allTripsList || []).filter(t => {
        if (!t || !t.destination || t.status === 'completed') return false;
        const tUid = t.user_id || t.userId;
        const belongsToUser =
          tUid === userId ||
          !tUid ||
          String(tUid).startsWith('local_') ||
          String(tUid).startsWith('user_');
        if (!belongsToUser) return false;
        const dep = t.departure_date || t.departureDate || '';
        const ddKey = makeDestDateKey(t.destination, dep);
        if (deletedTripsRef.current.has(t.id) || deletedTripsRef.current.has(ddKey)) {
          return false;
        }
        return true;
      });

      // Deduplicate by destination + departure_date and enrich with full traveler profile metadata
      const seen = new Set();
      const uniqueTrips = [];
      for (const rawT of userTrips) {
        const t = enrichTripWithProfile(rawT, userId, {}, authUser);
        const dep = t.departure_date || '';
        const key = makeDestDateKey(t.destination, dep);
        if (!seen.has(key)) {
          seen.add(key);
          const dur = getCleanDuration(t.duration || t.trip_duration || '7 days');
          uniqueTrips.push({
            id: t.id,
            user_id: userId,
            userId: userId,
            destination: t.destination,
            departure_date: dep || null,
            departureDate: dep || null,
            return_date: t.return_date || getTripEndDate(dep, dur),
            duration: dur,
            trip_duration: dur,
            group_size: t.group_size || '2',
            groupSize: t.group_size || '2',
            travel_style: t.travel_style || 'Mid-range',
            travelStyle: t.travel_style || 'Mid-range',
            status: t.status || 'active',
            created_at: t.created_at || new Date().toISOString(),
            user_name: t.user_name || 'Traveler',
            user_avatar: t.user_avatar && String(t.user_avatar).length <= 2048 ? t.user_avatar : null,
            user_city: t.user_city || '',
            user_age: t.user_age || null,
            user_gender: t.user_gender || 'other',
            user_experience: t.user_experience || 'intermediate',
            user_hobbies: t.user_hobbies || [],
            user_music: t.user_music || [],
            user_bio: t.user_bio || '',
          });
        }
      }

      // Sort newest first
      uniqueTrips.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Update signature so polling doesn't repeat identical syncs
      const sig = `${userId}:${JSON.stringify(uniqueTrips.map(t => `${t.destination}_${t.departure_date}_${t.duration}_${t.status}`))}`;
      lastSyncedSignatureRef.current = sig;

      const latest = uniqueTrips[0] || null;
      const rawDate = latest?.departure_date || null;
      const validDate = rawDate && /^\d{4}-\d{2}-\d{2}$/.test(String(rawDate)) ? rawDate : null;

      // Channel 1: Update `public.profiles` row
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
        .eq('id', userId)
        .select();

      // Channel 2: Persist own trips in Supabase Auth `user_metadata` (always succeeds regardless of table RLS)
      supabase.auth.updateUser({
        data: {
          wayfari_trips: uniqueTrips,
          wayfari_deleted_trips: Array.from(deletedTripsRef.current),
        }
      }).catch(() => {});

      // Channel 3: Broadcast & track via Supabase Realtime Presence + Broadcast
      if (realtimeChannelRef.current) {
        const realtimePayload = {
          user_id: userId,
          trips: uniqueTrips,
          updated_at: new Date().toISOString(),
        };
        realtimeChannelRef.current.track(realtimePayload).catch(() => {});
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'trips_updated',
          payload: realtimePayload,
        }).catch(() => {});
      }

      // Channel 4: Relay via `public.conversations` + `public.messages` so peers receive trips even when offline
      await relayTripsToPeersViaMessages(userId, uniqueTrips);
    } catch (err) {
      console.warn('syncTripsToProfile error:', err);
    }
  }, [useSupabase, enrichTripWithProfile, relayTripsToPeersViaMessages]);

  // Apply incoming peer trips from Realtime or Messages relay into peerTripsRef and active trips state
  const applyIncomingPeerTrips = useCallback((peerUserId, peerTripsArray, updatedAt) => {
    if (!isUUID(peerUserId)) return;
    if (currentUserIdRef.current && peerUserId === currentUserIdRef.current) return;

    const currentPeerEntry = peerTripsRef.current[peerUserId];
    if (currentPeerEntry?.updated_at && updatedAt) {
      if (new Date(updatedAt).getTime() < new Date(currentPeerEntry.updated_at).getTime()) {
        return;
      }
    }

    const normalizedPeerTrips = (Array.isArray(peerTripsArray) ? peerTripsArray : [])
      .filter(t => t && t.destination && t.status !== 'completed')
      .map(t => enrichTripWithProfile({ ...t, user_id: peerUserId, userId: peerUserId }, peerUserId));

    peerTripsRef.current = {
      ...peerTripsRef.current,
      [peerUserId]: {
        updated_at: updatedAt || new Date().toISOString(),
        trips: normalizedPeerTrips,
      }
    };
    saveStoredPeerTrips(peerTripsRef.current);

    // Immediately merge into live React state so Find Buddies updates in 0ms
    const existingOther = (tripsRef.current || []).filter(t => (t.user_id || t.userId) !== peerUserId);
    const combined = [...normalizedPeerTrips, ...existingOther];
    combined.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });
    setTripsAndPersist(combined);
  }, [enrichTripWithProfile, setTripsAndPersist]);

  // Load all trips from Supabase (`profiles` + `trips` + `messages` relay + `auth` metadata + `peerTripsRef`) and auto-sync own trips
  const loadTrips = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    let cloudTrips = [];
    let currentAuthUserId = null;
    let currentAuthUser = null;

    if (useSupabase) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user) {
          currentAuthUser = sessionData.session.user;
          currentAuthUserId = currentAuthUser.id;
          currentUserIdRef.current = currentAuthUserId;
        } else {
          const { data: authData } = await supabase.auth.getUser();
          if (authData?.user) {
            currentAuthUser = authData.user;
            currentAuthUserId = currentAuthUser.id;
            currentUserIdRef.current = currentAuthUserId;
          }
        }
      } catch { /* ignore */ }

      // Merge deleted trip keys from auth user_metadata if present
      if (Array.isArray(currentAuthUser?.user_metadata?.wayfari_deleted_trips)) {
        for (const delKey of currentAuthUser.user_metadata.wayfari_deleted_trips) {
          deletedTripsRef.current.add(delKey);
        }
        saveStoredDeletedTrips(deletedTripsRef.current);
      }

      // 1. Fetch all profiles (publicly readable across all users)
      let profilesList = [];
      const profilesById = {};
      try {
        const { data: profData, error: profErr } = await supabase
          .from('profiles')
          .select('*');
        if (!profErr && profData) {
          profilesList = profData;
          for (const p of profData) {
            if (p && p.id) profilesById[p.id] = p;
          }
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
          dbTripsRows = data.map(t => formatDbTrip(t, profilesById, currentAuthUser));
        }
      } catch (err) {
        console.warn('Supabase trips fetch error:', err);
      }

      // 3. Extract trips from all profiles
      const profileExtractedTrips = profilesList.flatMap(p => parseProfileTrips(p, profilesById, currentAuthUser));

      // 4. Read cross-user trip sync messages from `public.messages`
      try {
        const { data: syncMsgs, error: msgErr } = await supabase
          .from('messages')
          .select('sender_id, text, created_at')
          .like('text', `${TRIP_SYNC_PREFIX}%`)
          .order('created_at', { ascending: false });

        if (!msgErr && syncMsgs && syncMsgs.length > 0) {
          const seenSenders = new Set();
          for (const m of syncMsgs) {
            if (!m.sender_id || seenSenders.has(m.sender_id)) continue;
            seenSenders.add(m.sender_id);
            if (m.sender_id === currentAuthUserId) continue;

            try {
              const rawJson = String(m.text).slice(TRIP_SYNC_PREFIX.length);
              const parsed = JSON.parse(rawJson);
              const senderTrips = Array.isArray(parsed?.trips) ? parsed.trips : [];
              const msgTime = parsed?.updated_at || m.created_at;

              const existingEntry = peerTripsRef.current[m.sender_id];
              const isNewer = !existingEntry?.updated_at ||
                !msgTime ||
                new Date(msgTime).getTime() >= new Date(existingEntry.updated_at).getTime();

              if (isNewer) {
                peerTripsRef.current[m.sender_id] = {
                  updated_at: msgTime || new Date().toISOString(),
                  trips: senderTrips.map(st => enrichTripWithProfile({ ...st, user_id: m.sender_id, userId: m.sender_id }, m.sender_id, profilesById, currentAuthUser)),
                };
              }
            } catch { /* ignore malformed sync msg */ }
          }
          saveStoredPeerTrips(peerTripsRef.current);
        }
      } catch { /* ignore if messages table unavailable */ }

      // 5. Gather peer trips from peerTripsRef (populated by messages relay + Realtime Presence/Broadcast)
      const peerRelayTrips = [];
      const explicitlyClearedPeers = new Set();
      for (const [peerUid, entry] of Object.entries(peerTripsRef.current || {})) {
        if (peerUid === currentAuthUserId) continue;
        if (entry && Array.isArray(entry.trips)) {
          if (entry.trips.length === 0) {
            explicitlyClearedPeers.add(peerUid);
          } else {
            for (const pt of entry.trips) {
              if (pt && pt.destination && pt.status !== 'completed') {
                peerRelayTrips.push(enrichTripWithProfile(pt, peerUid, profilesById, currentAuthUser));
              }
            }
          }
        }
      }

      // 6. Gather current user's trips from Auth `user_metadata.wayfari_trips`
      const authMetaTrips = [];
      if (currentAuthUserId && Array.isArray(currentAuthUser?.user_metadata?.wayfari_trips)) {
        for (const mt of currentAuthUser.user_metadata.wayfari_trips) {
          if (mt && mt.destination && mt.status !== 'completed') {
            authMetaTrips.push(enrichTripWithProfile({ ...mt, user_id: currentAuthUserId, userId: currentAuthUserId }, currentAuthUserId, profilesById, currentAuthUser));
          }
        }
      }

      // 7. Combine all cloud sources (`profileExtractedTrips`, `peerRelayTrips`, `dbTripsRows`, `authMetaTrips`) without duplicates
      const combinedCloud = [
        ...profileExtractedTrips,
        ...peerRelayTrips,
        ...dbTripsRows,
        ...authMetaTrips,
      ];
      const seenCloudKeys = new Set();
      for (const ct of combinedCloud) {
        if (!ct || !ct.destination || ct.status === 'completed') continue;
        const ownerUid = ct.user_id || ct.userId;
        const dep = ct.departure_date || ct.departureDate || '';
        const ddKey = makeDestDateKey(ct.destination, dep);

        if (ownerUid === currentAuthUserId && (deletedTripsRef.current.has(ct.id) || deletedTripsRef.current.has(ddKey))) {
          continue;
        }
        if (ownerUid !== currentAuthUserId && explicitlyClearedPeers.has(ownerUid) && !profileExtractedTrips.includes(ct) && !peerRelayTrips.includes(ct)) {
          continue;
        }

        const key = makeTripDedupKey(ownerUid, ct.destination, dep);
        if (!seenCloudKeys.has(key)) {
          seenCloudKeys.add(key);
          cloudTrips.push(enrichTripWithProfile(ct, ownerUid, profilesById, currentAuthUser));
        }
      }

      // 8. Auto-sync current user's own active trips (from localStorage, `trips` table, or `user_metadata`) across all channels
      if (currentAuthUserId && !syncingRef.current) {
        try {
          syncingRef.current = true;
          const storedTrips = tripsRef.current && tripsRef.current.length > 0 ? tripsRef.current : getStoredTrips();
          const myLocalTrips = storedTrips.filter(lt => {
            if (!lt || !lt.destination || lt.status === 'completed') return false;
            const uid = lt.user_id || lt.userId;
            const isMine = uid === currentAuthUserId || !uid || String(uid).startsWith('local_') || String(uid).startsWith('user_');
            if (!isMine) return false;
            const dep = lt.departure_date || lt.departureDate || '';
            return !deletedTripsRef.current.has(lt.id) && !deletedTripsRef.current.has(makeDestDateKey(lt.destination, dep));
          });

          const myCloudTrips = cloudTrips.filter(ct => (ct.user_id || ct.userId) === currentAuthUserId);
          const allMyTripsCombined = [
            ...myLocalTrips.map(lt => enrichTripWithProfile({ ...lt, user_id: currentAuthUserId, userId: currentAuthUserId }, currentAuthUserId, profilesById, currentAuthUser)),
            ...myCloudTrips,
          ];

          // Deduplicate own trips
          const mySeen = new Set();
          const myUniqueTrips = [];
          for (const mt of allMyTripsCombined) {
            const dep = mt.departure_date || mt.departureDate || '';
            const k = makeDestDateKey(mt.destination, dep);
            if (!mySeen.has(k)) {
              mySeen.add(k);
              myUniqueTrips.push(mt);
            }
          }

          // Merge any local-only own trips into cloudTrips immediately
          for (const mt of myUniqueTrips) {
            const dep = mt.departure_date || mt.departureDate || '';
            const key = makeTripDedupKey(currentAuthUserId, mt.destination, dep);
            if (!seenCloudKeys.has(key)) {
              seenCloudKeys.add(key);
              cloudTrips.push(mt);
            }
          }

          // Check if `profiles` row or multi-channel sync needs to be updated
          const myProfileKeys = new Set(
            profileExtractedTrips
              .filter(pt => (pt.user_id || pt.userId) === currentAuthUserId)
              .map(pt => makeDestDateKey(pt.destination, pt.departure_date || pt.departureDate || ''))
          );
          const hasUnsyncedToProfile = myUniqueTrips.some(mt =>
            !myProfileKeys.has(makeDestDateKey(mt.destination, mt.departure_date || mt.departureDate || ''))
          );

          const currentSig = `${currentAuthUserId}:${JSON.stringify(myUniqueTrips.map(t => `${t.destination}_${t.departure_date}_${t.duration}_${t.status}`))}`;

          if (myUniqueTrips.length > 0 && (hasUnsyncedToProfile || lastSyncedSignatureRef.current !== currentSig)) {
            if (lastSyncedSignatureRef.current !== currentSig) {
              await syncTripsToProfile(currentAuthUserId, myUniqueTrips);

              // Also ensure each own trip exists in `public.trips` table
              const myDbKeys = new Set(
                dbTripsRows
                  .filter(dt => (dt.user_id || dt.userId) === currentAuthUserId)
                  .map(dt => makeDestDateKey(dt.destination, dt.departure_date || dt.departureDate || ''))
              );
              for (const mt of myUniqueTrips) {
                const mk = makeDestDateKey(mt.destination, mt.departure_date || mt.departureDate || '');
                if (!myDbKeys.has(mk)) {
                  await insertTripIntoDb(currentAuthUserId, mt, {
                    duration: mt.duration || '7 days',
                    group_size: mt.group_size || '2',
                    travel_style: mt.travel_style || 'Mid-range',
                    status: mt.status || 'active',
                    created_at: mt.created_at,
                    user_name: mt.user_name,
                    user_city: mt.user_city,
                    user_age: mt.user_age,
                    user_gender: mt.user_gender,
                    user_experience: mt.user_experience,
                    user_hobbies: mt.user_hobbies,
                    user_music: mt.user_music,
                    user_bio: mt.user_bio,
                  });
                }
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

    // 9. Merge cloudTrips with local trips (preserving both own unsynced trips AND other local accounts' trips on same browser)
    const currentLocalTrips = tripsRef.current && tripsRef.current.length > 0 ? tripsRef.current : getStoredTrips();
    const cloudKeys = new Set(
      cloudTrips.map(ct => makeTripDedupKey(ct.user_id || ct.userId, ct.destination, ct.departure_date || ct.departureDate))
    );

    const extraLocal = currentLocalTrips
      .filter(lt => {
        if (!lt || !lt.destination || lt.status === 'completed') return false;
        const uid = lt.user_id || lt.userId;
        const isOwn = !currentAuthUserId || uid === currentAuthUserId || !uid || String(uid).startsWith('local_') || String(uid).startsWith('user_');
        const effectiveUid = isOwn ? (currentAuthUserId || uid) : uid;
        const dep = lt.departure_date || lt.departureDate || '';
        const ddKey = makeDestDateKey(lt.destination, dep);

        if (isOwn && (deletedTripsRef.current.has(lt.id) || deletedTripsRef.current.has(ddKey))) {
          return false;
        }
        if (!isOwn && peerTripsRef.current[effectiveUid] && Array.isArray(peerTripsRef.current[effectiveUid].trips) && peerTripsRef.current[effectiveUid].trips.length === 0) {
          return false;
        }

        const key = makeTripDedupKey(effectiveUid, lt.destination, dep);
        return !cloudKeys.has(key);
      })
      .map(lt => {
        const uid = lt.user_id || lt.userId;
        const isOwn = !currentAuthUserId || uid === currentAuthUserId || !uid || String(uid).startsWith('local_') || String(uid).startsWith('user_');
        const effectiveUid = isOwn ? (currentAuthUserId || uid) : uid;
        return enrichTripWithProfile({ ...lt, user_id: effectiveUid, userId: effectiveUid }, effectiveUid, {}, currentAuthUser);
      });

    const merged = [...cloudTrips, ...extraLocal];

    // Sort all trips by created_at descending (most recently posted first!)
    merged.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });

    setTripsAndPersist(merged);
    if (!silent) setLoading(false);
  }, [useSupabase, formatDbTrip, parseProfileTrips, enrichTripWithProfile, syncTripsToProfile, insertTripIntoDb, setTripsAndPersist]);

  useEffect(() => {
    loadTrips(false);

    // Refresh when window regains focus
    const handleFocus = () => loadTrips(true);
    window.addEventListener('focus', handleFocus);

    // Poll every 8 seconds so new trips posted by any user appear live at the top of Find Buddies
    const pollInterval = setInterval(() => {
      loadTrips(true);
    }, 8000);

    // Re-load trips whenever auth state changes (e.g. login / account switch)
    let authSub = null;
    if (useSupabase) {
      try {
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          currentUserIdRef.current = session?.user?.id || null;
          lastSyncedSignatureRef.current = '';
          loadTrips(true);
        });
        authSub = data?.subscription;
      } catch { /* ignore */ }
    }

    let dbChannel = null;
    let globalSyncChannel = null;

    if (useSupabase) {
      try {
        dbChannel = supabase
          .channel('trips-and-profiles-realtime')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
            loadTrips(true);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
            loadTrips(true);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
            if (String(payload?.new?.text || '').startsWith(TRIP_SYNC_PREFIX)) {
              loadTrips(true);
            }
          })
          .subscribe();
      } catch (err) {
        console.warn('Realtime DB channel subscription error:', err);
      }

      // Global WebSocket Presence + Broadcast channel (bypasses DB RLS completely for live peers!)
      try {
        const clientKey = 'client_' + Math.random().toString(36).substring(2, 10);
        globalSyncChannel = supabase.channel('wayfari-global-trips-v3', {
          config: {
            broadcast: { self: false },
            presence: { key: clientKey },
          }
        });

        globalSyncChannel
          .on('broadcast', { event: 'trips_updated' }, ({ payload }) => {
            if (payload && payload.user_id) {
              applyIncomingPeerTrips(payload.user_id, payload.trips, payload.updated_at);
            }
          })
          .on('broadcast', { event: 'request_trips' }, async () => {
            const myUid = currentUserIdRef.current;
            if (!myUid) return;
            const myActive = (tripsRef.current || []).filter(t => (t.user_id || t.userId) === myUid && t.status !== 'completed');
            if (myActive.length > 0 && globalSyncChannel) {
              globalSyncChannel.send({
                type: 'broadcast',
                event: 'trips_updated',
                payload: {
                  user_id: myUid,
                  trips: myActive,
                  updated_at: new Date().toISOString(),
                }
              }).catch(() => {});
            }
          })
          .on('presence', { event: 'sync' }, () => {
            try {
              const state = globalSyncChannel.presenceState();
              for (const presences of Object.values(state || {})) {
                for (const p of presences || []) {
                  if (p && p.user_id && Array.isArray(p.trips)) {
                    applyIncomingPeerTrips(p.user_id, p.trips, p.updated_at);
                  }
                }
              }
            } catch { /* ignore */ }
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              realtimeChannelRef.current = globalSyncChannel;
              // Request active trips from any currently online peers
              globalSyncChannel.send({
                type: 'broadcast',
                event: 'request_trips',
                payload: { timestamp: Date.now() },
              }).catch(() => {});

              // Track own current trips in Presence immediately
              const myUid = currentUserIdRef.current;
              if (myUid) {
                const myActive = (tripsRef.current || []).filter(t => (t.user_id || t.userId) === myUid && t.status !== 'completed');
                globalSyncChannel.track({
                  user_id: myUid,
                  trips: myActive,
                  updated_at: new Date().toISOString(),
                }).catch(() => {});
              }
            }
          });
      } catch (err) {
        console.warn('Global sync channel error:', err);
      }
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(pollInterval);
      if (authSub) authSub.unsubscribe();
      if (dbChannel && useSupabase) {
        supabase.removeChannel(dbChannel);
      }
      if (globalSyncChannel && useSupabase) {
        realtimeChannelRef.current = null;
        supabase.removeChannel(globalSyncChannel);
      }
    };
  }, [loadTrips, useSupabase, applyIncomingPeerTrips]);

  const addTrip = useCallback(async (trip) => {
    const departureDateRaw = trip.departureDate || trip.departure_date || null;
    const departureDate = departureDateRaw && /^\d{4}-\d{2}-\d{2}/.test(String(departureDateRaw))
      ? String(departureDateRaw).slice(0, 10)
      : null;
    const duration = getCleanDuration(trip.duration || trip.trip_duration || '7 days');
    const returnDate = getTripEndDate(departureDate, duration);

    const targetUserId = trip.userId || trip.user_id || currentUserIdRef.current || ('user_' + Date.now());

    // Clear from deleted trips if user is re-posting this destination + departure_date
    const ddKey = makeDestDateKey(trip.destination, departureDate);
    if (deletedTripsRef.current.has(ddKey)) {
      deletedTripsRef.current.delete(ddKey);
      saveStoredDeletedTrips(deletedTripsRef.current);
    }

    const localTrip = enrichTripWithProfile({
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
      group_size: trip.groupSize || trip.group_size || '2',
      groupSize: trip.groupSize || trip.group_size || '2',
      travel_style: trip.travelStyle || trip.travel_style || 'Mid-range',
      travelStyle: trip.travelStyle || trip.travel_style || 'Mid-range',
      status: 'active',
      created_at: new Date().toISOString(),
    }, targetUserId);

    // 1. Synchronously compute updated list and persist to ref, localStorage, and React state (no React 19 batching race!)
    const baseTrips = tripsRef.current && tripsRef.current.length > 0 ? tripsRef.current : getStoredTrips();
    const updatedSnapshot = [localTrip, ...baseTrips.filter(t => t.id !== localTrip.id)];
    setTripsAndPersist(updatedSnapshot);

    // 2. Sync to Supabase (`profiles` + `trips` + `messages` relay + `Realtime` + `auth` metadata)
    if (useSupabase) {
      (async () => {
        try {
          let authId = isUUID(targetUserId) ? targetUserId : null;
          let authUser = null;

          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            authUser = sessionData.session.user;
            authId = authUser.id;
          } else {
            const { data: authData } = await supabase.auth.getUser();
            if (authData?.user) {
              authUser = authData.user;
              authId = authUser.id;
            }
          }

          if (!authId) authId = targetUserId;
          currentUserIdRef.current = isUUID(authId) ? authId : currentUserIdRef.current;

          const enrichedLocalTrip = enrichTripWithProfile(
            { ...localTrip, user_id: authId, userId: authId },
            authId,
            {},
            authUser
          );

          // Always stamp real authId onto state immediately
          const currentList = tripsRef.current || updatedSnapshot;
          const syncedList = currentList.map(t =>
            t.id === localTrip.id ? enrichedLocalTrip : t
          );
          setTripsAndPersist(syncedList);

          // Primary Cross-User Sync (5-Channel)
          await syncTripsToProfile(authId, syncedList);

          // Secondary Sync: Multi-schema fallback insert into `public.trips`
          const fullMeta = {
            duration: duration,
            group_size: enrichedLocalTrip.group_size,
            travel_style: enrichedLocalTrip.travel_style,
            status: 'active',
            created_at: enrichedLocalTrip.created_at,
            user_name: enrichedLocalTrip.user_name,
            user_city: enrichedLocalTrip.user_city,
            user_age: enrichedLocalTrip.user_age,
            user_gender: enrichedLocalTrip.user_gender,
            user_experience: enrichedLocalTrip.user_experience,
            user_hobbies: enrichedLocalTrip.user_hobbies,
            user_music: enrichedLocalTrip.user_music,
            user_bio: enrichedLocalTrip.user_bio,
          };

          const inserted = await insertTripIntoDb(authId, enrichedLocalTrip, fullMeta);
          if (inserted && inserted.id) {
            const latestList = tripsRef.current || syncedList;
            const withDbId = latestList.map(t =>
              t.id === localTrip.id
                ? {
                    ...enrichedLocalTrip,
                    id: inserted.id,
                    user_id: authId,
                    userId: authId,
                    created_at: inserted.created_at || enrichedLocalTrip.created_at,
                  }
                : t
            );
            setTripsAndPersist(withDbId);
          }
        } catch (err) {
          console.warn('Background Supabase trip sync error:', err);
        }
      })();
    }

    return localTrip;
  }, [useSupabase, enrichTripWithProfile, setTripsAndPersist, syncTripsToProfile, insertTripIntoDb]);

  const updateTrip = useCallback(async (tripId, updates) => {
    const baseTrips = tripsRef.current && tripsRef.current.length > 0 ? tripsRef.current : getStoredTrips();
    const updatedSnapshot = baseTrips.map(t => t.id === tripId ? { ...t, ...updates } : t);
    setTripsAndPersist(updatedSnapshot);

    if (useSupabase) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          await syncTripsToProfile(authData.user.id, updatedSnapshot);
        }
      } catch (err) {
        console.warn('Supabase trip update error:', err);
      }
    }
  }, [useSupabase, setTripsAndPersist, syncTripsToProfile]);

  const deleteTrip = useCallback(async (tripId) => {
    if (!tripId) return;

    const baseTrips = tripsRef.current && tripsRef.current.length > 0 ? tripsRef.current : getStoredTrips();
    const tripToDelete = baseTrips.find(t => t.id === tripId);
    const dest = tripToDelete?.destination;
    const dep = tripToDelete?.departure_date || tripToDelete?.departureDate || '';
    const uId = tripToDelete?.user_id || tripToDelete?.userId;

    // Record deletion so zombie rows from RLS-restricted tables never resurrect
    deletedTripsRef.current.add(tripId);
    if (dest) {
      deletedTripsRef.current.add(makeDestDateKey(dest, dep));
    }
    saveStoredDeletedTrips(deletedTripsRef.current);

    // 1. Synchronously remove from ref, localStorage, and React state
    const remainingTrips = baseTrips.filter(t => {
      if (t.id === tripId) return false;
      if (dest && (t.user_id === uId || t.userId === uId) && t.destination === dest && (t.departure_date || t.departureDate || '') === dep) {
        return false;
      }
      return true;
    });
    setTripsAndPersist(remainingTrips);

    // 2. Remove from Supabase (`profiles` + `trips` + `messages` relay + `Realtime` + `auth` metadata)
    if (useSupabase) {
      try {
        let authId = isUUID(uId) ? uId : currentUserIdRef.current;
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user) {
          authId = authData.user.id;
        }

        if (authId) {
          await syncTripsToProfile(authId, remainingTrips);
        }

        if (isUUID(tripId)) {
          await supabase.from('trips').delete().eq('id', tripId);
        }

        if (isUUID(authId) && dest) {
          await supabase
            .from('trips')
            .delete()
            .eq('user_id', authId)
            .eq('destination', dest);
        }
      } catch (err) {
        console.warn('Supabase trip delete error:', err);
      }
    }
  }, [useSupabase, setTripsAndPersist, syncTripsToProfile]);

  const getUserTrips = useCallback((userId) => {
    if (!userId) return trips;
    return trips.filter(t => {
      const tUid = t.user_id || t.userId;
      if (tUid === userId) return true;
      if (!tUid) return true;
      if (String(tUid).startsWith('local_') || String(tUid).startsWith('user_')) {
        return String(userId).startsWith('local_') || !currentUserIdRef.current || currentUserIdRef.current === userId;
      }
      return false;
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
