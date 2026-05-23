const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

const databaseUrlReal = process.env.DATABASE_URL;
const sql = postgres(databaseUrlReal, { ssl: { rejectUnauthorized: false } });

async function fix() {
  try {
    console.log('Fixing RLS and reloading schema cache...');
    
    // Make sure RLS is disabled
    await sql`ALTER TABLE "Reminders_Customer" DISABLE ROW LEVEL SECURITY;`;
    
    // Notify PostgREST to reload the schema cache
    await sql`NOTIFY pgrst, 'reload schema';`;
    
    console.log('Fixed successfully.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

fix();
