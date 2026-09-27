-- =============================================================
-- JIVA — Unified Care Platform
-- Seed Data for Live Demo (Phase 3)
--
-- Populates: patients, appointments, ambulances, emergency_requests,
-- blood_inventory, blood_requests, facilities
-- Uses a single demo clinic_id.
-- =============================================================

-- Replace this with the actual clinic UUID from your Supabase project
-- or run after the clinic is created via the register flow.
DO $$
DECLARE
  _clinic_id uuid;
BEGIN
  -- Try to find an existing clinic, or create one
  SELECT id INTO _clinic_id FROM public.clinics LIMIT 1;

  IF _clinic_id IS NULL THEN
    INSERT INTO public.clinics (id, name, address, phone, email, is_active, working_days, opening_time, closing_time, appointment_duration_minutes, holidays, emergency_contact)
    VALUES (
      gen_random_uuid(),
      'JIVA Demo Clinic',
      '42 MG Road, Koramangala, Bangalore 560034',
      '+91 80 2222 3333',
      'admin@jivaclinic.in',
      true,
      ARRAY['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
      '08:00',
      '20:00',
      15,
      ARRAY['2026-01-26','2026-08-15','2026-10-02'],
      '+91 80 9999 0000'
    )
    RETURNING id INTO _clinic_id;
  END IF;

  -- ─── Patients ──────────────────────────────────────────────
  INSERT INTO public.patients (clinic_id, name, email, phone, date_of_birth, gender, blood_type, allergies, medical_history, address)
  VALUES
    (_clinic_id, 'Aditi Sharma',    'aditi@example.com',    '+91 98765 43210', '1990-03-14', 'Female', 'B+',  ARRAY['Penicillin'],          ARRAY['Asthma'],           'HSR Layout, Bangalore'),
    (_clinic_id, 'Ravi Kumar',      'ravi.k@example.com',   '+91 98765 43211', '1985-07-22', 'Male',   'O+',  ARRAY[]::text[],              ARRAY['Diabetes Type 2'],  'Indiranagar, Bangalore'),
    (_clinic_id, 'Priya Nair',      'priya.n@example.com',  '+91 98765 43212', '1995-11-01', 'Female', 'A+',  ARRAY['Sulfa drugs'],         ARRAY[]::text[],           'JP Nagar, Bangalore'),
    (_clinic_id, 'Mohammad Aziz',   'aziz@example.com',     '+91 98765 43213', '1978-02-18', 'Male',   'AB-', ARRAY['Latex'],               ARRAY['Hypertension'],     'Whitefield, Bangalore'),
    (_clinic_id, 'Kavitha Reddy',   'kavitha@example.com',  '+91 98765 43214', '1992-09-30', 'Female', 'O-',  ARRAY[]::text[],              ARRAY[]::text[],           'Malleshwaram, Bangalore'),
    (_clinic_id, 'Suresh Babu',     'suresh@example.com',   '+91 98765 43215', '1968-05-12', 'Male',   'A-',  ARRAY['Aspirin','Ibuprofen'], ARRAY['Heart Disease'],    'BTM Layout, Bangalore'),
    (_clinic_id, 'Lakshmi Devi',    'lakshmi@example.com',  '+91 98765 43216', '2000-12-25', 'Female', 'B-',  ARRAY[]::text[],              ARRAY[]::text[],           'Yelahanka, Bangalore'),
    (_clinic_id, 'Arjun Patel',     'arjun@example.com',    '+91 98765 43217', '1988-06-08', 'Male',   'AB+', ARRAY['Codeine'],             ARRAY['Epilepsy'],         'Rajajinagar, Bangalore')
  ON CONFLICT DO NOTHING;

  -- ─── Ambulances ────────────────────────────────────────────
  INSERT INTO public.ambulances (clinic_id, vehicle_number, driver_name, driver_phone, status, equipment_level, current_location)
  VALUES
    (_clinic_id, 'KA-01-AB-1234', 'Ramesh S.',     '+91 99001 11001', 'Available',       'Basic',    'HSR Layout Depot'),
    (_clinic_id, 'KA-01-CD-5678', 'Sunil M.',      '+91 99001 11002', 'Available',       'Advanced', 'Koramangala Base'),
    (_clinic_id, 'KA-01-EF-9012', 'Vikram T.',     '+91 99001 11003', 'Dispatched',      'ICU',      'Enroute to Whitefield'),
    (_clinic_id, 'KA-01-GH-3456', 'Prasad R.',     '+91 99001 11004', 'Available',       'Basic',    'BTM Layout Depot'),
    (_clinic_id, 'KA-01-IJ-7890', 'Karthik N.',    '+91 99001 11005', 'Out-of-Service',  'Advanced', 'Maintenance Bay')
  ON CONFLICT DO NOTHING;

  -- ─── Emergency Requests ────────────────────────────────────
  INSERT INTO public.emergency_requests (clinic_id, caller_name, caller_phone, description, priority, status, pickup_location, destination_facility, notes)
  VALUES
    (_clinic_id, 'Meena R.',     '+91 88001 22001', 'Elderly fall with head injury',    'High',     'Received',      '12th Main, Indiranagar',       'Manipal Hospital',   'Patient conscious but bleeding'),
    (_clinic_id, 'Deepak V.',    '+91 88001 22002', 'Chest pain, difficulty breathing', 'Critical', 'Acknowledged',  'Outer Ring Road, Marathahalli', 'Narayana Health',    'History of cardiac issues'),
    (_clinic_id, 'Sunita K.',    '+91 88001 22003', 'Road accident, multiple injuries', 'High',     'Dispatched',    'Silk Board Junction',           'St. Johns Hospital', 'Two-wheeler collision'),
    (_clinic_id, 'Arun G.',      '+91 88001 22004', 'Seizure episode',                  'Medium',   'Received',      'Jayanagar 4th Block',           NULL,                 'Known epilepsy patient')
  ON CONFLICT DO NOTHING;

  -- ─── Blood Inventory ──────────────────────────────────────
  INSERT INTO public.blood_inventory (clinic_id, blood_group, component, units_available, units_reserved, expiry_date, collection_date, donor_name, status)
  VALUES
    (_clinic_id, 'A+',  'Whole Blood',  12, 2, (CURRENT_DATE + 28), (CURRENT_DATE - 7),  'Donor Camp #41', 'Available'),
    (_clinic_id, 'A-',  'Packed RBCs',   3, 0, (CURRENT_DATE + 21), (CURRENT_DATE - 14), 'Donor Camp #41', 'Available'),
    (_clinic_id, 'B+',  'Whole Blood',  18, 4, (CURRENT_DATE + 35), (CURRENT_DATE - 3),  'Donor Camp #42', 'Available'),
    (_clinic_id, 'B-',  'Platelets',     2, 1, (CURRENT_DATE + 5),  (CURRENT_DATE - 2),  'Walk-in Donor',  'Available'),
    (_clinic_id, 'AB+', 'Plasma',        8, 0, (CURRENT_DATE + 365),(CURRENT_DATE - 30), 'Donor Camp #40', 'Available'),
    (_clinic_id, 'AB-', 'Whole Blood',   1, 0, (CURRENT_DATE + 14), (CURRENT_DATE - 21), 'Walk-in Donor',  'Available'),
    (_clinic_id, 'O+',  'Whole Blood',  25, 6, (CURRENT_DATE + 30), (CURRENT_DATE - 5),  'Mega Camp',      'Available'),
    (_clinic_id, 'O+',  'Packed RBCs',  10, 2, (CURRENT_DATE + 20), (CURRENT_DATE - 10), 'Mega Camp',      'Available'),
    (_clinic_id, 'O-',  'Whole Blood',   4, 1, (CURRENT_DATE + 7),  (CURRENT_DATE - 25), 'Walk-in Donor',  'Available'),
    (_clinic_id, 'O-',  'Cryoprecipitate',2,0, (CURRENT_DATE + 365),(CURRENT_DATE - 60), 'Donor Camp #39', 'Available'),
    (_clinic_id, 'A+',  'Platelets',     6, 0, (CURRENT_DATE + 4),  (CURRENT_DATE - 1),  'Donor Camp #42', 'Available'),
    (_clinic_id, 'B+',  'Plasma',       15, 3, (CURRENT_DATE + 365),(CURRENT_DATE - 20), 'Mega Camp',      'Available')
  ON CONFLICT DO NOTHING;

  -- ─── Blood Requests ────────────────────────────────────────
  INSERT INTO public.blood_requests (clinic_id, patient_name, blood_group, component, units_requested, urgency, status, requested_by, notes)
  VALUES
    (_clinic_id, 'Ravi Kumar',     'O+',  'Whole Blood',  2, 'Urgent',    'Pending',   'Dr. Mehra',    'Pre-surgical requirement'),
    (_clinic_id, 'Mohammad Aziz',  'AB-', 'Packed RBCs',  1, 'Emergency', 'Pending',   'Dr. Shetty',   'Severe anemia, immediate'),
    (_clinic_id, 'Priya Nair',     'A+',  'Platelets',    3, 'Routine',   'Fulfilled', 'Dr. Rao',      'Post-chemotherapy support')
  ON CONFLICT DO NOTHING;

  -- ─── Facilities (nearby hospitals / trauma centers) ────────
  INSERT INTO public.facilities (clinic_id, name, type, address, phone, email, distance, icu_beds_available, emergency_capable, operating_hours, specialties)
  VALUES
    (_clinic_id, 'Manipal Hospital Bangalore',     'Hospital',       '98 HAL Airport Road, Bangalore 560017',       '+91 80 2502 4444', 'info@manipal.edu',      '3.2 km', 24, true,  '24/7',          ARRAY['Cardiology','Neurology','Oncology','Orthopedics']),
    (_clinic_id, 'Narayana Health City',            'Hospital',       'Bommasandra, Hosur Road, Bangalore 560099',   '+91 80 2783 5000', 'info@narayana.com',     '12 km',  40, true,  '24/7',          ARRAY['Cardiac Surgery','Nephrology','Gastroenterology']),
    (_clinic_id, 'St. Johns Medical College',       'Trauma Center',  'Sarjapur Road, Bangalore 560034',             '+91 80 2206 5000', 'admin@stjohns.in',      '4.5 km', 18, true,  '24/7',          ARRAY['Trauma','Emergency Medicine','General Surgery']),
    (_clinic_id, 'Bangalore Blood Bank',            'Blood Bank',     'Race Course Road, Bangalore 560001',          '+91 80 2226 1111', 'bbb@redcross.in',       '6 km',   NULL, false, '08:00–20:00', ARRAY['Blood Components','Plateletpheresis']),
    (_clinic_id, 'Apollo Pharmacy - Koramangala',   'Pharmacy',       '5th Block, Koramangala, Bangalore 560034',    '+91 80 2553 0000', NULL,                    '0.8 km', NULL, false, '08:00–22:00', ARRAY['24h Emergency Stock','OTC']),
    (_clinic_id, 'SRL Diagnostics',                 'Diagnostic Lab', 'Church Street, Bangalore 560001',             '+91 80 4040 8080', 'blr@srl.in',            '5 km',   NULL, false, '07:00–19:00', ARRAY['Pathology','Radiology','Molecular Diagnostics']),
    (_clinic_id, 'NIMHANS Trauma Centre',           'Trauma Center',  'Hosur Road, Bangalore 560029',                '+91 80 2699 5000', 'trauma@nimhans.ac.in',  '8 km',   30, true,  '24/7',          ARRAY['Neurotrauma','Spinal Injuries','Burns']),
    (_clinic_id, 'Jayadeva Institute of Cardiology','ICU',            'Jayanagar 9th Block, Bangalore 560069',       '+91 80 2653 4400', 'info@jayadeva.org',     '5.5 km', 50, true,  '24/7',          ARRAY['Cardiology','Interventional Cardiology','CICU'])
  ON CONFLICT DO NOTHING;

  -- ─── Appointments ──────────────────────────────────────────
  -- We fetch a couple of patient UUIDs to tie the appointments
  DECLARE
    _patient1 uuid;
    _patient2 uuid;
  BEGIN
    SELECT id INTO _patient1 FROM public.patients WHERE email = 'aditi@example.com' LIMIT 1;
    SELECT id INTO _patient2 FROM public.patients WHERE email = 'ravi.k@example.com' LIMIT 1;
    
    IF _patient1 IS NOT NULL THEN
      INSERT INTO public.appointments (clinic_id, patient_id, patient_name, physician_id, physician_name, date_time, duration_minutes, status, reason, triage_priority)
      VALUES
        (_clinic_id, _patient1, 'Aditi Sharma', 'dr-001', 'Dr. Rajesh Kapoor', CURRENT_TIMESTAMP + interval '1 day', 30, 'Scheduled', 'Routine checkup', 'Routine'),
        (_clinic_id, _patient1, 'Aditi Sharma', 'dr-002', 'Dr. Ananya Mehta', CURRENT_TIMESTAMP - interval '10 days', 30, 'Completed', 'Fever and cough', 'Urgent');
    END IF;

    IF _patient2 IS NOT NULL THEN
      INSERT INTO public.appointments (clinic_id, patient_id, patient_name, physician_id, physician_name, date_time, duration_minutes, status, reason, triage_priority)
      VALUES
        (_clinic_id, _patient2, 'Ravi Kumar', 'dr-001', 'Dr. Rajesh Kapoor', CURRENT_TIMESTAMP + interval '2 hours', 45, 'In Progress', 'Diabetes follow-up', 'Urgent');
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Skipped appointments seed, possibly patients not found';
  END;

  RAISE NOTICE 'JIVA seed data loaded for clinic %', _clinic_id;
END $$;

