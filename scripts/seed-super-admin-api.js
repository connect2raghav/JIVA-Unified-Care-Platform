import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY // Requires service_role key to bypass RLS and create users
);

const seedSuperAdmin = async () => {
  const email = 'superadmin@gmail.com';
  const password = 'Password123!';
  const name = 'Platform Admin';

  try {
    console.log('Creating auth user...');
    
    // We are trying to sign up. Normally we need service_role for admin.createUser, but signUp works if email confirmation is off
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('User already exists in auth. Updating profile...');
        // Need the ID, so login to get the ID
        const { data: loginData } = await supabase.auth.signInWithPassword({ email, password });
        if (loginData?.user?.id) {
          await createProfile(loginData.user.id, email, name);
        }
      } else {
        console.error('Auth Error:', authError.message);
      }
      return;
    }

    if (authData?.user?.id) {
      await createProfile(authData.user.id, email, name);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
};

const createProfile = async (id, email, name) => {
  console.log(`Setting role to Super Admin for ${email} (ID: ${id})`);
  
  const { error } = await supabase.from('users').upsert({
    id,
    email,
    name,
    role_id: '00000000-0000-0000-0000-000000000006', // Super Admin role UUID
    is_active: true,
  });

  if (error) {
    console.error('Failed to create user profile:', error.message);
  } else {
    console.log('Successfully created Super Admin user!');
    console.log('Login at: /platform/login');
    console.log('Email:', email);
    console.log('Password: Password123!');
  }
};

seedSuperAdmin();
