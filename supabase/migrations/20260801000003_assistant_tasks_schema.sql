-- Dental Clinical Intelligence Platform (DCIP) - Assistant Tasks schema
-- Creates tables for assistant tasks, templates, notes and attachments.

-- 1. TASK TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS task_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(100) DEFAULT 'General',
    priority VARCHAR(50) DEFAULT 'Medium',
    estimated_duration VARCHAR(100) DEFAULT '15 mins',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed predefined templates
INSERT INTO task_templates (title, description, category, priority, estimated_duration) VALUES
('Take IOPA X-ray', 'Take an intraoral periapical radiograph for the specified tooth.', 'Imaging', 'High', '10 mins'),
('Capture Intraoral Photos', 'Take high-resolution photos of the patient''s inner oral cavity.', 'Imaging', 'Medium', '10 mins'),
('Capture Extraoral Photos', 'Take frontal and profile facial view photographs.', 'Imaging', 'Low', '10 mins'),
('Upload OPG', 'Obtain and upload a panoramic radiograph scan to patient file.', 'Imaging', 'High', '15 mins'),
('Upload CBCT', 'Simulate uploading a Cone Beam Computed Tomography 3D scan.', 'Imaging', 'Medium', '20 mins'),
('Prepare Extraction Kit', 'Set up surgical elevator, forceps, syndesmotome, curette, and sterile gauze.', 'Chairside Support', 'High', '15 mins'),
('Prepare Root Canal Instruments', 'Arrange files (K-files, rotary files), sodium hypochlorite, paper points and sealer.', 'Chairside Support', 'High', '15 mins'),
('Sterilize Instruments', 'Run used trays through ultrasonic cleaner and autoclave sterilization cycle.', 'Sterilization', 'Medium', '30 mins'),
('Prepare Composite Kit', 'Organize etching gel, bonding agent, composite shades, microbrushes and light cure.', 'Chairside Support', 'High', '10 mins'),
('Prepare Crown Impression', 'Prepare retraction cord, heavy body, light body impression guns and bite registration.', 'Chairside Support', 'Medium', '15 mins'),
('Take Alginate Impression', 'Mix alginate compound and load into mandibular/maxillary impression trays.', 'Clinical Procedure', 'Medium', '15 mins'),
('Prepare Implant Kit', 'Set up implant handpiece, sterile drapes, physiological saline and surgical drills.', 'Chairside Support', 'Emergency', '20 mins'),
('Record Vital Signs', 'Measure and record patient blood pressure, pulse rate and body temperature.', 'Clinical Procedure', 'High', '5 mins'),
('Upload Clinical Documents', 'Scan and upload patient medical clearance, consent form or referral letter.', 'Documents', 'Medium', '10 mins'),
('Assist During Procedure', 'Provide chairside four-handed dentistry suction, retraction and materials mix support.', 'Chairside Support', 'High', '45 mins')
ON CONFLICT (title) DO NOTHING;

-- 2. ASSISTANT TASKS TABLE
CREATE TABLE IF NOT EXISTS assistant_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_assistant_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_assistant_name VARCHAR(255),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
    dentist_id UUID REFERENCES users(id) ON DELETE SET NULL,
    dentist_name VARCHAR(255),
    priority VARCHAR(50) DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Emergency'
    due_time TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'Pending', -- 'Pending', 'Accepted', 'In Progress', 'Completed', 'Verified', 'Cancelled'
    estimated_duration VARCHAR(100) DEFAULT '15 mins',
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by_name VARCHAR(255),
    accepted_time TIMESTAMPTZ,
    completed_time TIMESTAMPTZ,
    verified_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TASK NOTES TABLE
CREATE TABLE IF NOT EXISTS task_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES assistant_tasks(id) ON DELETE CASCADE,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TASK ATTACHMENTS TABLE
CREATE TABLE IF NOT EXISTS task_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES assistant_tasks(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100) NOT NULL, -- 'image', 'document', 'pdf'
    uploaded_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_assistant_tasks_patient_id ON assistant_tasks(patient_id);
CREATE INDEX IF NOT EXISTS idx_assistant_tasks_visit_id ON assistant_tasks(visit_id);
CREATE INDEX IF NOT EXISTS idx_assistant_tasks_assistant ON assistant_tasks(assigned_assistant_id);
CREATE INDEX IF NOT EXISTS idx_task_notes_task_id ON task_notes(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON task_attachments(task_id);
