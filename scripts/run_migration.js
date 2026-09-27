import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const runMigration = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB');
    
    const sql = fs.readFileSync(path.join(process.cwd(), 'supabase', 'migrations', '20260815000000_periodontal_measurements.sql'), 'utf8');
    await client.query(sql);
    console.log('Successfully ran migration: 20260815000000_periodontal_measurements.sql');
    
  } catch (e) {
    console.error('Migration failed', e);
  } finally {
    await client.end();
  }
};

runMigration();
