-- ==============================================================================
-- ONLINE CORPORATE: Supabase Database Schema & Auto-Sync Trigger
-- Run this in your Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Create the public profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE,
  email TEXT PRIMARY KEY,
  name TEXT DEFAULT '',
  biz_name TEXT DEFAULT '',
  role TEXT DEFAULT 'Employee',
  occupation TEXT DEFAULT '',
  speciality TEXT DEFAULT '',
  location TEXT DEFAULT '',
  description TEXT DEFAULT '',
  photo TEXT DEFAULT '',
  logo TEXT DEFAULT '',
  is_verified BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Allow anyone (public/anon) to read profiles so they show up in directories, search, and admin
DROP POLICY IF EXISTS "Allow public read-access to profiles" ON public.profiles;
CREATE POLICY "Allow public read-access to profiles"
ON public.profiles FOR SELECT
USING (true);

-- 4. Policy: Allow inserts and updates
DROP POLICY IF EXISTS "Allow insert/update access to profiles" ON public.profiles;
CREATE POLICY "Allow insert/update access to profiles"
ON public.profiles FOR ALL
USING (true)
WITH CHECK (true);

-- 5. Trigger: Automatically insert into public.profiles whenever a user registers in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    name, 
    biz_name, 
    role, 
    occupation, 
    speciality, 
    location, 
    description,
    is_verified,
    is_admin
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'bizName', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Employee'),
    COALESCE(NEW.raw_user_meta_data->>'occupation', ''),
    COALESCE(NEW.raw_user_meta_data->>'speciality', ''),
    COALESCE(NEW.raw_user_meta_data->>'location', ''),
    COALESCE(NEW.raw_user_meta_data->>'description', ''),
    true,
    (NEW.email = 'adrielaturinda4@gmail.com')
  )
  ON CONFLICT (email) DO UPDATE
  SET
    name = CASE WHEN EXCLUDED.name <> '' THEN EXCLUDED.name ELSE public.profiles.name END,
    biz_name = CASE WHEN EXCLUDED.biz_name <> '' THEN EXCLUDED.biz_name ELSE public.profiles.biz_name END,
    role = EXCLUDED.role,
    occupation = CASE WHEN EXCLUDED.occupation <> '' THEN EXCLUDED.occupation ELSE public.profiles.occupation END,
    speciality = CASE WHEN EXCLUDED.speciality <> '' THEN EXCLUDED.speciality ELSE public.profiles.speciality END,
    location = CASE WHEN EXCLUDED.location <> '' THEN EXCLUDED.location ELSE public.profiles.location END,
    description = CASE WHEN EXCLUDED.description <> '' THEN EXCLUDED.description ELSE public.profiles.description END,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Backfill existing users from auth.users into public.profiles
INSERT INTO public.profiles (
  id, 
  email, 
  name, 
  biz_name, 
  role, 
  occupation, 
  speciality, 
  location, 
  description,
  is_verified,
  is_admin
)
SELECT 
  id,
  email,
  COALESCE(raw_user_meta_data->>'name', ''),
  COALESCE(raw_user_meta_data->>'bizName', ''),
  COALESCE(raw_user_meta_data->>'role', 'Employee'),
  COALESCE(raw_user_meta_data->>'occupation', ''),
  COALESCE(raw_user_meta_data->>'speciality', ''),
  COALESCE(raw_user_meta_data->>'location', ''),
  COALESCE(raw_user_meta_data->>'description', ''),
  true,
  (email = 'adrielaturinda4@gmail.com')
FROM auth.users
ON CONFLICT (email) DO NOTHING;

-- ==============================================================================
-- 7. REAL-TIME MESSAGING: Messages Table & Realtime Replication
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_key TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  receiver_email TEXT NOT NULL,
  text TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for speedy queries on user conversations
CREATE INDEX IF NOT EXISTS idx_messages_conversation_key ON public.messages (conversation_key);
CREATE INDEX IF NOT EXISTS idx_messages_sender_email ON public.messages (sender_email);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_email ON public.messages (receiver_email);

-- Enable Row Level Security (RLS)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow reading messages for conversation participants (or public access for directory messaging)
DROP POLICY IF EXISTS "Allow read access to messages" ON public.messages;
CREATE POLICY "Allow read access to messages"
ON public.messages FOR SELECT
USING (true);

-- Allow inserting messages
DROP POLICY IF EXISTS "Allow insert access to messages" ON public.messages;
CREATE POLICY "Allow insert access to messages"
ON public.messages FOR INSERT
WITH CHECK (true);

-- Allow updating messages (for marking as read)
DROP POLICY IF EXISTS "Allow update access to messages" ON public.messages;
CREATE POLICY "Allow update access to messages"
ON public.messages FOR UPDATE
USING (true);

-- Enable Supabase Realtime broadcast on messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;
