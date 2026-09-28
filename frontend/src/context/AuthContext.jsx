import { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AuthContext = createContext(null);

// Normalize any error into a user-friendly string
const getErrorMessage = (err) => {
  if (!err) return 'Something went wrong. Please try again.';
  if (typeof err === 'string') return err;
  if (err.message && typeof err.message === 'string' && err.message.length > 0) return err.message;
  if (err.error_description) return err.error_description;
  if (err.msg) return err.msg;
  try {
    const str = JSON.stringify(err);
    if (str && str !== '{}') return str;
  } catch { /* ignore */ }
  return 'Something went wrong. Please try again.';
};

const STORAGE_KEY = 'wayfari_auth';
const PROFILES_KEY = 'wayfari_profiles';

// ── Local storage helpers ──
const getStoredAuth = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
  } catch { return null; }
};

const setStoredAuth = (data) => {
  if (data) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  else localStorage.removeItem(STORAGE_KEY);
};

const getStoredProfiles = () => {
  try {
    return JSON.parse(localStorage.getItem(PROFILES_KEY)) || {};
  } catch { return {}; }
};

const setStoredProfiles = (profiles) => {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
};

// Merge profile objects without allowing null/empty DB columns to wipe rich local/auth metadata
const mergeProfileObjects = (...sources) => {
  const result = {};
  for (const src of sources) {
    if (!src || typeof src !== 'object') continue;
    for (const [k, v] of Object.entries(src)) {
      if (v === null || v === undefined || v === '') continue;
      if (k === 'city' && v === 'Global Nomad') continue;
      if (Array.isArray(v) && v.length === 0 && Array.isArray(result[k]) && result[k].length > 0) {
        continue;
      }
      if (k === 'gender' && v === 'other' && result.gender && result.gender !== 'other') {
        continue;
      }
      if (k === 'profile_complete' && v === false && result.profile_complete === true) {
        continue;
      }
      result[k] = v;
    }
  }
  if (result.city === 'Global Nomad') result.city = '';
  return result;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const useSupabase = isSupabaseConfigured();

  // ── Load profile from Supabase + Auth user_metadata + localStorage ──
  const loadProfile = async (userId, sessionUser = null) => {
    const localProfiles = getStoredProfiles();
    const localProf = localProfiles[userId] || null;
    const activeUser = sessionUser || user;
    const metaProf = activeUser?.user_metadata?.wayfari_profile || null;

    const baseFallback = {
      id: userId,
      name: activeUser?.user_metadata?.full_name || activeUser?.user_metadata?.name || activeUser?.email?.split('@')[0] || 'Traveler',
      email: activeUser?.email || '',
      gender: activeUser?.user_metadata?.gender || 'other',
      profile_complete: false,
      hobbies: [],
      music: [],
    };

    if (!useSupabase) {
      const mergedLocal = mergeProfileObjects(baseFallback, metaProf, localProf);
      setProfile(mergedLocal);
      return mergedLocal;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const merged = mergeProfileObjects(baseFallback, data && !error ? data : null, metaProf, localProf);
      if (!merged.hobbies) merged.hobbies = [];
      if (!merged.music) merged.music = [];
      if (merged.destination || merged.age || merged.city || (merged.trip_duration && merged.trip_duration !== '[]')) {
        merged.profile_complete = true;
      }

      const updatedLocal = getStoredProfiles();
      updatedLocal[userId] = merged;
      setStoredProfiles(updatedLocal);
      setProfile(merged);
      return merged;
    } catch (err) {
      console.warn('Profile load exception, using merged fallback:', err);
      const merged = mergeProfileObjects(baseFallback, metaProf, localProf);
      if (!merged.hobbies) merged.hobbies = [];
      if (!merged.music) merged.music = [];
      if (merged.destination || merged.age || merged.city || (merged.trip_duration && merged.trip_duration !== '[]')) {
        merged.profile_complete = true;
      }
      setProfile(merged);
      return merged;
    }
  };

  // ── Initialize ──
  useEffect(() => {
    let mounted = true;

    // Safety fallback timer so the app never gets stuck on "Loading Wayfari..."
    const safetyTimer = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 2500);

    if (useSupabase) {
      // Supabase flow
      supabase.auth.getSession()
        .then(async ({ data: { session } }) => {
          if (!mounted) return;
          if (session?.user) {
            const cachedLocal = getStoredProfiles()[session.user.id];
            const cachedMeta = session.user.user_metadata?.wayfari_profile;
            if (cachedLocal || cachedMeta) {
              setProfile(mergeProfileObjects(cachedMeta, cachedLocal));
            }
            setUser(session.user);
            await loadProfile(session.user.id, session.user);
          }
          if (mounted) setLoading(false);
          clearTimeout(safetyTimer);
        })
        .catch(err => {
          console.warn('Supabase getSession error / blocked by browser:', err);
          if (mounted) setLoading(false);
          clearTimeout(safetyTimer);
        });

      let subscriptionObj = null;
      try {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return;
            if (session?.user) {
              const cachedLocal = getStoredProfiles()[session.user.id];
              const cachedMeta = session.user.user_metadata?.wayfari_profile;
              const seedProf = mergeProfileObjects({
                id: session.user.id,
                name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Traveler',
                email: session.user.email || '',
                gender: session.user.user_metadata?.gender || 'other',
                profile_complete: event === 'SIGNED_IN' && !cachedLocal && !cachedMeta ? false : (cachedLocal?.profile_complete ?? cachedMeta?.profile_complete ?? false),
                hobbies: [],
                music: [],
              }, cachedMeta, cachedLocal);
              setProfile(prev => prev && prev.id === session.user.id ? mergeProfileObjects(seedProf, prev) : seedProf);
              setUser(session.user);
              try {
                // Ensure profile exists (especially for Google Sign-In)
                const { data: existingProfile } = await supabase
                  .from('profiles')
                  .select('id')
                  .eq('id', session.user.id)
                  .maybeSingle();

                if (!existingProfile) {
                  await supabase.from('profiles').insert({
                    id: session.user.id,
                    name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Traveler',
                    email: session.user.email,
                    gender: session.user.user_metadata?.gender || 'other',
                    profile_complete: false
                  });
                }

                await loadProfile(session.user.id, session.user);
              } catch (profileErr) {
                console.warn('Profile creation/loading error:', profileErr);
              }
            } else {
              setUser(null);
              setProfile(null);
            }
            if (mounted) setLoading(false);
            clearTimeout(safetyTimer);
          }
        );
        subscriptionObj = subscription;
      } catch (subErr) {
        console.warn('Supabase onAuthStateChange error:', subErr);
        if (mounted) setLoading(false);
        clearTimeout(safetyTimer);
      }

      return () => {
        mounted = false;
        clearTimeout(safetyTimer);
        if (subscriptionObj) subscriptionObj.unsubscribe();
      };
    } else {
      // Local auth flow
      const stored = getStoredAuth();
      if (stored) {
        setUser({ id: stored.id, email: stored.email, user_metadata: { name: stored.name, gender: stored.gender } });
        const profiles = getStoredProfiles();
        setProfile(profiles[stored.id] || stored);
      }
      setLoading(false);
      clearTimeout(safetyTimer);
      return () => { mounted = false; };
    }
  }, [useSupabase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Signup ──
  const signup = async (name, email, password, gender) => {
    if (useSupabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, gender: gender.toLowerCase() },
            emailRedirectTo: window.location.origin + '/auth'
          }
        });

        if (error) {
          const msg = getErrorMessage(error);
          if (msg.toLowerCase().includes('rate limit')) {
            return { success: false, error: 'Too many attempts. Please wait a few minutes before trying again.' };
          }
          if (msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('504')) {
            return { success: false, error: 'The server took too long to respond. Please try again in a moment.' };
          }
          return { success: false, error: msg };
        }

        if (data.user) {
          // If session is active (email confirmation disabled in Supabase), create profile
          if (data.session) {
            const initialProf = {
              id: data.user.id,
              name,
              email,
              gender: gender.toLowerCase(),
              profile_complete: false,
              hobbies: [],
              music: [],
            };

            const localProfiles = getStoredProfiles();
            localProfiles[data.user.id] = initialProf;
            setStoredProfiles(localProfiles);
            setProfile(initialProf);
            setUser(data.user);

            const { error: profileError } = await supabase.from('profiles').upsert({
              id: data.user.id,
              name,
              email,
              gender: gender.toLowerCase(),
              profile_complete: false,
            });

            if (profileError) {
              console.error('Profile creation error:', profileError);
            }

            await loadProfile(data.user.id, data.user);
          } else {
            // Email confirmation is required by Supabase
            return {
              success: true,
              needsConfirmation: true,
              message: 'Account created! Please check your email inbox and click the confirmation link to activate your account before logging in.'
            };
          }
        }

        return { success: true };
      } catch (err) {
        return { success: false, error: getErrorMessage(err) };
      }
    }

    // ── Local signup ──
    const profiles = getStoredProfiles();
    const existingUser = Object.values(profiles).find(p => p.email === email);
    if (existingUser) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    const userId = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const newProfile = {
      id: userId,
      name,
      email,
      gender: gender.toLowerCase(),
      password,
      profile_complete: false,
      hobbies: [],
      music: [],
      created_at: new Date().toISOString(),
    };

    profiles[userId] = newProfile;
    setStoredProfiles(profiles);
    setStoredAuth({ id: userId, email, name, gender: gender.toLowerCase() });
    setProfile(newProfile);
    setUser({ id: userId, email, user_metadata: { name, gender: gender.toLowerCase() } });

    return { success: true };
  };

  // ── Login ──
  const login = async (email, password) => {
    if (useSupabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          const msg = getErrorMessage(error);
          if (msg.toLowerCase().includes('email not confirmed')) {
            return { success: false, error: 'Your email is not verified yet. Please check your inbox (and spam folder) for the confirmation link.' };
          }
          if (msg.toLowerCase().includes('rate limit')) {
            return { success: false, error: 'Too many attempts. Please wait a few minutes before trying again.' };
          }
          if (msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('504')) {
            return { success: false, error: 'The server took too long to respond. Please try again in a moment.' };
          }
          return { success: false, error: msg };
        }

        await loadProfile(data.user.id, data.user);
        setUser(data.user);
        return { success: true };
      } catch (err) {
        return { success: false, error: getErrorMessage(err) };
      }
    }

    // ── Local login ──
    const profiles = getStoredProfiles();
    const found = Object.values(profiles).find(p => p.email === email && p.password === password);
    if (!found) {
      return { success: false, error: 'Invalid email or password.' };
    }

    setStoredAuth({ id: found.id, email: found.email, name: found.name, gender: found.gender });
    setUser({ id: found.id, email: found.email, user_metadata: { name: found.name, gender: found.gender } });
    setProfile(found);
    return { success: true };
  };

  // ── Logout ──
  const logout = () => {
    if (useSupabase) {
      supabase.auth.signOut().catch(err => {
        console.warn('Supabase signOut error:', err);
      });
    }
    setStoredAuth(null);
    localStorage.removeItem(STORAGE_KEY);
    // Clean up only anonymous temporary trips while preserving UUID-authenticated trips
    try {
      const existingTrips = JSON.parse(localStorage.getItem('wayfari_trips')) || [];
      const keptTrips = existingTrips.filter(t => {
        const uid = String(t.user_id || t.userId || '');
        return uid && !uid.startsWith('local_') && !uid.startsWith('user_');
      });
      localStorage.setItem('wayfari_trips', JSON.stringify(keptTrips));
    } catch { /* ignore */ }
    setUser(null);
    setProfile(null);
  };

  // ── Social Login (Google / GitHub) ──
  const socialLogin = async (provider) => {
    if (useSupabase) {
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: { redirectTo: window.location.origin + '/find-buddies' }
        });
        if (error) return { success: false, error: error.message };
        return { success: true };
      } catch {
        return { success: false, error: `${provider === 'google' ? 'Google' : 'GitHub'} login is not configured. Please use email and password.` };
      }
    }
    return { success: false, error: 'Social login requires Supabase to be configured. Please use email and password.' };
  };

  // ── Update Profile ──
  const updateProfile = async (updates) => {
    if (!user) return;

    const storedForUser = getStoredProfiles()[user.id] || {};
    const currentProfile = mergeProfileObjects(storedForUser, profile || {});
    const merged = { ...currentProfile, id: user.id };

    if (updates.profile) {
      if (updates.profile.displayName) merged.name = String(updates.profile.displayName).trim();
      if (updates.profile.age !== undefined && updates.profile.age !== '') {
        const parsedAge = parseInt(updates.profile.age, 10);
        if (!isNaN(parsedAge) && parsedAge > 0) merged.age = parsedAge;
      }
      if (updates.profile.city !== undefined) {
        const cleanCity = String(updates.profile.city || '').trim();
        merged.city = cleanCity.toLowerCase() === 'global nomad' ? '' : cleanCity;
      }
      if (updates.profile.bio !== undefined) merged.bio = updates.profile.bio;
      if (updates.profile.avatar) merged.avatar_url = updates.profile.avatar;
    }

    if (updates.preferences) {
      if (updates.preferences.destination) merged.destination = updates.preferences.destination;
      if (updates.preferences.departureDate) merged.departure_date = updates.preferences.departureDate;
      if (updates.preferences.departureTime) merged.departure_time = updates.preferences.departureTime;
      if (updates.preferences.tripDuration) merged.trip_duration = updates.preferences.tripDuration;
      if (updates.preferences.groupSize) merged.group_size = updates.preferences.groupSize;
      if (updates.preferences.travelStyle) merged.travel_style = updates.preferences.travelStyle;
    }

    if (updates.hobbies) merged.hobbies = updates.hobbies;
    if (updates.music) merged.music = updates.music;
    if (updates.travelStyle) merged.travel_style = updates.travelStyle;
    if (updates.groupSize) merged.group_size = updates.groupSize;

    if (updates.interests) {
      if (updates.interests.hobbies) merged.hobbies = updates.interests.hobbies;
      if (updates.interests.music) merged.music = updates.interests.music;
      if (updates.interests.buddyGender) merged.buddy_gender = updates.interests.buddyGender;
      if (updates.interests.noiseLevel) merged.noise_level = updates.interests.noiseLevel;
      if (updates.interests.sleepSchedule) merged.sleep_schedule = updates.interests.sleepSchedule;
    }

    if (updates.travelExperience) merged.travel_experience = updates.travelExperience;
    if (updates.profileComplete !== undefined) merged.profile_complete = updates.profileComplete;

    if (updates.safety) {
      merged.sos_enabled = updates.safety.sosEnabled ?? false;
      merged.checkin_interval = updates.safety.checkInInterval ?? '2hr';
    }

    // 1. Always persist immediately to localStorage and React state so UI never self-wipes
    const localProfiles = getStoredProfiles();
    localProfiles[user.id] = merged;
    setStoredProfiles(localProfiles);
    setProfile(merged);

    // Also stamp updated age/city/name/bio onto own stored trips so TripContext immediately syncs them
    try {
      const storedTrips = JSON.parse(localStorage.getItem('wayfari_trips')) || [];
      let tripsChanged = false;
      const updatedTrips = storedTrips.map(t => {
        if (!t) return t;
        const tUid = t.user_id || t.userId;
        if (tUid === user.id) {
          tripsChanged = true;
          return {
            ...t,
            user_name: merged.name || t.user_name || 'Traveler',
            user_age: merged.age || t.user_age || null,
            user_city: merged.city || (t.user_city && String(t.user_city).toLowerCase() !== 'global nomad' ? t.user_city : '') || '',
            user_bio: merged.bio || t.user_bio || '',
            user_gender: merged.gender || t.user_gender || 'other',
            user_hobbies: merged.hobbies && merged.hobbies.length > 0 ? merged.hobbies : (t.user_hobbies || []),
            user_music: merged.music && merged.music.length > 0 ? merged.music : (t.user_music || []),
          };
        }
        return t;
      });
      if (tripsChanged) {
        localStorage.setItem('wayfari_trips', JSON.stringify(updatedTrips));
      }
    } catch { /* ignore */ }

    window.dispatchEvent(new CustomEvent('wayfari:profile-updated', { detail: merged }));

    // 2. Sync to Supabase (`profiles` table + Auth `user_metadata`)
    if (useSupabase) {
      try {
        // Save compact copy to Auth user_metadata (always succeeds for own user even if profiles UPDATE RLS is restricted)
        const compactMetaProfile = { ...merged };
        if (compactMetaProfile.avatar_url && String(compactMetaProfile.avatar_url).length > 4096) {
          delete compactMetaProfile.avatar_url;
        }
        supabase.auth.updateUser({
          data: {
            name: merged.name,
            wayfari_profile: compactMetaProfile,
          }
        }).catch(() => {});

        const dbUpdates = {};
        if (merged.name) dbUpdates.name = merged.name;
        if (merged.age) dbUpdates.age = merged.age;
        if (merged.city) dbUpdates.city = merged.city;
        if (merged.bio) dbUpdates.bio = merged.bio;
        if (merged.avatar_url && String(merged.avatar_url).length <= 8192) dbUpdates.avatar_url = merged.avatar_url;
        if (merged.destination) dbUpdates.destination = merged.destination;
        if (merged.departure_date && /^\d{4}-\d{2}-\d{2}$/.test(String(merged.departure_date))) {
          dbUpdates.departure_date = merged.departure_date;
        }
        if (merged.trip_duration && !String(merged.trip_duration).startsWith('[')) {
          if (!currentProfile.trip_duration || !String(currentProfile.trip_duration).startsWith('[')) {
            dbUpdates.trip_duration = merged.trip_duration;
          }
        }
        if (merged.group_size) dbUpdates.group_size = merged.group_size;
        if (merged.travel_style) dbUpdates.travel_style = merged.travel_style;
        if (merged.hobbies) dbUpdates.hobbies = merged.hobbies;
        if (merged.music) dbUpdates.music = merged.music;
        if (merged.noise_level) dbUpdates.noise_level = merged.noise_level;
        if (merged.sleep_schedule) dbUpdates.sleep_schedule = merged.sleep_schedule;
        if (merged.profile_complete !== undefined) dbUpdates.profile_complete = merged.profile_complete;

        if (Object.keys(dbUpdates).length > 0) {
          let { data: updatedRow, error } = await supabase
            .from('profiles')
            .update(dbUpdates)
            .eq('id', user.id)
            .select()
            .maybeSingle();

          if (error || !updatedRow) {
            const coreDbUpdates = {
              id: user.id,
              name: merged.name || user.user_metadata?.name || 'Traveler',
              email: merged.email || user.email || null,
              gender: merged.gender || user.user_metadata?.gender || 'other',
              profile_complete: merged.profile_complete ?? true,
            };
            if (merged.age) coreDbUpdates.age = merged.age;
            if (merged.city) coreDbUpdates.city = merged.city;
            if (merged.bio) coreDbUpdates.bio = merged.bio;

            const retryUpsert = await supabase
              .from('profiles')
              .upsert(coreDbUpdates, { onConflict: 'id' })
              .select()
              .maybeSingle();

            if (!retryUpsert.error && retryUpsert.data) {
              updatedRow = retryUpsert.data;
            }
          }

          if (updatedRow) {
            const combinedRow = mergeProfileObjects(updatedRow, merged);
            const refreshedLocal = getStoredProfiles();
            refreshedLocal[user.id] = combinedRow;
            setStoredProfiles(refreshedLocal);
            setProfile(combinedRow);
          }
        }

        window.dispatchEvent(new CustomEvent('wayfari:profile-updated', { detail: merged }));

        // Handle safety contacts separately
        if (updates.safety?.contacts?.length > 0) {
          await supabase.from('safety_contacts').delete().eq('user_id', user.id);
          const contactRows = updates.safety.contacts
            .filter(c => c.name || c.phone)
            .map(c => ({
              user_id: user.id,
              name: c.name,
              phone: c.phone,
              relationship: c.relationship
            }));
          if (contactRows.length > 0) {
            await supabase.from('safety_contacts').insert(contactRows);
          }
        }
      } catch (err) {
        console.warn('Supabase profile update exception:', err);
      }
    }
  };

  // Extract clean duration string if profile.trip_duration stores JSON trips array
  const getCleanProfileDuration = (rawDur) => {
    if (!rawDur) return null;
    if (typeof rawDur === 'string' && (rawDur.startsWith('[') || rawDur.startsWith('{'))) {
      try {
        const parsed = JSON.parse(rawDur);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[0].duration || '7 days';
        }
        if (parsed && typeof parsed === 'object') {
          return parsed.duration || '7 days';
        }
        return null;
      } catch {
        return '7 days';
      }
    }
    return rawDur;
  };

  // Build a user-like object that components expect
  const combinedUser = user && profile ? {
    id: user.id,
    name: profile.name || user.user_metadata?.name || 'Traveler',
    email: profile.email || user.email,
    gender: (profile.gender && profile.gender !== 'other') ? profile.gender : (user.user_metadata?.gender || profile.gender || 'other'),
    travelExperience: profile.travel_experience || 'beginner',
    travel_experience: profile.travel_experience || 'beginner',
    profileComplete: profile.profile_complete,
    profile: {
      avatar: profile.avatar_url,
      displayName: profile.name || user.user_metadata?.name || 'Traveler',
      age: profile.age,
      city: profile.city,
      bio: profile.bio,
    },
    preferences: {
      destination: profile.destination,
      departureDate: profile.departure_date,
      departureTime: profile.departure_time,
      tripDuration: getCleanProfileDuration(profile.trip_duration),
      groupSize: profile.group_size,
      travelStyle: profile.travel_style,
    },
    interests: {
      hobbies: profile.hobbies || [],
      music: profile.music || [],
      buddyGender: profile.buddy_gender,
      noiseLevel: profile.noise_level,
      sleepSchedule: profile.sleep_schedule,
    },
    hobbies: profile.hobbies || [],
    music: profile.music || [],
    travelStyle: profile.travel_style,
    groupSize: profile.group_size,
    safety: {
      contacts: [],
      sosEnabled: profile.sos_enabled,
      checkInInterval: profile.checkin_interval,
    },
    createdAt: profile.created_at,
  } : (user ? {
    id: user.id,
    name: user.user_metadata?.name || '',
    email: user.email,
    gender: user.user_metadata?.gender,
    profileComplete: getStoredProfiles()[user.id]?.profile_complete ?? user.user_metadata?.wayfari_profile?.profile_complete ?? false,
    profile: {
      displayName: user.user_metadata?.name || '',
      age: getStoredProfiles()[user.id]?.age || user.user_metadata?.wayfari_profile?.age || undefined,
      city: getStoredProfiles()[user.id]?.city || user.user_metadata?.wayfari_profile?.city || undefined,
      bio: getStoredProfiles()[user.id]?.bio || user.user_metadata?.wayfari_profile?.bio || undefined,
    },
    preferences: {},
    interests: { hobbies: [], music: [] },
    hobbies: [],
    music: [],
    safety: { contacts: [] },
  } : null);

  const isFemale = combinedUser?.gender === 'female';

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'Outfit, sans-serif',
        color: '#F97316'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✈️</div>
          <h2>Loading Wayfari...</h2>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user: combinedUser,
      signup,
      login,
      logout,
      socialLogin,
      updateProfile,
      isFemale,
      loading,
      supabaseUser: user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
