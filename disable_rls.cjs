const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const connectionString = 'postgresql://postgres.kmeovexozdilnclrylwf:9zW%3Fvbsgk!V3qtE@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';
  const client = new Client({ connectionString });

  try {
    console.log(`Connecting to ${connectionString.replace(/:[^:]+@/, ':***@')}`);
    await client.connect();
    console.log('Connected!');

    const migrations = [
      'supabase/migrations/20260927000001_disable_rls.sql'
    ];

    for (const file of migrations) {
      console.log(`Applying ${file}`);
      const sql = fs.readFileSync(file, 'utf8');
      await client.query(sql);
    }
    console.log('Success!');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
main();
