import { createClient, User as SupabaseUser } from '@supabase/supabase-js';
import { User } from '../types';

// Supabase configuration for Online Corporate
export const SUPABASE_PROJECT_NAME = "Online corporate";
export const SUPABASE_PROJECT_ID = "fkmuaxvpxmfoeprorpxl";
export const SUPABASE_URL = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) 
  || (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL)
  || "https://fkmuaxvpxmfoeprorpxl.supabase.co";

export const SUPABASE_ANON_KEY = (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY)
  || (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY)
  || "sb_publishable_Zm-dW7k81oosJ1pUTQm7yQ_TBBuQEpS";

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
      isAdmin: (row.email || '').trim().toLowerCase() === 'adrielaturinda4@gmail.com',
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
      is_admin: cleanEmail === 'adrielaturinda4@gmail.com',
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
