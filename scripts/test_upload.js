import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dcumtdpvzsjhjohmpyre.supabase.co';
const anonKey = 'sb_publishable_EuZGGK-SRgPW-QDedg0svQ_Psg-QhLn';
const supabase = createClient(supabaseUrl, anonKey);

async function testUpload() {
  const content = 'Test PDF file content';
  const blob = new Blob([content], { type: 'application/pdf' });
  const { data, error } = await supabase.storage.from('smart_notes').upload('test.pdf', blob, { upsert: true });
  console.log('Upload result:', data, error ? 'ERROR: ' + error.message : 'SUCCESS');
}
testUpload().catch(console.error);
