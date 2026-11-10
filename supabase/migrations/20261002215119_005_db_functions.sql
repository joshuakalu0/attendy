/*
# Database Functions: Profile Creation, Permission Lookup, Audit Logging

## Overview
Creates SECURITY DEFINER functions that handle privileged operations safely:
1. handle_new_user - auto-creates a profile when a new auth user signs up
2. get_user_permissions - returns all permission keys for the current user
3. get_user_enterprise - returns the enterprise and role info for the current user
4. log_audit_event - inserts an audit log entry (callable by any authenticated user)
5. check_seat_limit - checks if an enterprise can invite more employees

## Functions
1. handle_new_user(): Triggered on auth.users INSERT. Creates a profile row
   with the user's email and default account_type = 'normal_user'.

2. get_user_permissions(): Returns an array of permission key strings for the
   calling user. Checks memberships and role_permissions. Also includes
   permissions from the account_type's default role for non-enterprise users.

3. get_user_enterprise(): Returns a JSON object with enterprise_id, role_id,
   role_name, and membership status for the calling user's active membership.

4. log_audit_event(): Inserts an audit log row. Parameters: action, resource_type,
   resource_id, details, enterprise_id (optional).

5. check_seat_limit(): Returns boolean whether enterprise can add more members.

## Security
- All functions are SECURITY DEFINER with search_path set to public.
- handle_new_user is a trigger on auth.users.
- get_user_permissions and get_user_enterprise are callable by authenticated users.
- log_audit_event is callable by authenticated users.
- check_seat_limit is callable by authenticated users.
*/

-- ============================================================
-- handle_new_user: Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normal_user_type_id uuid;
BEGIN
  SELECT id INTO normal_user_type_id FROM account_types WHERE key = 'normal_user' LIMIT 1;
  INSERT INTO profiles (user_id, email, account_type_id)
  VALUES (NEW.id, NEW.email, normal_user_type_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- get_user_permissions: Returns permission keys for current user
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_permissions()
RETURNS text[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Collect permissions from active enterprise memberships
  SELECT COALESCE(array_agg(DISTINCT p.key), ARRAY[]::text[])
  FROM memberships m
  JOIN role_permissions rp ON rp.role_id = m.role_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE m.user_id = auth.uid()
  AND m.status = 'active'

  UNION

  -- Collect permissions from the account_type's default role (for non-enterprise users)
  SELECT COALESCE(array_agg(DISTINCT p.key), ARRAY[]::text[])
  FROM profiles pr
  JOIN account_types at ON at.id = pr.account_type_id
  LEFT JOIN roles r ON r.id = at.default_role_id
  LEFT JOIN role_permissions rp ON rp.role_id = r.id
  LEFT JOIN permissions p ON p.id = rp.permission_id
  WHERE pr.user_id = auth.uid()
  AND p.key IS NOT NULL;
$$;

-- Grant execute to authenticated
GRANT EXECUTE ON FUNCTION public.get_user_permissions() TO authenticated;

-- ============================================================
-- get_user_enterprise: Returns enterprise + role info for current user
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_enterprise()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(json_agg(json_build_object(
    'enterprise_id', m.enterprise_id,
    'role_id', m.role_id,
    'role_name', r.name,
    'membership_id', m.id,
    'status', m.status,
    'department_id', m.department_id,
    'is_owner', e.owner_id = m.user_id
  )), '[]'::json)
  FROM memberships m
  JOIN roles r ON r.id = m.role_id
  JOIN enterprises e ON e.id = m.enterprise_id
  WHERE m.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_user_enterprise() TO authenticated;

-- ============================================================
-- log_audit_event: Inserts an audit log entry
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action text,
  p_resource_type text DEFAULT NULL,
  p_resource_id text DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_enterprise_id uuid DEFAULT NULL,
  p_impersonated_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id uuid;
  v_actor_email text;
BEGIN
  SELECT email INTO v_actor_email FROM profiles WHERE user_id = auth.uid() LIMIT 1;

  INSERT INTO audit_logs (
    actor_id, actor_email, action, resource_type, resource_id,
    details, enterprise_id, impersonated_by
  )
  VALUES (
    auth.uid(), v_actor_email, p_action, p_resource_type, p_resource_id,
    p_details, p_enterprise_id, p_impersonated_by
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_audit_event TO authenticated;

-- ============================================================
-- check_seat_limit: Checks if enterprise can add more employees
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_seat_limit(p_enterprise_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_employees integer;
  v_current_count integer;
  v_plan_id uuid;
BEGIN
  -- Get the enterprise's plan
  SELECT plan_id INTO v_plan_id FROM enterprises WHERE id = p_enterprise_id;
  IF v_plan_id IS NULL THEN
    RETURN true; -- No plan = no limit
  END IF;

  -- Get max employees from plan
  SELECT max_employees INTO v_max_employees FROM plans WHERE id = v_plan_id;
  IF v_max_employees IS NULL THEN
    RETURN true; -- NULL = unlimited
  END IF;

  -- Count current active + invited members
  SELECT COUNT(*) INTO v_current_count
  FROM memberships
  WHERE enterprise_id = p_enterprise_id
  AND status IN ('active', 'invited');

  RETURN v_current_count < v_max_employees;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_seat_limit(uuid) TO authenticated;

-- ============================================================
-- get_user_profile: Returns full profile info for current user
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_profile()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'id', p.id,
    'user_id', p.user_id,
    'email', p.email,
    'full_name', p.full_name,
    'avatar_url', p.avatar_url,
    'phone', p.phone,
    'status', p.status,
    'account_type', at.key,
    'account_type_label', at.label,
    'dashboard_route', at.dashboard_route,
    'two_factor_enabled', p.two_factor_enabled,
    'notification_prefs', p.notification_prefs,
    'theme', p.theme,
    'language', p.language,
    'timezone', p.timezone,
    'created_at', p.created_at
  )
  FROM profiles p
  LEFT JOIN account_types at ON at.id = p.account_type_id
  WHERE p.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_user_profile() TO authenticated;
