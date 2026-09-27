const { Client } = require('pg');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;

async function seedDemoUsers() {
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    const demoAccounts = [
      { id: '10000000-0000-0000-0000-000000000001', email: 'dentist@demo.com', name: 'Dr. Prasad Patil (Demo)', roleId: '00000000-0000-0000-0000-000000000003', roleName: 'Dentist' },
      { id: '10000000-0000-0000-0000-000000000002', email: 'assistant@demo.com', name: 'Pooja Kulkarni (Demo)', roleId: '00000000-0000-0000-0000-000000000005', roleName: 'Dental Assistant' },
      { id: '10000000-0000-0000-0000-000000000003', email: 'receptionist@demo.com', name: 'Rohit Deshmukh (Demo)', roleId: '00000000-0000-0000-0000-000000000004', roleName: 'Receptionist' },
      { id: '10000000-0000-0000-0000-000000000004', email: 'superadmin@demo.com', name: 'Platform Super Admin (Demo)', roleId: '00000000-0000-0000-0000-000000000006', roleName: 'Super Admin' },
      { id: '10000000-0000-0000-0000-000000000005', email: 'otherdentist@demo.com', name: 'Dr. Ananya Mehta (Demo)', roleId: '00000000-0000-0000-0000-000000000003', roleName: 'Other Dentist' }
    ];

    const password = 'Demo@123';
    
    for (const acc of demoAccounts) {
      // 1. Insert into auth.users
      await client.query(`
        INSERT INTO auth.users (
          id, instance_id, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, aud, role,
          created_at, updated_at
        ) VALUES (
          $1, '00000000-0000-0000-0000-000000000000', $2, crypt($3, gen_salt('bf', 10)), NOW(),
          '{"provider":"email","providers":["email"]}', $4, 'authenticated', 'authenticated',
          NOW(), NOW()
        ) ON CONFLICT (id) DO NOTHING;
      `, [acc.id, acc.email, password, JSON.stringify({ name: acc.name })]);

      // 2. Insert into public.users
      await client.query(`
        INSERT INTO public.users (
          id, clinic_id, email, name, role_id, role, is_active, is_locked, created_at, updated_at
        ) VALUES (
          $1, '00000000-0000-0000-0000-000000000001', $2, $3, $4, $5, true, false, NOW(), NOW()
        ) ON CONFLICT (id) DO NOTHING;
      `, [acc.id, acc.email, acc.name, acc.roleId, acc.roleName]);

      console.log(`Demo account created: ${acc.email}`);
    }

    console.log('Finished seeding demo users!');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

seedDemoUsers();
