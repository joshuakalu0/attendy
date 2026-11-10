-- Fix: Create a SECURITY DEFINER function for enterprise registration
-- After signUp with email confirmation ON, the user has no session.
-- All subsequent client-side inserts (enterprise, membership, profile update)
-- fail because RLS blocks anon. This function handles all three atomically
-- with elevated privileges.

CREATE OR REPLACE FUNCTION public.register_enterprise(
  p_user_id uuid,
  p_full_name text,
  p_email text,
  p_enterprise_name text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enterprise_id uuid;
  v_owner_role_id uuid;
  v_ent_type_id uuid;
BEGIN
  -- 1. Create the enterprise
  INSERT INTO enterprises (name, owner_id, contact_email, subscription_status)
  VALUES (p_enterprise_name, p_user_id, p_email, 'none')
  RETURNING id INTO v_enterprise_id;

  -- 2. Get the Enterprise Owner role
  SELECT id INTO v_owner_role_id FROM roles WHERE name = 'Enterprise Owner' AND is_system = true;

  -- 3. Create membership as owner
  IF v_owner_role_id IS NOT NULL THEN
    INSERT INTO memberships (user_id, enterprise_id, role_id, status)
    VALUES (p_user_id, v_enterprise_id, v_owner_role_id, 'active');
  END IF;

  -- 4. Update profile with enterprise account type
  SELECT id INTO v_ent_type_id FROM account_types WHERE key = 'enterprise';
  IF v_ent_type_id IS NOT NULL THEN
    UPDATE profiles SET full_name = p_full_name, account_type_id = v_ent_type_id
    WHERE user_id = p_user_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'enterprise_id', v_enterprise_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_enterprise(uuid, text, text, text) TO anon, authenticated;
