-- Alter treatment_plans table to add clinical metadata
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS expected_completion_date DATE;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS clinical_notes TEXT;
ALTER TABLE treatment_plans ADD COLUMN IF NOT EXISTS visit_id UUID;

-- Create procedures (treatments) table
CREATE TABLE IF NOT EXISTS procedures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    treatment_plan_id UUID REFERENCES treatment_plans(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    visit_id UUID,
    diagnosis TEXT,
    affected_tooth VARCHAR(50),
    affected_surface VARCHAR(50),
    code VARCHAR(50) NOT NULL, -- CDT code e.g. D2140
    description VARCHAR(255) NOT NULL, -- Procedure name e.g. Amalgam filling
    priority VARCHAR(50) DEFAULT 'Medium', -- 'High', 'Medium', 'Low'
    estimated_visits INTEGER DEFAULT 1,
    estimated_duration VARCHAR(100),
    cost NUMERIC(10,2) DEFAULT 0.00,
    assigned_dentist_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_dentist_name VARCHAR(255),
    assistant_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assistant_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Planned', -- 'Planned', 'Approved', 'Scheduled', 'In Progress', 'Paused', 'Completed', 'Cancelled', 'Deferred'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create procedure_visits table for multi-visit progress tracking
CREATE TABLE IF NOT EXISTS procedure_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    procedure_id UUID REFERENCES procedures(id) ON DELETE CASCADE,
    visit_date DATE NOT NULL,
    procedure_performed TEXT NOT NULL,
    dentist_name VARCHAR(255) NOT NULL,
    notes TEXT,
    outcome TEXT,
    next_visit TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create clinical_outcomes table for completed procedure diagnostics
CREATE TABLE IF NOT EXISTS clinical_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    procedure_id UUID REFERENCES procedures(id) ON DELETE CASCADE UNIQUE,
    healing_status VARCHAR(100) NOT NULL, -- 'Excellent', 'Good', 'Delayed', 'Complicated'
    pain_level INTEGER DEFAULT 0, -- scale 0-10
    inflammation VARCHAR(100) DEFAULT 'None', -- 'None', 'Mild', 'Moderate', 'Severe'
    sensitivity VARCHAR(100) DEFAULT 'None', -- 'None', 'Mild', 'Moderate', 'Severe'
    mobility VARCHAR(50) DEFAULT 'Grade 0', -- 'Grade 0', 'Grade I', 'Grade II', 'Grade III'
    remarks TEXT,
    complications TEXT,
    patient_feedback TEXT,
    dentist_recommendation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create treatment_followups table for procedure-linked recalls
CREATE TABLE IF NOT EXISTS treatment_followups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    procedure_id UUID REFERENCES procedures(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    purpose VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    priority VARCHAR(50) DEFAULT 'Medium',
    reminder BOOLEAN DEFAULT TRUE,
    instructions TEXT,
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Completed', 'Cancelled'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance tuning
CREATE INDEX IF NOT EXISTS idx_procedures_treatment_plan ON procedures(treatment_plan_id);
CREATE INDEX IF NOT EXISTS idx_procedures_patient ON procedures(patient_id);
CREATE INDEX IF NOT EXISTS idx_procedure_visits_procedure ON procedure_visits(procedure_id);
CREATE INDEX IF NOT EXISTS idx_clinical_outcomes_procedure ON clinical_outcomes(procedure_id);
CREATE INDEX IF NOT EXISTS idx_treatment_followups_procedure ON treatment_followups(procedure_id);
CREATE INDEX IF NOT EXISTS idx_treatment_followups_patient ON treatment_followups(patient_id);
