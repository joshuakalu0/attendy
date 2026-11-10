/*
# Super Admin platform-wide access policies

1. New Function
- is_super_admin(): returns true if current user's profile is linked to account_types row with key = 'super_admin'
- SECURITY DEFINER so it bypasses RLS when checking the profiles table
- Used in RLS policies across monitoring/management tables

2. Security Changes
- Super admins get SELECT on monitoring tables: meetings, meeting_attendees, attendance_records, payment_gateways, memberships, branches, departments, enterprises, profiles, subscriptions
- Super admins get UPDATE on enterprises, profiles, subscriptions, plans
- Super admins get INSERT/DELETE on plans
- All policies use is_super_admin() check so only actual super_admin users get access
*/

-- Helper function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    JOIN account_types at ON at.id = p.account_type_id
    WHERE p.user_id = auth.uid()
    AND at.key = 'super_admin'
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- === SELECT (monitoring) policies for super admin ===

DROP POLICY IF EXISTS "sa_select_meetings" ON meetings;
CREATE POLICY "sa_select_meetings" ON meetings FOR SELECT
TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "sa_select_meeting_attendees" ON meeting_attendees;
CREATE POLICY "sa_select_meeting_attendees" ON meeting_attendees FOR SELECT
TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "sa_select_attendance" ON attendance_records;
CREATE POLICY "sa_select_attendance" ON attendance_records FOR SELECT
TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "sa_select_payment_gateways" ON payment_gateways;
CREATE POLICY "sa_select_payment_gateways" ON payment_gateways FOR SELECT
TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "sa_select_memberships" ON memberships;
CREATE POLICY "sa_select_memberships" ON memberships FOR SELECT
TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "sa_select_branches" ON branches;
CREATE POLICY "sa_select_branches" ON branches FOR SELECT
TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "sa_select_departments" ON departments;
CREATE POLICY "sa_select_departments" ON departments FOR SELECT
TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "sa_select_enterprises" ON enterprises;
CREATE POLICY "sa_select_enterprises" ON enterprises FOR SELECT
TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "sa_select_profiles" ON profiles;
CREATE POLICY "sa_select_profiles" ON profiles FOR SELECT
TO authenticated USING (public.is_super_admin());

DROP POLICY IF EXISTS "sa_select_subscriptions" ON subscriptions;
CREATE POLICY "sa_select_subscriptions" ON subscriptions FOR SELECT
TO authenticated USING (public.is_super_admin());

-- === UPDATE (management) policies for super admin ===

DROP POLICY IF EXISTS "sa_update_enterprises" ON enterprises;
CREATE POLICY "sa_update_enterprises" ON enterprises FOR UPDATE
TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "sa_update_profiles" ON profiles;
CREATE POLICY "sa_update_profiles" ON profiles FOR UPDATE
TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "sa_update_subscriptions" ON subscriptions;
CREATE POLICY "sa_update_subscriptions" ON subscriptions FOR UPDATE
TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "sa_update_plans" ON plans;
CREATE POLICY "sa_update_plans" ON plans FOR UPDATE
TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "sa_insert_plans" ON plans;
CREATE POLICY "sa_insert_plans" ON plans FOR INSERT
TO authenticated WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "sa_delete_plans" ON plans;
CREATE POLICY "sa_delete_plans" ON plans FOR DELETE
TO authenticated USING (public.is_super_admin());
