import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://hvaxzaoerjsbtzzwowbs.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2YXh6YW9lcmpzYnR6endvd2JzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTY5OTAsImV4cCI6MjA5Mzg5Mjk5MH0.GpU2P-pjRkHBz0BQJBOqtwUV7FwPwNv9Bzd7Ytcz_UU';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseUrl = (envUrl && envUrl !== 'https://placeholder.supabase.co')
  ? envUrl
  : DEFAULT_SUPABASE_URL;

export const supabaseAnonKey = (envKey && envKey !== 'PASTE_YOUR_ANON_KEY_HERE' && envKey !== 'placeholder' && envKey.length > 20)
  ? envKey
  : DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseAnonKey.length > 20);
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
