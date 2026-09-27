const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const connectionString = 'postgresql://postgres.kmeovexozdilnclrylwf:9zW%3Fvbsgk!V3qtE@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';
  const client = new Client({ connectionString });

  try {
    console.log(`Connecting to ${connectionString.replace(/:[^:]+@/, ':***@')}`);
    await client.connect();
    console.log('Connected!');

    const sql = fs.readFileSync('supabase/seed/jiva_demo_seed.sql', 'utf8');
    await client.query(sql);
    
    console.log('Success!');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
main();
