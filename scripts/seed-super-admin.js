import pkg from 'pg';
const { Client } = pkg;
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';

const seedSuperAdmin = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    const email = 'admin@platform.com';
    const password = 'Password123!';
    const name = 'Platform Admin';

    // Check if exists
    const { rows: existing } = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) {
      console.log('Super Admin already exists. Use email: admin@platform.com');
      return;
    }

    const userId = uuidv4();
    const encryptedPassword = await bcrypt.hash(password, 10);
    
    // In Supabase Auth, you usually need to create the user in auth.users
    // For direct PG connections, manipulating auth.users is complex due to internal triggers and fields.
    // However, if we're just testing local dev, we might need to bypass it or use the JS client.
    // For simplicity, we'll try to insert into users only if there's no FK constraint enforcing auth.users in local dev,
    // BUT the schema says id references auth.users(id).
    
    console.log('NOTE: To properly create a user in Supabase, you should sign up via the frontend or use supabase-js auth.admin.createUser');
    console.log('Please run this node script instead: scripts/seed-super-admin-api.js');
    
  } catch (e) {
    console.error('Failed', e);
  } finally {
    await client.end();
  }
};

seedSuperAdmin();
