/**
 * Supabase client configuration
 * Uses service role key for backend admin access
 */

import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Supabase Admin Client - Uses service role key for full access
 * This client bypasses Row Level Security (RLS) policies and has full admin access
 * 
 * Use this for:
 * - Backend operations that need to bypass RLS
 * - Admin operations
 * - Server-side data processing
 * - File storage operations
 */
export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Supabase Client - Uses anon key for public access
 * This client respects Row Level Security (RLS) policies
 * 
 * Use this for:
 * - Operations that should respect RLS
 * - User-level operations
 * - Public data access
 */
export const supabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  }
);

/**
 * Get Supabase Storage URL for a file
 * @param bucket Bucket name
 * @param path File path within bucket
 * @returns Public URL for the file
 */
export function getSupabaseStorageUrl(bucket: string, path: string): string {
  const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Supabase Storage bucket name for application files
 */
export const SUPABASE_BUCKET = 'bizwiz-neuroboard';
