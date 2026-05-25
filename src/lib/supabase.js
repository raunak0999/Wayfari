import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey === 'PASTE_YOUR_ANON_KEY_HERE') {
  console.info(
    '📋 Supabase not configured — running in local mode.\n' +
    'To connect Supabase, add your credentials to .env:\n' +
    'VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
    'VITE_SUPABASE_ANON_KEY=eyJhbGciOiJ...'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
