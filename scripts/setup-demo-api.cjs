const supabase = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YWFlb3F5bmpwendiZ2NtdmlnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4OTA0NDc2NywiZXhwIjoyMTA0NjIwNzY3fQ.UkCM3aUQkqBxq2HCBAOyu9ecUxmEieXz8zPzb0S17FE';

const adminClient = supabase.createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const { Client } = require('pg');
const dbUrl = process.env.DATABASE_URL;

async function setupDemoAccountsViaAPI() {
  const pgClient = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await pgClient.connect();

    // 1. Delete the hacked accounts so we can create them cleanly
    const emails = ['dentist@demo.com', 'assistant@demo.com', 'receptionist@demo.com', 'superadmin@demo.com', 'otherdentist@demo.com'];
    await pgClient.query(`DELETE FROM auth.users WHERE email = ANY($1)`, [emails]);
    await pgClient.query(`DELETE FROM public.users WHERE email = ANY($1)`, [emails]);

    const demoAccounts = [
      { id: '10000000-0000-0000-0000-000000000001', email: 'dentist@demo.com', name: 'Dr. Prasad Patil (Demo)', roleId: '00000000-0000-0000-0000-000000000003', roleName: 'Dentist' },
      { id: '10000000-0000-0000-0000-000000000002', email: 'assistant@demo.com', name: 'Pooja Kulkarni (Demo)', roleId: '00000000-0000-0000-0000-000000000005', roleName: 'Dental Assistant' },
      { id: '10000000-0000-0000-0000-000000000003', email: 'receptionist@demo.com', name: 'Rohit Deshmukh (Demo)', roleId: '00000000-0000-0000-0000-000000000004', roleName: 'Receptionist' },
      { id: '10000000-0000-0000-0000-000000000004', email: 'superadmin@demo.com', name: 'Platform Super Admin (Demo)', roleId: '00000000-0000-0000-0000-000000000006', roleName: 'Super Admin' },
      { id: '10000000-0000-0000-0000-000000000005', email: 'otherdentist@demo.com', name: 'Dr. Ananya Mehta (Demo)', roleId: '00000000-0000-0000-0000-000000000003', roleName: 'Other Dentist' }
    ];

    for (const acc of demoAccounts) {
      // Create via official API
      const { data, error } = await adminClient.auth.admin.createUser({
        email: acc.email,
        password: 'Demo@123',
        email_confirm: true,
        user_metadata: { name: acc.name }
      });

      if (error) {
        console.error('Failed to create:', acc.email, error);
        continue;
      }

      console.log('Created auth user:', data.user.id, acc.email);

      // We still need to create the public.users record
      await pgClient.query(`
        INSERT INTO public.users (
          id, clinic_id, email, name, role_id, role, is_active, is_locked, created_at, updated_at
        ) VALUES (
          $1, '00000000-0000-0000-0000-000000000001', $2, $3, $4, $5, true, false, NOW(), NOW()
        ) ON CONFLICT (id) DO NOTHING;
      `, [data.user.id, acc.email, acc.name, acc.roleId, acc.roleName]);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await pgClient.end();
  }
}

setupDemoAccountsViaAPI();
