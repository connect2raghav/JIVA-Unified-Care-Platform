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
BEGIN
    -- Get role_id matching the role name
    SELECT id INTO v_role_id FROM public.roles WHERE name = p_role LIMIT 1;
    IF v_role_id IS NULL THEN
        RAISE EXCEPTION 'Role % not found', p_role;
    END IF;

    -- Use provided clinic_id or fallback to default
    IF p_clinic_id IS NOT NULL THEN
        v_clinic_id := p_clinic_id;
    ELSE
        v_clinic_id := '00000000-0000-0000-0000-000000000001'; -- default clinic
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
