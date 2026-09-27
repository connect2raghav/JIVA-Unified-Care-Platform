-- Add Super Admin Role
INSERT INTO roles (id, name, description) VALUES
('00000000-0000-0000-0000-000000000006', 'Super Admin', 'Platform owner with global access to all clinics and system configuration.')
ON CONFLICT (name) DO NOTHING;

-- Add Subscription fields to clinics
ALTER TABLE clinics 
ADD COLUMN IF NOT EXISTS subscription_plan VARCHAR(100) DEFAULT 'Basic',
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'Active',
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_renewal_date TIMESTAMPTZ;

-- Function to get current user's role name
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS VARCHAR AS $$
  SELECT r.name 
  FROM public.users u
  JOIN public.roles r ON u.role_id = r.id
  WHERE u.id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to get current user's clinic_id
CREATE OR REPLACE FUNCTION get_current_user_clinic_id()
RETURNS UUID AS $$
  SELECT clinic_id 
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;


-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------

-- ENABLE RLS on tables
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE tooth_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE images ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- 1. ROLES
CREATE POLICY "Super Admins can manage roles" ON roles
FOR ALL USING (get_current_user_role() = 'Super Admin');

CREATE POLICY "Anyone can read roles" ON roles
FOR SELECT USING (true);


-- 2. CLINICS
CREATE POLICY "Super Admins can manage clinics" ON clinics
FOR ALL USING (get_current_user_role() = 'Super Admin');

CREATE POLICY "Users can view their own clinic" ON clinics
FOR SELECT USING (
  id = get_current_user_clinic_id()
);


-- 3. USERS
CREATE POLICY "Super Admins can manage users" ON users
FOR ALL USING (get_current_user_role() = 'Super Admin');

CREATE POLICY "Users can manage users in their own clinic" ON users
FOR ALL USING (
  clinic_id = get_current_user_clinic_id()
);


-- 4. PATIENTS
CREATE POLICY "Super Admins can manage patients" ON patients
FOR ALL USING (get_current_user_role() = 'Super Admin');

CREATE POLICY "Users can manage patients in their own clinic" ON patients
FOR ALL USING (
  clinic_id = get_current_user_clinic_id()
);


-- 5. APPOINTMENTS (Relies on Patient's clinic_id)
CREATE POLICY "Super Admins can manage appointments" ON appointments
FOR ALL USING (get_current_user_role() = 'Super Admin');

CREATE POLICY "Users can manage appointments in their own clinic" ON appointments
FOR ALL USING (
  patient_id IN (SELECT id FROM patients WHERE clinic_id = get_current_user_clinic_id())
);


-- 6. VISITS (Relies on Patient's clinic_id)
CREATE POLICY "Super Admins can manage visits" ON visits
FOR ALL USING (get_current_user_role() = 'Super Admin');

CREATE POLICY "Users can manage visits in their own clinic" ON visits
FOR ALL USING (
  patient_id IN (SELECT id FROM patients WHERE clinic_id = get_current_user_clinic_id())
);


-- 7. CLINICAL RECORDS
CREATE POLICY "Super Admins can manage clinical records" ON clinical_records
FOR ALL USING (get_current_user_role() = 'Super Admin');

CREATE POLICY "Users can manage clinical records in their own clinic" ON clinical_records
FOR ALL USING (
  patient_id IN (SELECT id FROM patients WHERE clinic_id = get_current_user_clinic_id())
);


-- 8. TOOTH RECORDS
CREATE POLICY "Super Admins can manage tooth records" ON tooth_records
FOR ALL USING (get_current_user_role() = 'Super Admin');

CREATE POLICY "Users can manage tooth records in their own clinic" ON tooth_records
FOR ALL USING (
  patient_id IN (SELECT id FROM patients WHERE clinic_id = get_current_user_clinic_id())
);


-- 9. TREATMENT PLANS
CREATE POLICY "Super Admins can manage treatment plans" ON treatment_plans
FOR ALL USING (get_current_user_role() = 'Super Admin');

CREATE POLICY "Users can manage treatment plans in their own clinic" ON treatment_plans
FOR ALL USING (
  patient_id IN (SELECT id FROM patients WHERE clinic_id = get_current_user_clinic_id())
);


-- 10. IMAGES
CREATE POLICY "Super Admins can manage images" ON images
FOR ALL USING (get_current_user_role() = 'Super Admin');

CREATE POLICY "Users can manage images in their own clinic" ON images
FOR ALL USING (
  patient_id IN (SELECT id FROM patients WHERE clinic_id = get_current_user_clinic_id())
);


-- 11. FOLLOW UPS
CREATE POLICY "Super Admins can manage follow ups" ON follow_ups
FOR ALL USING (get_current_user_role() = 'Super Admin');

CREATE POLICY "Users can manage follow ups in their own clinic" ON follow_ups
FOR ALL USING (
  patient_id IN (SELECT id FROM patients WHERE clinic_id = get_current_user_clinic_id())
);


-- 12. AUDIT LOGS
CREATE POLICY "Super Admins can view all audit logs" ON audit_logs
FOR SELECT USING (get_current_user_role() = 'Super Admin');

CREATE POLICY "Users can view audit logs for their clinic" ON audit_logs
FOR SELECT USING (
  user_id IN (SELECT id FROM users WHERE clinic_id = get_current_user_clinic_id())
);

CREATE POLICY "Anyone can insert audit logs" ON audit_logs
FOR INSERT WITH CHECK (true);
