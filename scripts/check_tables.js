import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dcumtdpvzsjhjohmpyre.supabase.co';
const anonKey = 'sb_publishable_EuZGGK-SRgPW-QDedg0svQ_Psg-QhLn';
const supabase = createClient(supabaseUrl, anonKey);

async function checkAll() {
  const tables = ['profiles', 'timetable', 'assignments', 'notes', 'exams', 'study_sessions', 'quizzes', 'ai_conversations', 'ai_messages', 'note_folders', 'note_files'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    console.log(t, error ? 'ERROR: ' + error.message : 'OK (' + (data?.length || 0) + ' rows)');
  }
}
checkAll().catch(console.error);
