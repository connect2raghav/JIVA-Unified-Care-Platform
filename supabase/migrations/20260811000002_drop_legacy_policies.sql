DO $$
DECLARE
    row record;
BEGIN
    FOR row IN 
        SELECT polname, polrelid::regclass AS table_name 
        FROM pg_policy 
        WHERE polname = 'allow_authenticated_all'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %s', row.polname, row.table_name);
    END LOOP;
END
$$;
