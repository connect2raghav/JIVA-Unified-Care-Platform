import pkg from 'pg';
const { Client } = pkg;
import 'dotenv/config';

const confirmEmail = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Confirm email in auth.users
    await client.query(`
      UPDATE auth.users 
      SET email_confirmed_at = NOW()
      WHERE email = 'superadmin@gmail.com'
    `);
    
    console.log('Successfully confirmed email for superadmin!');
  } catch (e) {
    console.error('Failed to confirm email:', e);
  } finally {
    await client.end();
  }
};

confirmEmail();
