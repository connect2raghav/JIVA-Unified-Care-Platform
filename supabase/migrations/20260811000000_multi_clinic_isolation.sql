-- -----------------------------------------------------------------------------
-- AUTOMATIC CLINIC_ID ASSIGNMENT
-- -----------------------------------------------------------------------------

-- Trigger function to set clinic_id from the authenticated user
CREATE OR REPLACE FUNCTION set_patient_clinic_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-set if the clinic_id is not already provided (or is null)
  -- and if the user performing the insert has a clinic_id.
  IF NEW.clinic_id IS NULL THEN
    NEW.clinic_id := get_current_user_clinic_id();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for patients table
DROP TRIGGER IF EXISTS trg_set_patient_clinic_id ON patients;
CREATE TRIGGER trg_set_patient_clinic_id
BEFORE INSERT ON patients
FOR EACH ROW EXECUTE FUNCTION set_patient_clinic_id();

-- -----------------------------------------------------------------------------
-- ENSURE RLS ENFORCEMENT ON PATIENTS
-- -----------------------------------------------------------------------------

-- If a patient's clinic_id doesn't match the user's clinic_id, RLS should block the insert.
-- The existing policy "Users can manage patients in their own clinic" handles this
-- because FOR ALL policies implicitly check the USING clause for new rows.
