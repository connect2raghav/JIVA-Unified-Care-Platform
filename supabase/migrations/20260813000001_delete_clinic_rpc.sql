CREATE OR REPLACE FUNCTION public.delete_clinic_admin(p_clinic_id UUID)
RETURNS void AS $$
BEGIN
    -- 1. Delete all users associated with this clinic from auth.users
    -- This handles the email constraint issues by removing the auth identity.
    DELETE FROM auth.users 
    WHERE id IN (SELECT id FROM public.users WHERE clinic_id = p_clinic_id);

    -- 2. Delete all users associated with this clinic from public.users
    -- Depending on foreign key cascades, step 1 might already do this, 
    -- but doing it explicitly ensures no orphaned profiles remain.
    DELETE FROM public.users 
    WHERE clinic_id = p_clinic_id;

    -- 3. Delete the clinic itself
    -- Patients and other related entities should cascade via ON DELETE CASCADE constraints.
    DELETE FROM public.clinics 
    WHERE id = p_clinic_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
