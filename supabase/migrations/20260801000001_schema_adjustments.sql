-- Add missing columns to patients table
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_contact JSONB;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add missing columns to audit_logs table
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);

-- Add missing columns to visits table
ALTER TABLE visits ADD COLUMN IF NOT EXISTS treatment TEXT;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS outcome VARCHAR(100);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS vitals JSONB;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS periodontal JSONB;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS measurements JSONB;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS prescriptions JSONB;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS followup JSONB;

-- Add missing columns to tooth_records table
ALTER TABLE tooth_records ADD COLUMN IF NOT EXISTS restoration VARCHAR(100);
ALTER TABLE tooth_records ADD COLUMN IF NOT EXISTS procedure VARCHAR(100);
ALTER TABLE tooth_records ADD COLUMN IF NOT EXISTS images TEXT[];
ALTER TABLE tooth_records ADD COLUMN IF NOT EXISTS dentist_name VARCHAR(255);
ALTER TABLE tooth_records ADD COLUMN IF NOT EXISTS visit_id VARCHAR(100);

-- Create diseases table
CREATE TABLE IF NOT EXISTS diseases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    tooth_number INTEGER,
    surfaces TEXT[],
    severity VARCHAR(50) DEFAULT 'Mild',
    stage VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Active',
    date_diagnosed TIMESTAMPTZ DEFAULT NOW(),
    dentist_name VARCHAR(255),
    notes TEXT
);

-- Create lesions table
CREATE TABLE IF NOT EXISTS lesions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    size VARCHAR(100),
    shape VARCHAR(255),
    color VARCHAR(100),
    duration VARCHAR(100),
    symptoms TEXT,
    notes TEXT,
    review_status VARCHAR(100) DEFAULT 'Pending Review',
    date_diagnosed TIMESTAMPTZ DEFAULT NOW(),
    dentist_name VARCHAR(255)
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(name);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_dentist_id ON appointments(dentist_id);
CREATE INDEX IF NOT EXISTS idx_visits_patient_id ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_records_patient_id ON clinical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_tooth_records_patient_id ON tooth_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_tooth_records_tooth_num ON tooth_records(tooth_number);
CREATE INDEX IF NOT EXISTS idx_diseases_patient_id ON diseases(patient_id);
CREATE INDEX IF NOT EXISTS idx_lesions_patient_id ON lesions(patient_id);
