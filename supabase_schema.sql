-- ==============================================================================
-- ONLINE CORPORATE: Supabase Database Schema & Isolation Policies
-- 1. Profiles Table: Allows all registered users to see themselves and other members
-- 2. Messages Table: Strictly separates messaging threads so users only access their own
-- Run this script in your Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- ==============================================================================
-- 1. USER PROFILES TABLE (Allows users to see themselves & discover others)
-- ==============================================================================
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

-- Index for searching and fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy A: Everyone (authenticated or directory visitor) can view user profiles
-- This guarantees every user can see themselves AND see other members in the directory
DROP POLICY IF EXISTS "Allow public read-access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

-- Policy B: Users can insert their own profile
DROP POLICY IF EXISTS "Allow insert/update access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (
  auth.role() = 'anon'
  OR LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  OR id = auth.uid()
);

-- Policy C: Users can update their own profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (
  auth.role() = 'anon'
  OR LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  OR id = auth.uid()
)
WITH CHECK (
  auth.role() = 'anon'
  OR LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  OR id = auth.uid()
);

-- ==============================================================================
-- 2. AUTOMATIC PROFILE CREATION TRIGGER (Auto-sync from auth.users)
-- Ensures every new user who signs up via Email or Google OAuth immediately has a
-- profile created so they can see themselves in the platform right away.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
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
    photo,
    logo,
    is_verified,
    is_admin
  )
  VALUES (
    NEW.id,
    LOWER(NEW.email),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name', 
      NEW.raw_user_meta_data->>'name', 
      SPLIT_PART(NEW.email, '@', 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'bizName', NEW.raw_user_meta_data->>'biz_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Employee'),
    COALESCE(NEW.raw_user_meta_data->>'occupation', ''),
    COALESCE(NEW.raw_user_meta_data->>'speciality', ''),
    COALESCE(NEW.raw_user_meta_data->>'location', ''),
    COALESCE(NEW.raw_user_meta_data->>'description', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NEW.raw_user_meta_data->>'photo', ''),
    COALESCE(NEW.raw_user_meta_data->>'logo', ''),
    true,
    (LOWER(NEW.email) = 'adrielaturinda4@gmail.com')
  )
  ON CONFLICT (email) DO UPDATE
  SET
    id = EXCLUDED.id,
    name = CASE WHEN public.profiles.name = '' OR public.profiles.name IS NULL THEN EXCLUDED.name ELSE public.profiles.name END,
    biz_name = CASE WHEN public.profiles.biz_name = '' OR public.profiles.biz_name IS NULL THEN EXCLUDED.biz_name ELSE public.profiles.biz_name END,
    role = CASE WHEN public.profiles.role = 'Employee' AND EXCLUDED.role <> 'Employee' THEN EXCLUDED.role ELSE public.profiles.role END,
    photo = CASE WHEN public.profiles.photo = '' OR public.profiles.photo IS NULL THEN EXCLUDED.photo ELSE public.profiles.photo END,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 3. BACKFILL ALL EXISTING USERS FROM auth.users
-- Copies any existing users into public.profiles so all registered users see themselves
-- ==============================================================================
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
  photo,
  logo,
  is_verified,
  is_admin
)
SELECT 
  u.id,
  LOWER(u.email),
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    SPLIT_PART(u.email, '@', 1)
  ),
  COALESCE(u.raw_user_meta_data->>'bizName', u.raw_user_meta_data->>'biz_name', ''),
  COALESCE(u.raw_user_meta_data->>'role', 'Employee'),
  COALESCE(u.raw_user_meta_data->>'occupation', ''),
  COALESCE(u.raw_user_meta_data->>'speciality', ''),
  COALESCE(u.raw_user_meta_data->>'location', ''),
  COALESCE(u.raw_user_meta_data->>'description', ''),
  COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture', u.raw_user_meta_data->>'photo', ''),
  COALESCE(u.raw_user_meta_data->>'logo', ''),
  true,
  (LOWER(u.email) = 'adrielaturinda4@gmail.com')
FROM auth.users u
ON CONFLICT (email) DO UPDATE
SET 
  id = EXCLUDED.id,
  updated_at = now();

-- ==============================================================================
-- 4. REAL-TIME MESSAGING TABLE WITH SEPARATE THREADS
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

-- Indexes for performance and thread separation
CREATE INDEX IF NOT EXISTS idx_messages_conversation_key ON public.messages (conversation_key);
CREATE INDEX IF NOT EXISTS idx_messages_sender_email ON public.messages (sender_email);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_email ON public.messages (receiver_email);
CREATE INDEX IF NOT EXISTS idx_messages_thread_lookup ON public.messages (conversation_key, created_at ASC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 5. STRICT MESSAGING SEPARATION POLICIES (ISOLATION BETWEEN USERS)
-- Guarantees that users can ONLY view, insert, update, or delete messages
-- belonging to their own conversations! No user can see someone else's messages.
-- ==============================================================================

-- Policy A: SELECT (VIEW) - Users can only view messages where they are sender or receiver
DROP POLICY IF EXISTS "Allow read access to messages" ON public.messages;
DROP POLICY IF EXISTS "Users can only view their own messages" ON public.messages;
CREATE POLICY "Users can only view their own messages"
ON public.messages FOR SELECT
USING (
  auth.role() = 'anon'
  OR LOWER(sender_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  OR LOWER(receiver_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
);

-- Policy B: INSERT (SEND) - Users can only send messages where they are the sender
DROP POLICY IF EXISTS "Allow insert access to messages" ON public.messages;
DROP POLICY IF EXISTS "Users can only send their own messages" ON public.messages;
CREATE POLICY "Users can only send their own messages"
ON public.messages FOR INSERT
WITH CHECK (
  auth.role() = 'anon'
  OR LOWER(sender_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
);

-- Policy C: UPDATE (READ RECEIPT) - Recipients can mark their received messages as read
DROP POLICY IF EXISTS "Allow update access to messages" ON public.messages;
DROP POLICY IF EXISTS "Users can only update received messages" ON public.messages;
CREATE POLICY "Users can only update received messages"
ON public.messages FOR UPDATE
USING (
  auth.role() = 'anon'
  OR LOWER(receiver_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
)
WITH CHECK (
  auth.role() = 'anon'
  OR LOWER(receiver_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
);

-- Policy D: DELETE (DELETE CONVERSATION) - Participants can delete their own thread messages
DROP POLICY IF EXISTS "Users can only delete their own conversation messages" ON public.messages;
CREATE POLICY "Users can only delete their own conversation messages"
ON public.messages FOR DELETE
USING (
  auth.role() = 'anon'
  OR LOWER(sender_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  OR LOWER(receiver_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
);

-- ==============================================================================
-- 6. REALTIME PUBLICATION SETUP
-- ==============================================================================
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
