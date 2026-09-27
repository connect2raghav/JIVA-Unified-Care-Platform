-- Create periodontal_records table
CREATE TABLE IF NOT EXISTS periodontal_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    date DATE DEFAULT CURRENT_DATE,
    measurements JSONB NOT NULL,
    plaque_index NUMERIC(5,2),
    bleeding_index NUMERIC(5,2),
    dentist_id UUID REFERENCES users(id) ON DELETE SET NULL,
    dentist_name VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create clinical_measurements table
CREATE TABLE IF NOT EXISTS clinical_measurements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    date DATE DEFAULT CURRENT_DATE,
    dmft_index JSONB,
    plaque_index NUMERIC(5,2),
    gingival_index NUMERIC(5,2),
    oral_hygiene_index NUMERIC(5,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_periodontal_records_patient ON periodontal_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_measurements_patient ON clinical_measurements(patient_id);
