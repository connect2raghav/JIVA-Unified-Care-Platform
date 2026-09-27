const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// 1. Manually parse .env file to extract database credentials
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    console.warn('.env file not found.');
    return;
  }
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    process.env[key] = value;
  });
}

loadEnv();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl || dbUrl.includes('[YOUR-PASSWORD]') || dbUrl.includes('<your-project-id>')) {
  console.warn('------------------------------------------------------------');
  console.warn('DATABASE_URL is not configured with actual credentials.');
  console.warn('Automatic database migration and seeding will be bypassed.');
  console.warn('Running in default local mock/fallback preview mode.');
  console.warn('------------------------------------------------------------');
  process.exit(0);
}

async function run() {
  const client = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to Supabase PostgreSQL database...');
    await client.connect();
    console.log('Successfully connected to the database.');

    // 2. Check if the tables exist (check if 'users' table exists)
    const checkTableRes = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    const tablesExist = checkTableRes.rows[0].exists;

    if (!tablesExist) {
      console.log('Database tables are missing. Running SQL migrations sequentially...');
      
      const migrationsDir = path.join(__dirname, '../supabase/migrations');
      if (!fs.existsSync(migrationsDir)) {
        throw new Error(`Migrations directory not found at: ${migrationsDir}`);
      }

      // Read migration files, sort them alphabetically
      const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

      for (const file of files) {
        const filePath = path.join(migrationsDir, file);
        console.log(`Executing migration: ${file}...`);
        const sql = fs.readFileSync(filePath, 'utf8');
        // Execute the migration SQL code
        await client.query(sql);
      }
      console.log('All migrations executed successfully.');
    } else {
      console.log('Database tables already exist. Skipping migration execution.');
    }

    // 3. Ensure the users table has the "role" column to match frontend expectations
    await client.query(`
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR(100);
    `);

    // 4. Check if the default administrator account exists in auth.users
    const adminEmail = 'idadmin@crmdental.com';
    const adminPassword = 'Admin@123';
    const adminId = '00000000-0000-0000-0000-000000000009'; // fixed UUID for deterministic seeding
    
    const checkAdminRes = await client.query(
      'SELECT id FROM auth.users WHERE id = $1 LIMIT 1;',
      [adminId]
    );

    if (checkAdminRes.rows.length === 0) {
      console.log(`Default administrator (${adminEmail}) does not exist. Creating...`);

      // Start transaction
      await client.query('BEGIN;');

      // Enable pgcrypto extension
      await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

      // Insert default clinic if missing
      await client.query(`
        INSERT INTO public.clinics (id, name, address, phone, email, is_active)
        VALUES ('00000000-0000-0000-0000-000000000001', 'Core Dental Headquarters', '101 Medical Center Drive', '(555) 500-1000', 'hq@dcip.org', true)
        ON CONFLICT (id) DO NOTHING;
      `);

      // Insert default Administrator role if missing
      await client.query(`
        INSERT INTO public.roles (id, name, description)
        VALUES ('00000000-0000-0000-0000-000000000002', 'Administrator', 'Full practice management, user settings, audit logs and clinical overview.')
        ON CONFLICT (name) DO NOTHING;
      `);

      // Insert default admin into auth.users (email/password login verified, email_confirmed_at direct confirm)
      await client.query(`
        INSERT INTO auth.users (
          id,
          instance_id,
          email,
          encrypted_password,
          email_confirmed_at,
          raw_app_meta_data,
          raw_user_meta_data,
          aud,
          role,
          created_at,
          updated_at,
          confirmation_token,
          recovery_token,
          email_change_token_new,
          email_change
        )
        VALUES (
          $1,
          '00000000-0000-0000-0000-000000000000',
          $2,
          crypt($3, gen_salt('bf', 10)),
          NOW(),
          '{"provider":"email","providers":["email"]}',
          '{"name":"System Administrator"}',
          'authenticated',
          'authenticated',
          NOW(),
          NOW(),
          '', '', '', ''
        );
      `, [adminId, adminEmail, adminPassword]);

      // Insert default admin into public.users
      await client.query(`
        INSERT INTO public.users (
          id,
          clinic_id,
          email,
          name,
          role_id,
          role,
          is_active,
          is_locked,
          created_at,
          updated_at
        )
        VALUES (
          $1,
          '00000000-0000-0000-0000-000000000001',
          $2,
          'System Administrator',
          '00000000-0000-0000-0000-000000000002',
          'Administrator',
          true,
          false,
          NOW(),
          NOW()
        );
      `, [adminId, adminEmail]);

      await client.query('COMMIT;');

      console.log('----------------------------------------');
      console.log('DEFAULT ADMIN ACCOUNT CREATED');
      console.log('');
      console.log('Email:');
      console.log(adminEmail);
      console.log('');
      console.log('Password:');
      console.log(adminPassword);
      console.log('');
      console.log('Role:');
      console.log('Administrator');
      console.log('----------------------------------------');
    } else {
      console.log('Default administrator already exists. No actions required.');
    }

  } catch (err) {
    console.error('Database setup failed:', err.message);
    // Exit gracefully to avoid breaking the Vite dev server start
  } finally {
    await client.end();
  }
}

run();
