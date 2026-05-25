-- =============================================
-- WAYFARI — Supabase Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =============================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  gender TEXT NOT NULL DEFAULT 'other',
  age INTEGER,
  city TEXT,
  bio TEXT,
  avatar_url TEXT,
  destination TEXT,
  departure_date DATE,
  departure_time TIME,
  trip_duration TEXT,
  group_size TEXT DEFAULT '2',
  travel_style TEXT DEFAULT 'Mid-range',
  hobbies TEXT[] DEFAULT '{}',
  music TEXT[] DEFAULT '{}',
  buddy_gender TEXT DEFAULT 'Any',
  noise_level TEXT DEFAULT 'Moderate',
  sleep_schedule TEXT DEFAULT 'Flexible',
  sos_enabled BOOLEAN DEFAULT FALSE,
  checkin_interval TEXT DEFAULT '2hr',
  profile_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. TRIPS TABLE
CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  departure_date DATE,
  departure_time TIME,
  duration TEXT,
  group_size TEXT DEFAULT '2',
  travel_style TEXT DEFAULT 'Mid-range',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trips" ON trips
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own trips" ON trips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips" ON trips
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips" ON trips
  FOR DELETE USING (auth.uid() = user_id);

-- 3. CONNECTIONS TABLE
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_user_id, to_user_id)
);

ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connections" ON connections
  FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create connections" ON connections
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update connections they received" ON connections
  FOR UPDATE USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

-- 4. CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message TEXT DEFAULT '',
  last_message_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_1, participant_2)
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view conversations" ON conversations
  FOR SELECT USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Participants can create conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Participants can update conversations" ON conversations
  FOR UPDATE USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- 5. MESSAGES TABLE
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  text TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversation participants can view messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (auth.uid() = c.participant_1 OR auth.uid() = c.participant_2)
    )
  );

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- 6. SAFETY CONTACTS TABLE
CREATE TABLE IF NOT EXISTS safety_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE safety_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own safety contacts" ON safety_contacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own safety contacts" ON safety_contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own safety contacts" ON safety_contacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own safety contacts" ON safety_contacts
  FOR DELETE USING (auth.uid() = user_id);

-- 7. CHECK-INS TABLE
CREATE TABLE IF NOT EXISTS check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own check-ins" ON check_ins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own check-ins" ON check_ins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable Realtime on messages for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE connections;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_from ON connections(from_user_id);
CREATE INDEX IF NOT EXISTS idx_connections_to ON connections(to_user_id);
CREATE INDEX IF NOT EXISTS idx_messages_convo ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_safety_contacts_user ON safety_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_user ON check_ins(user_id);
