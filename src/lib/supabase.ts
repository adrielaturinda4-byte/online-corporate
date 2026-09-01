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
          ...metadata,
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

    // Try upserting to public profiles table
    try {
      await supabase.from('profiles').upsert({
        email: user.email.trim().toLowerCase(),
        name: user.name,
        biz_name: user.bizName,
        role: user.role,
        occupation: user.occupation,
        location: user.location,
        description: user.description,
        is_verified: user.isVerified,
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' });
    } catch (_) {}

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message };
  }
}
