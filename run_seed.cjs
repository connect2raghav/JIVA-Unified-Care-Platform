const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const connectionString = 'postgresql://postgres.kmeovexozdilnclrylwf:9zW%3Fvbsgk!V3qtE@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';
  const client = new Client({ connectionString });

  try {
    console.log(`Connecting...`);
    await client.connect();
    console.log('Connected!');

    const sql = fs.readFileSync('C:\\Users\\ragha\\.gemini\\antigravity-ide\\brain\\e6af1009-9ef5-4a10-af82-a90d8de32a2d\\scratch\\seed_visits.sql', 'utf8');
    await client.query(sql);
    console.log('Success!');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}
main();
