// Quick script to fetch Services from Supabase and output CSV
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data, error } = await supabase
    .from('Services')
    .select('id, code, nameVN, nameEN, duration, category, priceVND, priceUSD, isActive, is_utility')
    .order('category', { ascending: true })
    .order('duration', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Header
  console.log('Mã DV\tTên Tiếng Việt\tTên Tiếng Anh\tDanh mục\tThời lượng (phút)\tGiá VNĐ\tGiá USD\tĐang hoạt động\tLà tiện ích');
  
  // Rows
  for (const s of data) {
    const row = [
      s.id || s.code || '',
      s.nameVN || '',
      s.nameEN || '',
      s.category || '',
      s.duration || '',
      s.priceVND || '',
      s.priceUSD || '',
      s.isActive ? 'Có' : 'Không',
      s.is_utility ? 'Có' : 'Không',
    ].join('\t');
    console.log(row);
  }

  console.error(`\n--- Tổng: ${data.length} dịch vụ ---`);
}

main();
