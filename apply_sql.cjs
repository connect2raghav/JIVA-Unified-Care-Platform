const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const connectionString = 'postgresql://postgres.kmeovexozdilnclrylwf:9zW%3Fvbsgk%21V3qtE@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';
  console.log('Connecting to', connectionString.replace('9zW%3Fvbsgk%21V3qtE', '***'));
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected!');

    const migrations = [
      'supabase/migrations/20260927000000_jiva_platform.sql',
      'supabase/seed/jiva_demo_seed.sql'
    ];

    for (const file of migrations) {
      console.log('Applying', file);
      const sql = fs.readFileSync(file, 'utf8');
      await client.query(sql);
      console.log('Successfully applied', file);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

main();
