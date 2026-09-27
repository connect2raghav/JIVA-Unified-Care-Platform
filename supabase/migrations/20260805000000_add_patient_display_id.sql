-- Add display_id to patients table

-- 1. Create a sequence for the display ID
CREATE SEQUENCE IF NOT EXISTS patient_display_id_seq START 1;

-- 2. Add the display_id column
ALTER TABLE patients ADD COLUMN IF NOT EXISTS display_id VARCHAR(20) UNIQUE;

-- 3. Function to automatically generate display_id
CREATE OR REPLACE FUNCTION set_patient_display_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.display_id IS NULL THEN
        NEW.display_id := 'PAT-' || LPAD(nextval('patient_display_id_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger to apply the function before insert
DROP TRIGGER IF EXISTS trigger_set_patient_display_id ON patients;
CREATE TRIGGER trigger_set_patient_display_id
BEFORE INSERT ON patients
FOR EACH ROW
EXECUTE FUNCTION set_patient_display_id();

-- 5. Backfill existing patients with a display_id
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT id FROM patients WHERE display_id IS NULL LOOP
        UPDATE patients 
        SET display_id = 'PAT-' || LPAD(nextval('patient_display_id_seq')::TEXT, 4, '0') 
        WHERE id = rec.id;
    END LOOP;
END $$;
