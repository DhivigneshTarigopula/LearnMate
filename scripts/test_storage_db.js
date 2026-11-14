import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dcumtdpvzsjhjohmpyre.supabase.co';
const anonKey = 'sb_publishable_EuZGGK-SRgPW-QDedg0svQ_Psg-QhLn';

const supabase = createClient(supabaseUrl, anonKey);

async function testStorage() {
  console.log('Testing Supabase Storage buckets listing...');
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) {
    console.log('Bucket list error:', bErr.message);
  } else {
    console.log('Found buckets:', (buckets || []).map(b => b.name));
  }

  console.log('Testing generated_quizzes table...');
  const { data: quizzes, error: qErr } = await supabase.from('generated_quizzes').select('*').limit(1);
  if (qErr) {
    console.log('generated_quizzes table error:', qErr.message);
  } else {
    console.log('generated_quizzes table accessible! Rows:', quizzes.length);
  }

  console.log('Testing quiz_attempts table...');
  const { data: attempts, error: aErr } = await supabase.from('quiz_attempts').select('*').limit(1);
  if (aErr) {
    console.log('quiz_attempts table error:', aErr.message);
  } else {
    console.log('quiz_attempts table accessible! Rows:', attempts.length);
  }
}

testStorage().catch(console.error);
