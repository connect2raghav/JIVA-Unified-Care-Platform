const { Client } = require('pg');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL;

async function fixDemoAccounts() {
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    const demoAccounts = [
      { id: '10000000-0000-0000-0000-000000000001', email: 'dentist@demo.com' },
      { id: '10000000-0000-0000-0000-000000000002', email: 'assistant@demo.com' },
      { id: '10000000-0000-0000-0000-000000000003', email: 'receptionist@demo.com' },
      { id: '10000000-0000-0000-0000-000000000004', email: 'superadmin@demo.com' },
      { id: '10000000-0000-0000-0000-000000000005', email: 'otherdentist@demo.com' }
    ];
    
    for (const acc of demoAccounts) {
      await client.query(`
        INSERT INTO auth.identities (
          id, provider_id, user_id, identity_data, provider, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, 'email', NOW(), NOW()
        ) ON CONFLICT DO NOTHING;
      `, [acc.id, acc.id, JSON.stringify({ sub: acc.id, email: acc.email })]);
      
      console.log('Fixed identity for:', acc.email);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

fixDemoAccounts();
