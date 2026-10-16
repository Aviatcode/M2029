import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

const isPlaceholder = (val: string): boolean => {
  return (
    !val ||
    val.includes('your-project-id') ||
    val.includes('your-anon-public-key') ||
    val.includes('your-service-role-key') ||
    val.includes('your_supabase_anon_key_here')
  );
};

export const isServerSupabaseConfigured = (): boolean => {
  return !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseKey);
};

export const serverSupabase: SupabaseClient | null = isServerSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    })
  : null;

export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string; details?: any }> {
  if (!serverSupabase) {
    return {
      ok: false,
      message: 'Supabase credentials are not configured or still have placeholder values in .env',
    };
  }

  try {
    const { data, error } = await serverSupabase.from('class_workspaces').select('id, code, name').limit(1);
    if (error) {
      return {
        ok: false,
        message: `Connected to Supabase, but query failed (did you run supabase/schema.sql?): ${error.message}`,
        details: error,
      };
    }
    return {
      ok: true,
      message: 'Successfully connected to Supabase PostgreSQL database!',
      details: data,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `Failed to connect to Supabase: ${err.message}`,
      details: err,
    };
  }
}
