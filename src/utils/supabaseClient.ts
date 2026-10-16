import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve credentials from Vite env or process.env
const getEnvVar = (viteKey: string, procKey: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[viteKey]) {
    return (import.meta.env[viteKey] as string).trim();
  }
  if (typeof process !== 'undefined' && process.env && process.env[procKey]) {
    return (process.env[procKey] as string).trim();
  }
  return '';
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY');

const isPlaceholder = (val: string): boolean => {
  return (
    !val ||
    val.includes('your-project-id') ||
    val.includes('your-anon-public-key') ||
    val.includes('your_supabase_anon_key_here')
  );
};

export const isSupabaseConfigured = (): boolean => {
  return !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnonKey);
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/**
 * Fetch full workspace data from Supabase
 */
export async function fetchWorkspaceFromSupabase(classCode = 'BCA-2028') {
  if (!supabase) return null;

  try {
    const { data: workspace, error: wsErr } = await supabase
      .from('class_workspaces')
      .select('*')
      .eq('code', classCode)
      .maybeSingle();

    if (wsErr || !workspace) {
      console.warn('Workspace query notice:', wsErr?.message);
      return null;
    }

    const classId = workspace.id;

    const [subjectsRes, timetableRes, materialsRes, examsRes] = await Promise.all([
      supabase.from('subjects').select('*').eq('class_id', classId),
      supabase.from('timetable_classes').select('*').eq('class_id', classId),
      supabase.from('academic_materials').select('*').eq('class_id', classId),
      supabase.from('exam_datesheets').select('*').eq('class_id', classId),
    ]);

    return {
      workspace,
      subjects: subjectsRes.data || [],
      timetable: timetableRes.data || [],
      materials: materialsRes.data || [],
      exams: examsRes.data || [],
    };
  } catch (err) {
    console.warn('Failed to fetch from Supabase:', err);
    return null;
  }
}
