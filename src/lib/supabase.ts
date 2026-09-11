import { createClient, User as SupabaseUser } from '@supabase/supabase-js';
import { User, Job, JobApplication, ApplicationStatus, ProfessionalEvent, CommunityPost } from '../types';

// Supabase configuration for Online Corporate
export const SUPABASE_PROJECT_NAME = "Online corporate";
export const SUPABASE_PROJECT_ID = "izlzhgktmsmxuaglriiw";
export const SUPABASE_URL = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) 
  || (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL)
  || "https://izlzhgktmsmxuaglriiw.supabase.co";

export const SUPABASE_ANON_KEY = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY)
  || (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY)
  || "sb_publishable_sT-g5L82df8SnBZ-qprpag_R49es1K1";

// Initialize the Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
});

/**
 * Test the live Supabase connection
 */
export async function testSupabaseConnection(): Promise<{ connected: boolean; message: string; details?: any }> {
  try {
    const startTime = Date.now();
    const { error } = await supabase.auth.getSession();
    const latency = Date.now() - startTime;

    if (error) {
      return {
        connected: false,
        message: `Supabase Error: ${error.message}`,
        details: { latency, error },
      };
    }

    return {
      connected: true,
      message: `Successfully connected to Supabase project "${SUPABASE_PROJECT_NAME}" (${latency}ms)!`,
      details: { latency },
    };
  } catch (err: any) {
    return {
      connected: false,
      message: `Failed to reach Supabase: ${err?.message || 'Network error'}`,
      details: err,
    };
  }
}

/**
 * Sign up a new user in Supabase Auth
 * Registers the user in auth.users table (visible in Supabase Auth dashboard)
 */
export async function signUpWithSupabase(
  email: string, 
  password: string, 
  metadata?: Record<string, any>
): Promise<{ success: boolean; error?: string; user?: SupabaseUser | null; session?: any; needsEmailConfirm?: boolean }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: password,
      options: {
        data: metadata || {},
      },
    });

    if (error) {
      return { success: false, error: error.message, user: null };
    }

    const needsEmailConfirm = Boolean(data.user && !data.session);

    // Also attempt to upsert to a public profiles table if available
    if (data.user) {
      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: cleanEmail,
          name: metadata?.name || '',
          biz_name: metadata?.bizName || '',
          role: metadata?.role || 'Employee',
          occupation: metadata?.occupation || '',
          speciality: metadata?.speciality || '',
          location: metadata?.location || '',
          description: metadata?.description || '',
          is_verified: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' });
      } catch (profileErr) {
        // Non-blocking
      }
    }

    return { 
      success: true, 
      user: data.user, 
      session: data.session, 
      needsEmailConfirm 
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to communicate with Supabase', user: null };
  }
}

/**
 * Sign in existing user with Supabase Auth
 */
export async function signInWithSupabase(
  email: string, 
  password: string
): Promise<{ success: boolean; error?: string; user?: SupabaseUser | null; session?: any }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password,
    });

    if (error) {
      return { success: false, error: error.message, user: null };
    }

    return { success: true, user: data.user, session: data.session };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Network error signing in to Supabase', user: null };
  }
}

/**
 * Sign in / Sign up with Google via Supabase OAuth
 */
export async function signInWithGoogle(): Promise<{ success: boolean; error?: string; url?: string }> {
  try {
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}` : '';
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.url) {
      window.location.href = data.url;
    }

    return { success: true, url: data?.url };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to initialize Google Sign In' };
  }
}

/**
 * Sign out from Supabase Auth
 */
export async function signOutFromSupabase(): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Send password reset email via Supabase Auth
 */
export async function resetPasswordForEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}` : '';
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send password reset request' };
  }
}

/**
 * Update authenticated user's password in Supabase Auth
 */
export async function updateUserPassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update password' };
  }
}

/**
 * Fetch all registered user profiles from the Supabase public.profiles table
 */
export async function fetchProfilesFromSupabase(): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');

    if (error || !data) {
      return [];
    }

    return data.map((row: any) => ({
      email: (row.email || '').trim().toLowerCase(),
      name: row.name || '',
      bizName: row.biz_name || row.bizName || '',
      role: row.role || 'Employee',
      occupation: row.occupation || '',
      speciality: row.speciality || '',
      location: row.location || '',
      description: row.description || '',
      photo: row.photo || '',
      logo: row.logo || '',
      isVerified: row.is_verified ?? row.isVerified ?? false,
      isAdmin: Boolean(row.is_admin ?? row.isAdmin ?? false),
    }));
  } catch (err) {
    return [];
  }
}

/**
 * Save / Upsert a user profile into the Supabase public.profiles table
 */
export async function upsertProfileToSupabase(user: User): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanEmail = user.email.trim().toLowerCase();
    const { error } = await supabase.from('profiles').upsert({
      email: cleanEmail,
      name: user.name || '',
      biz_name: user.bizName || '',
      role: user.role || 'Employee',
      occupation: user.occupation || '',
      speciality: user.speciality || '',
      location: user.location || '',
      description: user.description || '',
      photo: user.photo || '',
      logo: user.logo || '',
      is_verified: user.isVerified || false,
      is_admin: Boolean(user.isAdmin),
      updated_at: new Date().toISOString()
    }, { onConflict: 'email' });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Update user metadata in Supabase
 */
export async function updateUserMetadataInSupabase(user: User): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.updateUser({
      data: {
        name: user.name || '',
        bizName: user.bizName || '',
        role: user.role || '',
        occupation: user.occupation || '',
        speciality: user.speciality || '',
        location: user.location || '',
        description: user.description || '',
        isVerified: user.isVerified || false,
      }
    });

    if (error) {
      console.warn('Supabase metadata update note:', error.message);
    }

    // Also upsert to public profiles table
    await upsertProfileToSupabase(user);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Fetch all messages for a given user from Supabase
 */
export async function fetchMessagesFromSupabase(userEmail: string): Promise<Record<string, Array<{ from: string; text: string; time: number; read: boolean }>>> {
  try {
    const cleanEmail = userEmail.trim().toLowerCase();
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_email.eq.${cleanEmail},receiver_email.eq.${cleanEmail}`)
      .order('created_at', { ascending: true });

    if (error || !data) {
      return {};
    }

    const grouped: Record<string, Array<{ from: string; text: string; time: number; read: boolean }>> = {};
    for (const row of data) {
      const sender = (row.sender_email || '').trim().toLowerCase();
      const receiver = (row.receiver_email || '').trim().toLowerCase();
      const key = [sender, receiver].sort().join('::');
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        from: sender,
        text: row.text || '',
        time: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
        read: Boolean(row.read)
      });
    }

    return grouped;
  } catch (err) {
    return {};
  }
}

/**
 * Send a message to Supabase
 */
export async function sendMessageToSupabase(fromEmail: string, toEmail: string, text: string): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const cleanFrom = fromEmail.trim().toLowerCase();
    const cleanTo = toEmail.trim().toLowerCase();
    const key = [cleanFrom, cleanTo].sort().join('::');

    const { data, error } = await supabase
      .from('messages')
      .insert([
        {
          conversation_key: key,
          sender_email: cleanFrom,
          receiver_email: cleanTo,
          text,
          read: false,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data?.[0] };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

/**
 * Mark messages in a thread as read in Supabase
 */
export async function markMessagesAsReadInSupabase(myEmail: string, otherEmail: string): Promise<void> {
  try {
    const cleanMy = myEmail.trim().toLowerCase();
    const cleanOther = otherEmail.trim().toLowerCase();
    await supabase
      .from('messages')
      .update({ read: true })
      .match({
        receiver_email: cleanMy,
        sender_email: cleanOther,
        read: false
      });
  } catch (_) {}
}

/**
 * Delete a conversation between two users in Supabase
 */
export async function deleteConversationFromSupabase(myEmail: string, otherEmailOrKey: string): Promise<boolean> {
  try {
    const cleanMy = myEmail.trim().toLowerCase();
    const cleanTarget = otherEmailOrKey.trim().toLowerCase();
    const key = [cleanMy, cleanTarget].sort().join('::');
    
    await supabase
      .from('messages')
      .delete()
      .or(`conversation_key.eq.${key},conversation_key.eq.${cleanTarget},and(sender_email.eq.${cleanMy},receiver_email.eq.${cleanTarget}),and(sender_email.eq.${cleanTarget},receiver_email.eq.${cleanMy})`);
      
    return true;
  } catch (err) {
    console.warn('Could not delete conversation from Supabase:', err);
    return false;
  }
}

/**
 * Realtime subscription to new messages for a user
 */
export function subscribeToMessages(userEmail: string, onNewMessage: (msg: any) => void) {
  const cleanEmail = userEmail.trim().toLowerCase();
  const channelName = `user_chat_${cleanEmail}_${Date.now()}`;
  
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      },
      (payload) => {
        const newRecord = payload.new;
        if (newRecord) {
          const sender = (newRecord.sender_email || '').trim().toLowerCase();
          const receiver = (newRecord.receiver_email || '').trim().toLowerCase();
          if (sender === cleanEmail || receiver === cleanEmail) {
            onNewMessage(newRecord);
          }
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages'
      },
      (payload) => {
        const updatedRecord = payload.new;
        if (updatedRecord) {
          const sender = (updatedRecord.sender_email || '').trim().toLowerCase();
          const receiver = (updatedRecord.receiver_email || '').trim().toLowerCase();
          if (sender === cleanEmail || receiver === cleanEmail) {
            onNewMessage(updatedRecord);
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// ==============================================================================
// JOBS SUPABASE INTEGRATION
// ==============================================================================

export async function fetchJobsFromSupabase(): Promise<Job[]> {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(row => ({
      id: Number(row.id),
      title: row.title || '',
      type: (row.type as any) || 'fulltime',
      salary: row.salary || '',
      location: row.location || '',
      contact: row.contact || '',
      desc: row.description || '',
      posterEmail: (row.poster_email || '').trim().toLowerCase(),
      posterName: row.poster_name || '',
      posterRole: row.poster_role || 'Employer',
      time: row.posted_time || (row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Recently')
    }));
  } catch (err) {
    return [];
  }
}

export async function createJobInSupabase(job: Omit<Job, 'id'> | Job): Promise<{ success: boolean; data?: Job; error?: string }> {
  try {
    const cleanPoster = job.posterEmail.trim().toLowerCase();
    const { data, error } = await supabase
      .from('jobs')
      .insert([{
        title: job.title,
        type: job.type,
        salary: job.salary || '',
        location: job.location,
        contact: job.contact,
        description: job.desc,
        poster_email: cleanPoster,
        poster_name: job.posterName,
        poster_role: job.posterRole || 'Employer',
        posted_time: job.time || new Date().toLocaleDateString()
      }])
      .select();

    if (error) return { success: false, error: error.message };
    const row = data?.[0];
    if (!row) return { success: true };
    return {
      success: true,
      data: {
        id: Number(row.id),
        title: row.title,
        type: row.type,
        salary: row.salary,
        location: row.location,
        contact: row.contact,
        desc: row.description,
        posterEmail: row.poster_email,
        posterName: row.poster_name,
        posterRole: row.poster_role,
        time: row.posted_time
      }
    };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function deleteJobFromSupabase(jobId: number): Promise<boolean> {
  try {
    const { error } = await supabase.from('jobs').delete().eq('id', jobId);
    return !error;
  } catch {
    return false;
  }
}

// ==============================================================================
// JOB APPLICATIONS SUPABASE INTEGRATION
// ==============================================================================

export async function fetchApplicationsFromSupabase(userEmail?: string): Promise<JobApplication[]> {
  try {
    let query = supabase.from('job_applications').select('*');
    if (userEmail) {
      const cleanEmail = userEmail.trim().toLowerCase();
      query = query.or(`candidate_email.eq.${cleanEmail},employer_email.eq.${cleanEmail}`);
    }
    const { data, error } = await query.order('applied_at', { ascending: false });
    if (error || !data) return [];
    return data.map(row => ({
      id: String(row.id),
      jobId: String(row.job_id),
      jobTitle: row.job_title || '',
      employerEmail: (row.employer_email || '').trim().toLowerCase(),
      candidateEmail: (row.candidate_email || '').trim().toLowerCase(),
      candidateName: row.candidate_name || '',
      candidatePhoto: row.candidate_photo || '',
      status: (row.status as ApplicationStatus) || 'Applied',
      appliedAt: Number(row.applied_at) || (row.created_at ? new Date(row.created_at).getTime() : Date.now()),
      updatedAt: Number(row.updated_at) || Date.now()
    }));
  } catch {
    return [];
  }
}

export async function createApplicationInSupabase(app: JobApplication): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('job_applications').upsert({
      id: app.id,
      job_id: app.jobId,
      job_title: app.jobTitle,
      employer_email: app.employerEmail.trim().toLowerCase(),
      candidate_email: app.candidateEmail.trim().toLowerCase(),
      candidate_name: app.candidateName,
      candidate_photo: app.candidatePhoto || '',
      status: app.status,
      applied_at: app.appliedAt,
      updated_at: app.updatedAt
    }, { onConflict: 'id' });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function updateApplicationStatusInSupabase(appId: string, status: ApplicationStatus): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('job_applications')
      .update({ status, updated_at: Date.now() })
      .eq('id', appId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

// ==============================================================================
// EVENTS SUPABASE INTEGRATION
// ==============================================================================

export async function fetchEventsFromSupabase(): Promise<ProfessionalEvent[]> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(row => ({
      id: String(row.id),
      hostEmail: (row.host_email || '').trim().toLowerCase(),
      hostName: row.host_name || '',
      title: row.title || '',
      description: row.description || '',
      date: row.date || '',
      location: row.location || '',
      type: (row.type as any) || 'Meetup',
      attendees: Array.isArray(row.attendees) ? row.attendees : [],
      image: row.image || ''
    }));
  } catch {
    return [];
  }
}

export async function createEventInSupabase(event: ProfessionalEvent): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('events').upsert({
      id: event.id,
      host_email: event.hostEmail.trim().toLowerCase(),
      host_name: event.hostName,
      title: event.title,
      description: event.description,
      date: event.date,
      location: event.location,
      type: event.type,
      attendees: event.attendees || [],
      image: event.image || ''
    }, { onConflict: 'id' });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function updateEventAttendeesInSupabase(eventId: string, attendees: string[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('events')
      .update({ attendees })
      .eq('id', eventId);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteEventFromSupabase(eventId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    return !error;
  } catch {
    return false;
  }
}

// ==============================================================================
// COMMUNITY FEED POSTS SUPABASE INTEGRATION
// ==============================================================================

export async function fetchCommunityPostsFromSupabase(): Promise<CommunityPost[]> {
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error || !data) return [];
    return data.map(row => ({
      id: String(row.id),
      authorEmail: (row.author_email || '').trim().toLowerCase(),
      authorName: row.author_name || '',
      authorPhoto: row.author_photo || '',
      content: row.content || '',
      image: row.image || '',
      timestamp: Number(row.timestamp) || (row.created_at ? new Date(row.created_at).getTime() : Date.now()),
      likes: Array.isArray(row.likes) ? row.likes : []
    }));
  } catch {
    return [];
  }
}

export async function createCommunityPostInSupabase(post: CommunityPost): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('community_posts').upsert({
      id: post.id,
      author_email: post.authorEmail.trim().toLowerCase(),
      author_name: post.authorName,
      author_photo: post.authorPhoto || '',
      content: post.content,
      image: post.image || '',
      timestamp: post.timestamp,
      likes: post.likes || []
    }, { onConflict: 'id' });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}

export async function updateCommunityPostLikesInSupabase(postId: string, likes: string[]): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('community_posts')
      .update({ likes })
      .eq('id', postId);
    return !error;
  } catch {
    return false;
  }
}

export async function deleteCommunityPostFromSupabase(postId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('community_posts').delete().eq('id', postId);
    return !error;
  } catch {
    return false;
  }
}
