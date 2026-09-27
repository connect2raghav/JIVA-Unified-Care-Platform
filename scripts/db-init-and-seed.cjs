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

if (!dbUrl) {
  console.error('DATABASE_URL is not configured in .env. Exiting...');
  process.exit(1);
}

async function run() {
  console.log('Connecting to PostgreSQL database...');
  
  // Explicitly parse connection URL to avoid pg library parser issues
  let client;
  try {
    const rawUrl = dbUrl.replace('postgres://', '').replace('postgresql://', '');
    const [credentials, hostAndDb] = rawUrl.split('@');
    const [user, encodedPassword] = credentials.split(':');
    const [hostPort, dbName] = hostAndDb.split('/');
    const [host, portStr] = hostPort.split(':');
    
    const password = decodeURIComponent(encodedPassword);
    const port = parseInt(portStr, 10) || 5432;
    
    console.log(`Parsed credentials: User: ${user}, Host: ${host}, Port: ${port}, Db: ${dbName}`);
    
    client = new Client({
      host,
      port,
      database: dbName,
      user,
      password,
      ssl: {
        rejectUnauthorized: false
      }
    });
  } catch (parseErr) {
    console.error('Failed to parse DATABASE_URL:', parseErr.message);
    process.exit(1);
  }

  try {
    await client.connect();
    console.log('Successfully connected to the database.');

    // Step 2: Sequentially apply every SQL migration in the supabase/migrations folder
    const migrationsDir = path.join(__dirname, '../supabase/migrations');
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found at: ${migrationsDir}`);
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log('Running SQL migrations in alphabetical order...');
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      console.log(`Executing migration: ${file}...`);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        await client.query(sql);
      } catch (err) {
        console.warn(`Migration ${file} encountered an error: ${err.message}. Attempting automatic repair statement-by-statement...`);
        // If a migration fails as a single block (due to syntax or object already exists), split it by semicolon and run separately.
        const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
        for (const statement of statements) {
          try {
            await client.query(statement + ';');
          } catch (innerErr) {
            // Ignore common "already exists" and "duplicate" errors to successfully continue/repair migration.
            if (
              innerErr.message.includes('already exists') || 
              innerErr.message.includes('duplicate') ||
              innerErr.message.includes('already a relation') ||
              innerErr.message.includes('already is a column')
            ) {
              // Gracefully ignore
            } else {
              console.error(`Statement failed: "${statement}"`);
              throw innerErr;
            }
          }
        }
      }
    }
    console.log('All migrations processed successfully.');

    // Ensure users table has role column
    await client.query(`
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role VARCHAR(100);
    `);

    // Step 3 & 4: Create tables and foreign keys are completed by migrations

    // Step 5: Enable Row Level Security (RLS) on all tables in public schema
    console.log('Enabling Row Level Security (RLS) on all public tables...');
    await client.query(`
      DO $$
      DECLARE
          r RECORD;
      BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
              EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
          END LOOP;
      END;
      $$;
    `);

    // Step 6: Create Policies
    console.log('Creating RLS policies for authenticated users on all public tables...');
    await client.query(`
      DO $$
      DECLARE
          r RECORD;
      BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
              EXECUTE 'DROP POLICY IF EXISTS allow_authenticated_all ON public.' || quote_ident(r.tablename);
              EXECUTE 'CREATE POLICY allow_authenticated_all ON public.' || quote_ident(r.tablename) || 
                      ' FOR ALL TO authenticated USING (true) WITH CHECK (true);';
          END LOOP;
      END;
      $$;
    `);

    // Step 7: Enable pgcrypto extension for uuid generation and encryption
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

    // Step 8: Seeding database with initial development data
    console.log('Seeding database with clinical data and staff...');
    
    // Seed default Clinic
    const clinicId = '00000000-0000-0000-0000-000000000001';
    await client.query(`
      INSERT INTO public.clinics (id, name, address, phone, email, is_active)
      VALUES ($1, 'Core Dental Headquarters', '101 Medical Center Drive, Mumbai', '(555) 500-1000', 'hq@dcip.org', true)
      ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address;
    `, [clinicId]);

    // Ensure roles are in place
    const roles = {
      Administrator: '00000000-0000-0000-0000-000000000002',
      Dentist: '00000000-0000-0000-0000-000000000003',
      Receptionist: '00000000-0000-0000-0000-000000000004',
      Assistant: '00000000-0000-0000-0000-000000000005'
    };

    // Seed Staff into auth.users and public.users
    const staffMembers = [
      {
        id: '00000000-0000-0000-0000-000000000009',
        email: 'idadmin@crmdental.com',
        password: 'Admin@123',
        name: 'Prasad Patil',
        role: 'Administrator',
        role_id: roles.Administrator
      },
      {
        id: '00000000-0000-0000-0000-000000000010',
        email: 'amit.deshmukh@crmdental.com',
        password: 'Dentist@123',
        name: 'Dr. Amit Deshmukh',
        role: 'Dentist',
        role_id: roles.Dentist
      },
      {
        id: '00000000-0000-0000-0000-000000000011',
        email: 'sneha.kulkarni@crmdental.com',
        password: 'Dentist@123',
        name: 'Dr. Sneha Kulkarni',
        role: 'Dentist',
        role_id: roles.Dentist
      },
      {
        id: '00000000-0000-0000-0000-000000000012',
        email: 'rahul.shinde@crmdental.com',
        password: 'Assistant@123',
        name: 'Rahul Shinde',
        role: 'Dental Assistant',
        role_id: roles.Assistant
      },
      {
        id: '00000000-0000-0000-0000-000000000013',
        email: 'vaishnavi.pawar@crmdental.com',
        password: 'Assistant@123',
        name: 'Vaishnavi Pawar',
        role: 'Dental Assistant',
        role_id: roles.Assistant
      },
      {
        id: '00000000-0000-0000-0000-000000000014',
        email: 'pooja.jadhav@crmdental.com',
        password: 'Receptionist@123',
        name: 'Pooja Jadhav',
        role: 'Receptionist',
        role_id: roles.Receptionist
      },
      {
        id: '00000000-0000-0000-0000-000000000015',
        email: 'swati.joshi@crmdental.com',
        password: 'Receptionist@123',
        name: 'Swati Joshi',
        role: 'Receptionist',
        role_id: roles.Receptionist
      }
    ];

    for (const member of staffMembers) {
      console.log(`Seeding staff member: ${member.name} (${member.role})...`);
      
      // Clean first if existing to enable clean seeding
      await client.query('DELETE FROM public.users WHERE id = $1;', [member.id]);
      await client.query('DELETE FROM auth.users WHERE id = $1;', [member.id]);

      // Insert into auth.users
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
          $4,
          'authenticated',
          'authenticated',
          NOW(),
          NOW(),
          '', '', '', ''
        );
      `, [member.id, member.email, member.password, JSON.stringify({ name: member.name })]);

      // Insert into public.users
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
        VALUES ($1, $2, $3, $4, $5, $6, true, false, NOW(), NOW());
      `, [member.id, clinicId, member.email, member.name, member.role_id, member.role]);
    }

    // Seed 20 Patients with Marathi Names
    const patients = [
      { id: '10000000-0000-0000-0000-000000000001', name: 'Aniket Sawant', email: 'aniket.sawant@demo.com', phone: '9876543201', dob: '1990-05-15', gender: 'Male', blood: 'A+' },
      { id: '10000000-0000-0000-0000-000000000002', name: 'Sachin Tendulkar', email: 'sachin.tend@demo.com', phone: '9876543202', dob: '1973-04-24', gender: 'Male', blood: 'O+' },
      { id: '10000000-0000-0000-0000-000000000003', name: 'Jyoti Ranade', email: 'jyoti.ranade@demo.com', phone: '9876543203', dob: '1985-08-12', gender: 'Female', blood: 'B+' },
      { id: '10000000-0000-0000-0000-000000000004', name: 'Sunita Bhave', email: 'sunita.bhave@demo.com', phone: '9876543204', dob: '1965-11-30', gender: 'Female', blood: 'AB+' },
      { id: '10000000-0000-0000-0000-000000000005', name: 'Milind Soman', email: 'milind.soman@demo.com', phone: '9876543205', dob: '1965-11-04', gender: 'Male', blood: 'O-' },
      { id: '10000000-0000-0000-0000-000000000006', name: 'Sandeep Kulkarni', email: 'sandeep.k@demo.com', phone: '9876543206', dob: '1975-03-20', gender: 'Male', blood: 'A-' },
      { id: '10000000-0000-0000-0000-000000000007', name: 'Tanvi Joshi', email: 'tanvi.joshi@demo.com', phone: '9876543207', dob: '1995-07-22', gender: 'Female', blood: 'B-' },
      { id: '10000000-0000-0000-0000-000000000008', name: 'Archana Peshwe', email: 'archana.p@demo.com', phone: '9876543208', dob: '1988-02-14', gender: 'Female', blood: 'O+' },
      { id: '10000000-0000-0000-0000-000000000009', name: 'Rohan Mane', email: 'rohan.mane@demo.com', phone: '9876543209', dob: '1992-09-05', gender: 'Male', blood: 'A+' },
      { id: '10000000-0000-0000-0000-000000000010', name: 'Priyanka Gaikwad', email: 'priyanka.g@demo.com', phone: '9876543210', dob: '1993-12-25', gender: 'Female', blood: 'B+' },
      { id: '10000000-0000-0000-0000-000000000011', name: 'Nilesh Dabholkar', email: 'nilesh.d@demo.com', phone: '9876543211', dob: '1980-01-18', gender: 'Male', blood: 'AB-' },
      { id: '10000000-0000-0000-0000-000000000012', name: 'Kavita Mahajan', email: 'kavita.m@demo.com', phone: '9876543212', dob: '1978-06-10', gender: 'Female', blood: 'O+' },
      { id: '10000000-0000-0000-0000-000000000013', name: 'Sanjay Manjrekar', email: 'sanjay.m@demo.com', phone: '9876543213', dob: '1965-07-12', gender: 'Male', blood: 'B+' },
      { id: '10000000-0000-0000-0000-000000000014', name: 'Varsha Usgaonkar', email: 'varsha.u@demo.com', phone: '9876543214', dob: '1968-02-28', gender: 'Female', blood: 'A+' },
      { id: '10000000-0000-0000-0000-000000000015', name: 'Pallavi Joshi', email: 'pallavi.j@demo.com', phone: '9876543215', dob: '1969-09-05', gender: 'Female', blood: 'O+' },
      { id: '10000000-0000-0000-0000-000000000016', name: 'Girish Karnad', email: 'girish.k@demo.com', phone: '9876543216', dob: '1938-05-19', gender: 'Male', blood: 'B-' },
      { id: '10000000-0000-0000-0000-000000000017', name: 'Anand Shinde', email: 'anand.s@demo.com', phone: '9876543217', dob: '1970-10-15', gender: 'Male', blood: 'O+' },
      { id: '10000000-0000-0000-0000-000000000018', name: 'Madhuri Dixit', email: 'madhuri.d@demo.com', phone: '9876543218', dob: '1967-05-15', gender: 'Female', blood: 'A-' },
      { id: '10000000-0000-0000-0000-000000000019', name: 'Sachin Khedekar', email: 'sachin.k@demo.com', phone: '9876543219', dob: '1965-05-14', gender: 'Male', blood: 'B+' },
      { id: '10000000-0000-0000-0000-000000000020', name: 'Sonali Kulkarni', email: 'sonali.k@demo.com', phone: '9876543220', dob: '1974-11-03', gender: 'Female', blood: 'AB+' }
    ];

    console.log('Seeding 20 patients...');
    for (const patient of patients) {
      await client.query('DELETE FROM public.patients WHERE id = $1;', [patient.id]);
      await client.query(`
        INSERT INTO public.patients (
          id, clinic_id, name, email, phone, date_of_birth, gender, blood_type, allergies, medical_history, address, emergency_contact, notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);
      `, [
        patient.id,
        clinicId,
        patient.name,
        patient.email,
        patient.phone,
        patient.dob,
        patient.gender,
        patient.blood,
        ['Penicillin', 'Dust'],
        ['Hypertension', 'Diabetes'],
        'Shivaji Nagar, Pune, Maharashtra',
        JSON.stringify({ name: 'Rahul Sawant', relationship: 'Brother', phone: '9123456789' }),
        'Requires special care during composite fillings.'
      ]);
    }

    // Seed Appointments, Visits, Treatment Plans, Procedures and Follow-ups
    const dentistIds = [
      '00000000-0000-0000-0000-000000000010', // Dr. Amit Deshmukh
      '00000000-0000-0000-0000-000000000011'  // Dr. Sneha Kulkarni
    ];
    const dentistNames = ['Dr. Amit Deshmukh', 'Dr. Sneha Kulkarni'];

    console.log('Seeding appointments, visits, treatment plans, procedures, and follow-ups...');
    
    // Seed data iteratively to match requirements
    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      const dentistId = dentistIds[i % 2];
      const dentistName = dentistNames[i % 2];
      
      const appointmentId = `20000000-0000-0000-0000-0000000000${String(i+1).padStart(2, '0')}`;
      const visitId = `30000000-0000-0000-0000-0000000000${String(i+1).padStart(2, '0')}`;
      const planId = `40000000-0000-0000-0000-0000000000${String(i+1).padStart(2, '0')}`;
      const procedureId = `50000000-0000-0000-0000-0000000000${String(i+1).padStart(2, '0')}`;
      const followUpId = `60000000-0000-0000-0000-0000000000${String(i+1).padStart(2, '0')}`;

      // 1. Appointments
      await client.query('DELETE FROM public.appointments WHERE id = $1;', [appointmentId]);
      await client.query(`
        INSERT INTO public.appointments (id, patient_id, dentist_id, date_time, duration_minutes, status, reason, notes)
        VALUES ($1, $2, $3, NOW() + INTERVAL '${i + 1} day', 30, 'Scheduled', 'Root Canal Treatment Consultation', 'First time patient consultation.');
      `, [appointmentId, patient.id, dentistId]);

      // 2. Visits
      await client.query('DELETE FROM public.visits WHERE id = $1;', [visitId]);
      await client.query(`
        INSERT INTO public.visits (
          id, patient_id, dentist_id, date_time, chief_complaint, blood_pressure, pulse, temperature, diagnosis, notes,
          treatment, outcome, vitals, periodontal, measurements, prescriptions, followup, dentist_name, visit_type, status
        )
        VALUES ($1, $2, $3, NOW(), 'Severe pain in the lower left molar.', '120/80', 72, 98.6, 'Irreversible pulpitis in tooth 36.', 'Recommended immediate root canal therapy.',
        'Pulpectomy performed on tooth 36, temporary restoration placed.', 'Pain relieved, patient comfortable.', 
        '{"bloodPressure": "120/80", "pulse": 72, "temperature": 98.6}', '{"pocketDepths": "Normal"}', '{}',
        '[{"medicine": "Amoxicillin 500mg", "dosage": "TDS", "duration": "5 days"}, {"medicine": "Paracetamol 650mg", "dosage": "SOS", "duration": "3 days"}]',
        '{"date": "2026-08-11", "reason": "Root Canal obturation and permanent restoration"}',
        $4, 'Treatment', 'Completed');
      `, [visitId, patient.id, dentistId, dentistName]);

      // 3. Treatment Plans
      await client.query('DELETE FROM public.treatment_plans WHERE id = $1;', [planId]);
      await client.query(`
        INSERT INTO public.treatment_plans (id, patient_id, name, status, total_cost, expected_completion_date, clinical_notes, visit_id)
        VALUES ($1, $2, 'Root Canal Therapy Plan', 'Active', 5500.00, NOW() + INTERVAL '14 day', 'Complete RCT + Post & Core + PFM Crown.', $3);
      `, [planId, patient.id, visitId]);

      // 4. Procedures (Treatments)
      await client.query('DELETE FROM public.procedures WHERE id = $1;', [procedureId]);
      await client.query(`
        INSERT INTO public.procedures (
          id, treatment_plan_id, patient_id, visit_id, diagnosis, affected_tooth, affected_surface, code, description,
          priority, estimated_visits, estimated_duration, cost, assigned_dentist_id, assigned_dentist_name, status, notes
        )
        VALUES ($1, $2, $3, $4, 'Irreversible pulpitis', '36', 'O', 'D3330', 'Root Canal Treatment - Molar',
        'High', 2, '45 mins', 4500.00, $5, $6, 'In Progress', 'Scheduled for obturation session next week.');
      `, [procedureId, planId, patient.id, visitId, dentistId, dentistName]);

      // 5. Follow-ups
      await client.query('DELETE FROM public.follow_ups WHERE id = $1;', [followUpId]);
      await client.query(`
        INSERT INTO public.follow_ups (id, patient_id, dentist_id, due_date, reason, status)
        VALUES ($1, $2, $3, CURRENT_DATE + 7, 'Obturation and permanent filling post-RCT', 'Pending');
      `, [followUpId, patient.id, dentistId]);
    }

    console.log('Database initialized and seeded successfully!');
  } catch (err) {
    console.error('Error during database initialization/seeding:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

run();
