const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing env variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('Testing fetch with anon key...');
  const { data, error } = await supabase
      .from('Reminders_Customer')
      .select('contentVN, contentEN')
      .eq('is_active', true);
  
  if (error) {
    console.error('Error fetching:', error);
  } else {
    console.log('Data fetched:', data);
  }
}

test();
