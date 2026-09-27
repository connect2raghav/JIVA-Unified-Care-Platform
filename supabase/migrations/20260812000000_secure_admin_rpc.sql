-- Secure create_user_admin RPC to enforce authorization and isolation
CREATE OR REPLACE FUNCTION public.create_user_admin(
    p_id UUID,
    p_email TEXT,
    p_password TEXT,
    p_name TEXT,
    p_role TEXT,
    p_phone TEXT,
    p_clinic_id UUID DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_role_id UUID;
    v_clinic_id UUID;
    v_caller_role TEXT;
    v_caller_clinic_id UUID;
BEGIN
    -- Get caller info
    v_caller_role := get_current_user_role();
    v_caller_clinic_id := get_current_user_clinic_id();

    -- Use provided clinic_id or fallback to default
    IF p_clinic_id IS NOT NULL THEN
        v_clinic_id := p_clinic_id;
    ELSE
        v_clinic_id := '00000000-0000-0000-0000-000000000001'; -- default clinic
    END IF;

    -- Security Checks
    IF v_caller_role = 'Super Admin' THEN
        -- Super Admins can do anything
        NULL;
    ELSIF v_caller_role IN ('Administrator', 'Dentist') THEN
        -- They can only create users in their own clinic
        IF v_clinic_id != v_caller_clinic_id THEN
            RAISE EXCEPTION 'Not authorized to create users in other clinics';
        END IF;
        -- They cannot create Super Admins
        IF p_role = 'Super Admin' THEN
            RAISE EXCEPTION 'Not authorized to create Super Admins';
        END IF;
    ELSE
        RAISE EXCEPTION 'Not authorized to create users';
    END IF;

    -- Get role_id matching the role name
    SELECT id INTO v_role_id FROM public.roles WHERE name = p_role LIMIT 1;
    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'Role % not found', p_role;
    END IF;

    -- Insert user into auth.users (Supabase Authentication schema)
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        aud,
        role,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
    )
    VALUES (
        p_id,
        '00000000-0000-0000-0000-000000000000',
        p_email,
        crypt(p_password, gen_salt('bf', 10)),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        json_build_object('name', p_name),
        'authenticated',
        'authenticated',
        NOW(),
        NOW(),
        '', '', '', ''
    );

    -- Insert user into public.users (Application profiles schema)
    INSERT INTO public.users (
        id,
        clinic_id,
        email,
        name,
        role_id,
        role,
        is_active,
        is_locked,
        created_at,
        updated_at
    )
    VALUES (
        p_id,
        v_clinic_id,
        p_email,
        p_name,
        v_role_id,
        p_role,
        true,
        false,
        NOW(),
        NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Secure delete_user_admin RPC
CREATE OR REPLACE FUNCTION public.delete_user_admin(p_id UUID)
RETURNS void AS $$
DECLARE
    v_caller_role TEXT;
    v_caller_clinic_id UUID;
    v_target_clinic_id UUID;
BEGIN
    v_caller_role := get_current_user_role();
    v_caller_clinic_id := get_current_user_clinic_id();
    
    SELECT clinic_id INTO v_target_clinic_id FROM public.users WHERE id = p_id;

    IF v_caller_role = 'Super Admin' THEN
        -- Allow
        NULL;
    ELSIF v_caller_role IN ('Administrator', 'Dentist') THEN
        IF v_target_clinic_id != v_caller_clinic_id THEN
            RAISE EXCEPTION 'Not authorized to delete users in other clinics';
        END IF;
    ELSE
        RAISE EXCEPTION 'Not authorized to delete users';
    END IF;

    DELETE FROM public.users WHERE id = p_id;
    DELETE FROM auth.users WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
