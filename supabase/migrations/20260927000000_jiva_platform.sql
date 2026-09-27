-- JIVA: Unified Care Platform — Foundation Migration
-- Creates the 6 core platform tables with RLS mirroring existing per-clinic_id pattern.
-- Tables: clinics (update), patients (update), appointments (update),
--         ambulances (new), emergency_requests (new), blood_inventory (new)

-- ============================================================
-- 1. AMBULANCES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS ambulances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    vehicle_number VARCHAR(50) NOT NULL,
    driver_name VARCHAR(255) NOT NULL,
    driver_phone VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Available'
        CHECK (status IN ('Available','Dispatched','En-Route','At-Scene','Returning','Out-of-Service')),
    current_location TEXT,
    last_dispatched_at TIMESTAMPTZ,
    equipment_level VARCHAR(20) DEFAULT 'Basic'
        CHECK (equipment_level IN ('Basic','Advanced','ICU')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. EMERGENCY_REQUESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS emergency_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    caller_name VARCHAR(255) NOT NULL,
    caller_phone VARCHAR(50) NOT NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'Medium'
        CHECK (priority IN ('Low','Medium','High','Critical')),
    status VARCHAR(30) DEFAULT 'Received'
        CHECK (status IN ('Received','Acknowledged','Dispatched','In-Transit','Arrived','Resolved','Cancelled')),
    assigned_ambulance_id UUID REFERENCES ambulances(id) ON DELETE SET NULL,
    pickup_location TEXT NOT NULL,
    destination_facility TEXT,
    dispatched_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. BLOOD_INVENTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS blood_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    blood_group VARCHAR(5) NOT NULL
        CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    component VARCHAR(30) DEFAULT 'Whole Blood'
        CHECK (component IN ('Whole Blood','Packed RBCs','Platelets','Plasma','Cryoprecipitate')),
    units_available INTEGER DEFAULT 0,
    units_reserved INTEGER DEFAULT 0,
    expiry_date DATE NOT NULL,
    donor_name VARCHAR(255),
    donor_phone VARCHAR(50),
    collection_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'Available'
        CHECK (status IN ('Available','Reserved','Expired','Used')),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. BLOOD_REQUESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS blood_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    patient_name VARCHAR(255) NOT NULL,
    blood_group VARCHAR(5) NOT NULL
        CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    component VARCHAR(30) DEFAULT 'Whole Blood',
    units_requested INTEGER NOT NULL DEFAULT 1,
    urgency VARCHAR(20) DEFAULT 'Routine'
        CHECK (urgency IN ('Routine','Urgent','Emergency')),
    status VARCHAR(30) DEFAULT 'Pending'
        CHECK (status IN ('Pending','Fulfilled','Partially-Fulfilled','Cancelled')),
    requested_by VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. FACILITIES TABLE (nearby hospitals / trauma centers)
-- ============================================================
CREATE TABLE IF NOT EXISTS facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL
        CHECK (type IN ('Hospital','Trauma Center','ICU','Blood Bank','Pharmacy','Diagnostic Lab')),
    address TEXT NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(100),
    distance VARCHAR(50),
    icu_beds_available INTEGER,
    emergency_capable BOOLEAN DEFAULT FALSE,
    operating_hours VARCHAR(100),
    specialties TEXT[],
    lat NUMERIC(10,7),
    lng NUMERIC(10,7),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. ADD appointment status columns (triage, token)
-- ============================================================
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS token_number INTEGER;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS triage_priority VARCHAR(20)
    DEFAULT 'Normal' CHECK (triage_priority IN ('Normal','Urgent','Critical'));
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE;

-- ============================================================
-- 7. RLS POLICIES — every new table scoped by clinic_id
-- ============================================================
ALTER TABLE ambulances ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

-- Ambulances
CREATE POLICY ambulances_clinic_isolation ON ambulances
    USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- Emergency Requests
CREATE POLICY emergency_requests_clinic_isolation ON emergency_requests
    USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- Blood Inventory
CREATE POLICY blood_inventory_clinic_isolation ON blood_inventory
    USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- Blood Requests
CREATE POLICY blood_requests_clinic_isolation ON blood_requests
    USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- Facilities
CREATE POLICY facilities_clinic_isolation ON facilities
    USING (clinic_id IN (SELECT clinic_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- 8. UPDATE ROLES to new platform roles
-- ============================================================
-- Skipped UPDATE roles to avoid unique constraint violations
-- if the database was already partially seeded.
