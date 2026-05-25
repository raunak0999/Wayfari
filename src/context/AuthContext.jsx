import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return key && key !== 'PASTE_YOUR_ANON_KEY_HERE' && key.length > 20;
};

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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const useSupabase = isSupabaseConfigured();

  // ── Initialize ──
  useEffect(() => {
    if (useSupabase) {
      // Supabase flow
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          loadProfile(session.user.id);
        }
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (session?.user) {
            setUser(session.user);
            await loadProfile(session.user.id);
          } else {
            setUser(null);
            setProfile(null);
          }
          setLoading(false);
        }
      );

      return () => subscription.unsubscribe();
    } else {
      // Local auth flow
      const stored = getStoredAuth();
      if (stored) {
        setUser({ id: stored.id, email: stored.email, user_metadata: { name: stored.name, gender: stored.gender } });
        const profiles = getStoredProfiles();
        setProfile(profiles[stored.id] || stored);
      }
      setLoading(false);
    }
  }, [useSupabase]);

  // ── Load profile from Supabase ──
  const loadProfile = async (userId) => {
    if (!useSupabase) {
      const profiles = getStoredProfiles();
      if (profiles[userId]) setProfile(profiles[userId]);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setProfile(data);
    }
  };

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
          const { error: profileError } = await supabase.from('profiles').upsert({
            id: data.user.id,
            name,
            email,
            gender: gender.toLowerCase(),
            profile_complete: false
          });

          if (profileError) {
            console.error('Profile creation error:', profileError);
          }

          // If email confirmation is required (user exists but session is null)
          if (!data.session) {
            return {
              success: true,
              needsConfirmation: true,
              message: 'Account created! Please check your email and click the confirmation link to activate your account.'
            };
          }

          setUser(data.user);
          await loadProfile(data.user.id);
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
      password, // stored locally only — not production-grade
      profile_complete: false,
      hobbies: [],
      music: [],
      created_at: new Date().toISOString(),
    };

    profiles[userId] = newProfile;
    setStoredProfiles(profiles);
    setStoredAuth({ id: userId, email, name, gender: gender.toLowerCase() });
    setUser({ id: userId, email, user_metadata: { name, gender: gender.toLowerCase() } });
    setProfile(newProfile);

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

        setUser(data.user);
        await loadProfile(data.user.id);
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
  const logout = async () => {
    if (useSupabase) {
      await supabase.auth.signOut();
    }
    setStoredAuth(null);
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
        // Supabase handles the redirect — return success
        return { success: true };
      } catch (err) {
        return { success: false, error: `${provider === 'google' ? 'Google' : 'GitHub'} login is not configured. Please use email and password.` };
      }
    }
    return { success: false, error: 'Social login requires Supabase to be configured. Please use email and password.' };
  };

  // ── Update Profile ──
  const updateProfile = async (updates) => {
    if (!user) return;

    const currentProfile = profile || {};
    const merged = { ...currentProfile };

    if (updates.profile) {
      if (updates.profile.displayName) merged.name = updates.profile.displayName;
      if (updates.profile.age) merged.age = parseInt(updates.profile.age);
      if (updates.profile.city) merged.city = updates.profile.city;
      if (updates.profile.bio) merged.bio = updates.profile.bio;
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

    if (updates.profileComplete !== undefined) merged.profile_complete = updates.profileComplete;

    if (updates.safety) {
      merged.sos_enabled = updates.safety.sosEnabled ?? false;
      merged.checkin_interval = updates.safety.checkInInterval ?? '2hr';
    }

    // ── Supabase update ──
    if (useSupabase) {
      const dbUpdates = {};
      if (merged.name && merged.name !== currentProfile.name) dbUpdates.name = merged.name;
      if (merged.age) dbUpdates.age = merged.age;
      if (merged.city) dbUpdates.city = merged.city;
      if (merged.bio) dbUpdates.bio = merged.bio;
      if (merged.avatar_url) dbUpdates.avatar_url = merged.avatar_url;
      if (merged.destination) dbUpdates.destination = merged.destination;
      if (merged.departure_date) dbUpdates.departure_date = merged.departure_date;
      if (merged.departure_time) dbUpdates.departure_time = merged.departure_time;
      if (merged.trip_duration) dbUpdates.trip_duration = merged.trip_duration;
      if (merged.group_size) dbUpdates.group_size = merged.group_size;
      if (merged.travel_style) dbUpdates.travel_style = merged.travel_style;
      if (merged.hobbies) dbUpdates.hobbies = merged.hobbies;
      if (merged.music) dbUpdates.music = merged.music;
      if (merged.buddy_gender) dbUpdates.buddy_gender = merged.buddy_gender;
      if (merged.noise_level) dbUpdates.noise_level = merged.noise_level;
      if (merged.sleep_schedule) dbUpdates.sleep_schedule = merged.sleep_schedule;
      if (merged.profile_complete !== undefined) dbUpdates.profile_complete = merged.profile_complete;
      if (merged.sos_enabled !== undefined) dbUpdates.sos_enabled = merged.sos_enabled;
      if (merged.checkin_interval) dbUpdates.checkin_interval = merged.checkin_interval;

      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(dbUpdates)
          .eq('id', user.id);

        if (error) {
          console.error('Profile update error:', error);
        }
      }

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

      await loadProfile(user.id);
    } else {
      // ── Local update ──
      const profiles = getStoredProfiles();
      profiles[user.id] = merged;
      setStoredProfiles(profiles);
      setProfile(merged);
    }
  };

  // Build a user-like object that components expect
  const combinedUser = user && profile ? {
    id: user.id,
    name: profile.name,
    email: profile.email || user.email,
    gender: profile.gender || user.user_metadata?.gender,
    profileComplete: profile.profile_complete,
    profile: {
      avatar: profile.avatar_url,
      displayName: profile.name,
      age: profile.age,
      city: profile.city,
      bio: profile.bio,
    },
    preferences: {
      destination: profile.destination,
      departureDate: profile.departure_date,
      departureTime: profile.departure_time,
      tripDuration: profile.trip_duration,
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
    // Minimal user object when profile hasn't loaded yet
    id: user.id,
    name: user.user_metadata?.name || '',
    email: user.email,
    gender: user.user_metadata?.gender,
    profileComplete: false,
    profile: {},
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
