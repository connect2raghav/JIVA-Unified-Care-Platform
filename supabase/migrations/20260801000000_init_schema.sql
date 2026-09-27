-- Dental Clinical Intelligence Platform (DCIP) - Database Schema Initialization
-- Multi-clinic readiness, role-based authorization, session logs, and audit logs.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------
-- 1. CLINICS TABLE (Multi-Clinic Readiness)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 2. ROLES TABLE
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL, -- 'Administrator', 'Dentist', 'Receptionist', 'Dental Assistant'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 3. PERMISSIONS TABLE
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'manage_users', 'clinical_records', etc.
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 4. ROLE_PERMISSIONS TABLE (Many-to-Many Mapping)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- -------------------------------------------------------------
-- 5. USERS / CLINICAL PROFILES TABLE
-- -------------------------------------------------------------
-- Links directly to Supabase Auth auth.users table via id
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY, -- references auth.users(id)
    clinic_id UUID REFERENCES clinics(id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role_id UUID REFERENCES roles(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT TRUE,
    is_locked BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 6. USER_SESSIONS TABLE
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    logged_in_at TIMESTAMPTZ DEFAULT NOW(),
    logged_out_at TIMESTAMPTZ
);

-- -------------------------------------------------------------
-- 7. AUDIT_LOGS TABLE
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- e.g., 'CREATE_USER', 'DEACTIVATE_USER', 'RESET_PASSWORD'
    entity VARCHAR(100) NOT NULL, -- e.g., 'users', 'clinics', 'treatment_plans'
    entity_id VARCHAR(100),       -- Reference ID of modified entity
    description TEXT NOT NULL,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 8. FUTURE CLINICAL ENTITIES - RELATIONSHIP PLACEHOLDERS
-- -------------------------------------------------------------

-- PATIENTS (Future Relation stub)
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20),
    blood_type VARCHAR(10),
    allergies TEXT[],
    medical_history TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- APPOINTMENTS (Future Relation stub)
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    dentist_id UUID REFERENCES users(id) ON DELETE SET NULL,
    date_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status VARCHAR(50) DEFAULT 'Scheduled', -- 'Scheduled', 'Completed', 'Cancelled'
    reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CLINICAL_VISITS (Future Relation stub)
CREATE TABLE IF NOT EXISTS visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    dentist_id UUID REFERENCES users(id) ON DELETE SET NULL,
    date_time TIMESTAMPTZ DEFAULT NOW(),
    chief_complaint TEXT,
    blood_pressure VARCHAR(20),
    pulse INTEGER,
    temperature NUMERIC(4,1),
    diagnosis TEXT,
    notes TEXT
);

-- CLINICAL_RECORDS / NOTES (Future Relation stub)
CREATE TABLE IF NOT EXISTS clinical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    dentist_id UUID REFERENCES users(id) ON DELETE SET NULL,
    note_type VARCHAR(50) NOT NULL, -- 'Progress', 'Surgical'
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TOOTH_RECORDS / ODONTOGRAM STATE (Future Relation stub)
CREATE TABLE IF NOT EXISTS tooth_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    tooth_number INTEGER NOT NULL,
    surface VARCHAR(50), -- Comma-separated surfaces like 'O,D'
    condition VARCHAR(100) NOT NULL,
    restoration VARCHAR(100),
    procedure VARCHAR(100),
    notes TEXT,
    images TEXT[],
    dentist_name VARCHAR(255),
    visit_id VARCHAR(100),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TREATMENT_PLANS (Future Relation stub)
CREATE TABLE IF NOT EXISTS treatment_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'Draft', -- 'Draft', 'Approved', 'Active'
    total_cost NUMERIC(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CLINICAL_IMAGES (Future Relation stub)
CREATE TABLE IF NOT EXISTS images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'X-Ray', 'Panoramic'
    image_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FOLLOW_UPS (Future Relation stub)
CREATE TABLE IF NOT EXISTS follow_ups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    dentist_id UUID REFERENCES users(id) ON DELETE SET NULL,
    due_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Completed'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------------
-- 9. SEED DEFAULT SYSTEM DATA
-- -------------------------------------------------------------

-- Seed default Clinic
INSERT INTO clinics (id, name, address, phone, email)
VALUES ('00000000-0000-0000-0000-000000000001', 'Core Dental Headquarters', '101 Medical Center Drive', '(555) 500-1000', 'hq@dcip.org')
ON CONFLICT DO NOTHING;

-- Seed default Roles
INSERT INTO roles (id, name, description) VALUES
('00000000-0000-0000-0000-000000000002', 'Administrator', 'Full practice management, user settings, audit logs and clinical overview.'),
('00000000-0000-0000-0000-000000000003', 'Dentist', 'Full access to clinical records, odontogram, visits logging, and treatment planning.'),
('00000000-0000-0000-0000-000000000004', 'Receptionist', 'Manage scheduling appointments, patient registries, calendars, and directories.'),
('00000000-0000-0000-0000-000000000005', 'Dental Assistant', 'Review assigned charts, upload x-ray files, write clinical notes, and manage instruments checklists.')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- Seed default Permissions
INSERT INTO permissions (code, description) VALUES
('manage_users', 'Ability to create, update, deactivate, and lock clinical users.'),
('manage_clinic', 'Modify clinic details, practice configuration, and systems settings.'),
('view_reports', 'Generate productivity metrics and download XLSX practice sheets.'),
('clinical_records', 'Write progress notes, diagnosis logs, and access odontograms.'),
('patient_registration', 'Create patient charts, manage contact info, and emergency numbers.'),
('appointments_scheduling', 'Schedule and move appointment slots on the calendar board.'),
('upload_imaging', 'Add bitewing scans and radiology records to patient charts.')
ON CONFLICT (code) DO NOTHING;

-- Assign permissions to roles
-- Admin Permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', id FROM permissions
ON CONFLICT DO NOTHING;

-- Dentist Permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', id FROM permissions
WHERE code IN ('clinical_records', 'patient_registration', 'appointments_scheduling', 'upload_imaging')
ON CONFLICT DO NOTHING;

-- Receptionist Permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000004', id FROM permissions
WHERE code IN ('patient_registration', 'appointments_scheduling')
ON CONFLICT DO NOTHING;

-- Dental Assistant Permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000005', id FROM permissions
WHERE code IN ('clinical_records', 'upload_imaging')
ON CONFLICT DO NOTHING;
