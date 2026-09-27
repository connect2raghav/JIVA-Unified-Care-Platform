-- Migration: Create clinic_registrations table
-- Stores pending clinic registration requests submitted from the Register Clinic page.
-- Platform admin reviews and approves/rejects these manually.

CREATE TABLE IF NOT EXISTS clinic_registrations (
  id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  clinic_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  status VARCHAR(50) DEFAULT 'Pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id)
);

-- Allow inserts from the anon/service role (public registration form)
ALTER TABLE clinic_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a registration"
  ON clinic_registrations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all registrations"
  ON clinic_registrations
  FOR SELECT
  USING (true);
