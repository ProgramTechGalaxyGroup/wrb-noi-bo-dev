// Script: Xuất file TSV cho Google Sheets
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data, error } = await supabase
    .from('Services')
    .select('id, nameVN, nameEN, duration, category, priceVND, isActive, is_utility')
    .eq('isActive', true)
    .order('category', { ascending: true })
    .order('nameVN', { ascending: true })
    .order('duration', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Group by category+nameVN to find min duration
  const grouped = {};
  for (const s of data) {
    const key = `${s.category}|||${s.nameVN}`;
    if (!grouped[key]) {
      grouped[key] = {
        nameVN: s.nameVN,
        nameEN: s.nameEN,
        category: s.category,
        minDuration: s.duration || 0,
        minPrice: s.priceVND,
        is_utility: s.is_utility,
        allDurations: [],
      };
    }
    if (s.duration) {
      grouped[key].allDurations.push(s.duration);
      if (s.duration < grouped[key].minDuration || grouped[key].minDuration === 0) {
        grouped[key].minDuration = s.duration;
        grouped[key].minPrice = s.priceVND;
      }
    }
  }

  // Build TSV content
  const lines = [];
  lines.push('Danh mục\tTên dịch vụ (VN)\tTên dịch vụ (EN)\tThời lượng nhỏ nhất (phút)\tGiá tại mốc nhỏ nhất (VNĐ)\tTất cả mốc thời gian\tLà tiện ích');
  
  for (const item of Object.values(grouped)) {
    lines.push([
      item.category,
      item.nameVN,
      item.nameEN,
      item.minDuration || 'N/A',
      item.minPrice || 'N/A',
      item.allDurations.join(', ') || 'N/A',
      item.is_utility ? 'Có' : '',
    ].join('\t'));
  }

  const outputPath = path.join(__dirname, 'services_for_sheets.tsv');
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf8');
  console.log(`File saved: ${outputPath}`);
  console.log(`Total: ${Object.keys(grouped).length} services (grouped)`);
}

main();
