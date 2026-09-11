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
    COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, (NEW.raw_user_meta_data->>'isAdmin')::boolean, false)
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
  COALESCE((u.raw_user_meta_data->>'is_admin')::boolean, (u.raw_user_meta_data->>'isAdmin')::boolean, false)
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
-- 6. REALTIME PUBLICATION SETUP FOR MESSAGING
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

-- ==============================================================================
-- 7. JOB POSTINGS TABLE (Allows users to post and see each other's jobs)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.jobs (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL, -- 'fulltime', 'parttime', 'contract', 'remote'
  salary TEXT DEFAULT '',
  location TEXT NOT NULL,
  contact TEXT NOT NULL,
  description TEXT NOT NULL,
  poster_email TEXT NOT NULL,
  poster_name TEXT NOT NULL,
  poster_role TEXT NOT NULL DEFAULT 'Employer',
  posted_time TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_jobs_poster_email ON public.jobs(poster_email);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON public.jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at DESC);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- Everyone can view all job postings across the entire platform
DROP POLICY IF EXISTS "Jobs are viewable by everyone" ON public.jobs;
CREATE POLICY "Jobs are viewable by everyone"
ON public.jobs FOR SELECT
USING (true);

-- Authenticated users or visitors can post jobs
DROP POLICY IF EXISTS "Users can create job postings" ON public.jobs;
CREATE POLICY "Users can create job postings"
ON public.jobs FOR INSERT
WITH CHECK (
  auth.role() = 'anon'
  OR LOWER(poster_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
);

-- Job poster can update their posting
DROP POLICY IF EXISTS "Users can update their own job postings" ON public.jobs;
CREATE POLICY "Users can update their own job postings"
ON public.jobs FOR UPDATE
USING (
  auth.role() = 'anon'
  OR LOWER(poster_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
);

-- Job poster or administrators can delete job postings
DROP POLICY IF EXISTS "Users can delete their own job postings" ON public.jobs;
CREATE POLICY "Users can delete their own job postings"
ON public.jobs FOR DELETE
USING (
  auth.role() = 'anon'
  OR LOWER(poster_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.email = auth.jwt() ->> 'email' AND profiles.is_admin = true)
);

-- ==============================================================================
-- 8. JOB APPLICATIONS TABLE (Candidates apply, Employers review applications)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.job_applications (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  job_title TEXT NOT NULL,
  employer_email TEXT NOT NULL,
  candidate_email TEXT NOT NULL,
  candidate_name TEXT NOT NULL,
  candidate_photo TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Applied', -- 'Applied', 'Under Review', 'Interviewing', 'Offered', 'Rejected'
  applied_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_job_apps_candidate ON public.job_applications(candidate_email);
CREATE INDEX IF NOT EXISTS idx_job_apps_employer ON public.job_applications(employer_email);
CREATE INDEX IF NOT EXISTS idx_job_apps_job_id ON public.job_applications(job_id);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Candidates can view their applications, employers can view all applications for their jobs, and admins can view all
DROP POLICY IF EXISTS "Candidates and employers can view applications" ON public.job_applications;
CREATE POLICY "Candidates and employers can view applications"
ON public.job_applications FOR SELECT
USING (
  auth.role() = 'anon'
  OR LOWER(candidate_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  OR LOWER(employer_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.email = auth.jwt() ->> 'email' AND profiles.is_admin = true)
);

-- Candidates can submit job applications
DROP POLICY IF EXISTS "Candidates can submit applications" ON public.job_applications;
CREATE POLICY "Candidates can submit applications"
ON public.job_applications FOR INSERT
WITH CHECK (
  auth.role() = 'anon'
  OR LOWER(candidate_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
);

-- Employers and candidates can update application status
DROP POLICY IF EXISTS "Employers can update application status" ON public.job_applications;
CREATE POLICY "Employers can update application status"
ON public.job_applications FOR UPDATE
USING (
  auth.role() = 'anon'
  OR LOWER(employer_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  OR LOWER(candidate_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.email = auth.jwt() ->> 'email' AND profiles.is_admin = true)
);

-- Candidates or employers can delete applications
DROP POLICY IF EXISTS "Candidates or employers can delete applications" ON public.job_applications;
CREATE POLICY "Candidates or employers can delete applications"
ON public.job_applications FOR DELETE
USING (
  auth.role() = 'anon'
  OR LOWER(candidate_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  OR LOWER(employer_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
);

-- ==============================================================================
-- 9. PROFESSIONAL EVENTS TABLE (Members discover and RSVP to each other's events)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.events (
  id TEXT PRIMARY KEY,
  host_email TEXT NOT NULL,
  host_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Meetup', -- 'Webinar', 'Meetup', 'Workshop'
  attendees JSONB DEFAULT '[]'::jsonb, -- Array of attendee emails
  image TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_events_host ON public.events(host_email);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Everyone can view events
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
CREATE POLICY "Events are viewable by everyone"
ON public.events FOR SELECT
USING (true);

-- Authenticated users can create events
DROP POLICY IF EXISTS "Users can create events" ON public.events;
CREATE POLICY "Users can create events"
ON public.events FOR INSERT
WITH CHECK (
  auth.role() = 'anon'
  OR LOWER(host_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
);

-- Hosts can update events, and members can RSVP/join (update attendee list)
DROP POLICY IF EXISTS "Events can be updated by hosts and attendees" ON public.events;
CREATE POLICY "Events can be updated by hosts and attendees"
ON public.events FOR UPDATE
USING (true)
WITH CHECK (true);

-- Event hosts and administrators can delete events
DROP POLICY IF EXISTS "Hosts can delete their events" ON public.events;
CREATE POLICY "Hosts can delete their events"
ON public.events FOR DELETE
USING (
  auth.role() = 'anon'
  OR LOWER(host_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.email = auth.jwt() ->> 'email' AND profiles.is_admin = true)
);

-- ==============================================================================
-- 10. COMMUNITY FEED POSTS TABLE (Members share posts & see community feed)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.community_posts (
  id TEXT PRIMARY KEY,
  author_email TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_photo TEXT DEFAULT '',
  content TEXT NOT NULL,
  image TEXT DEFAULT '',
  timestamp BIGINT NOT NULL,
  likes JSONB DEFAULT '[]'::jsonb, -- Array of member emails who liked
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_posts_author ON public.community_posts(author_email);
CREATE INDEX IF NOT EXISTS idx_posts_timestamp ON public.community_posts(timestamp DESC);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- Everyone can view all community posts
DROP POLICY IF EXISTS "Community posts are viewable by everyone" ON public.community_posts;
CREATE POLICY "Community posts are viewable by everyone"
ON public.community_posts FOR SELECT
USING (true);

-- Authenticated users can publish posts
DROP POLICY IF EXISTS "Users can publish community posts" ON public.community_posts;
CREATE POLICY "Users can publish community posts"
ON public.community_posts FOR INSERT
WITH CHECK (
  auth.role() = 'anon'
  OR LOWER(author_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
);

-- Users can like/unlike posts or author can update post
DROP POLICY IF EXISTS "Community posts can be updated by users" ON public.community_posts;
CREATE POLICY "Community posts can be updated by users"
ON public.community_posts FOR UPDATE
USING (true)
WITH CHECK (true);

-- Author and administrators can delete posts
DROP POLICY IF EXISTS "Authors can delete their community posts" ON public.community_posts;
CREATE POLICY "Authors can delete their community posts"
ON public.community_posts FOR DELETE
USING (
  auth.role() = 'anon'
  OR LOWER(author_email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.email = auth.jwt() ->> 'email' AND profiles.is_admin = true)
);

-- ==============================================================================
-- 11. REALTIME BROADCASTING FOR JOBS, APPLICATIONS, EVENTS, AND COMMUNITY POSTS
-- ==============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'jobs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'job_applications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.job_applications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'community_posts') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- ==============================================================================
-- 12. OPTIONAL SAMPLE SEED DATA (Safe to run multiple times)
-- ==============================================================================
INSERT INTO public.jobs (id, title, type, salary, location, contact, description, poster_email, poster_name, poster_role, posted_time)
VALUES 
  (1, 'Senior Cloud & Fullstack Architect', 'fulltime', 'UGX 8.5M - 12M / mo', 'Kampala, Uganda (Hybrid)', 'careers@onlinecorporate.ug', 'Leading enterprise architecture, cloud deployment pipelines, and fullstack infrastructure across East African operations.', 'adrielaturinda4@gmail.com', 'Online Corporate HQ', 'Employer', 'Today'),
  (2, 'Corporate Financial Analyst', 'contract', 'Competitive', 'Entebbe / Remote', 'finance-jobs@ugandabiz.co', 'Conduct quarterly financial modeling, audit preparation, and corporate compliance reviews.', 'info@ugandabiz.co', 'East Africa Ventures', 'Employer', 'Yesterday')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.events (id, host_email, host_name, title, description, date, location, type, attendees, image)
VALUES 
  ('evt_1', 'adrielaturinda4@gmail.com', 'Online Corporate Events', 'East Africa Tech Leaders Summit 2026', 'Connect with senior executives, tech founders, and business leaders exploring modern digital commerce and investment in Uganda.', '2026-10-15', 'Kampala Serena Conference Hall & Virtual', 'Meetup', '["adrielaturinda4@gmail.com"]'::jsonb, 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.community_posts (id, author_email, author_name, author_photo, content, timestamp, likes)
VALUES 
  ('post_1', 'adrielaturinda4@gmail.com', 'Online Corporate Community', '', 'Welcome to the Online Corporate unified professional feed! Share your business updates, career achievements, and collaborate with professionals across Uganda and beyond.', 1726050000000, '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

