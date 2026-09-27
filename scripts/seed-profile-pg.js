import pkg from 'pg';
const { Client } = pkg;
import 'dotenv/config';

const seedProfile = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Insert into public.users bypassing RLS
    await client.query(`
      INSERT INTO public.users (id, email, name, role_id, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET role = $5, role_id = $4
    `, [
      'e7b34884-565d-4a4a-9a1b-204a2fba744c',
      'superadmin@gmail.com',
      'Platform Admin',
      '00000000-0000-0000-0000-000000000006',
      'Super Admin',
      true
    ]);
    
    console.log('Successfully seeded superadmin profile!');
  } catch (e) {
    console.error('Failed to seed profile:', e);
  } finally {
    await client.end();
  }
};

seedProfile();
