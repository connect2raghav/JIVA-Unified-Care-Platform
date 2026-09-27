-- Allow anonymous read access to the users table for the login dropdown
DROP POLICY IF EXISTS allow_anon_read_users ON public.users;
CREATE POLICY allow_anon_read_users ON public.users FOR SELECT TO anon USING (true);
