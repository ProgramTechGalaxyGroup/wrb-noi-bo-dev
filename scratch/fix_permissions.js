const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

const databaseUrlReal = process.env.DATABASE_URL;
const sql = postgres(databaseUrlReal, { ssl: { rejectUnauthorized: false } });

async function fixPermissions() {
  try {
    console.log('Granting permissions...');
    await sql`GRANT SELECT ON "Reminders_Customer" TO anon, authenticated;`;
    
    // Also explicitly disable RLS just in case, or add a policy
    // But usually granting is enough if RLS is disabled
    console.log('Permissions granted successfully.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

fixPermissions();
