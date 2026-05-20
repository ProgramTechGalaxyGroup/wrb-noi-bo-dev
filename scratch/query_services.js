const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://adzfohfdindovfcpaizb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkemZvaGZkaW5kb3ZmY3BhaXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY3OTgwMCwiZXhwIjoyMDg3MjU1ODAwfQ.wGaNWPGK8fLF5GMzbiGTApVnktdtaegQkquTMOGPyl8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase
    .from('Services')
    .select('id, nameVN, category, priceVND, isActive');

  if (error) {
    console.error('Error fetching services:', error);
    return;
  }

  console.log('--- SERVICES LIST ---');
  data.forEach(s => {
    console.log(`ID: ${s.id} | Name: ${s.nameVN} | Category: ${s.category} | Price: ${s.priceVND} | Active: ${s.isActive}`);
  });
}

main();
