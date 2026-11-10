/*
# Phase 2: Branches Module — Schema, RLS, and Functions

## Overview
Creates the branches table, branch_assignments table, and supporting functions for the
geofenced attendance system. Branches are enterprise-scoped locations with geofence
parameters (center point + radius), timezone, and working hours.

## New Tables
1. branches — Enterprise locations with geofence, timezone, working hours
2. branch_assignments — Links users to branches with a role (manager or staff)

## New Functions
1. check_branch_limit(p_enterprise_id) — Checks max_branches plan limit
2. get_managed_branch_ids(p_user_id, p_enterprise_id) — Returns branch IDs a user manages
3. get_user_branch_ids(p_user_id, p_enterprise_id) — Returns branch IDs a user is assigned to
4. verify_geofence(p_branch_id, p_lat, p_lng, p_accuracy) — Haversine-based geofence check

## Security
- RLS on branches: enterprise members can read; branches.manage permission for CRUD
- RLS on branch_assignments: enterprise members can read; branches.manage for assignments
- All functions are SECURITY DEFINER with search_path = public
*/

-- ============================================================
-- BRANCHES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  geofence_lat double precision NOT NULL,
  geofence_lng double precision NOT NULL,
  geofence_radius_m integer NOT NULL DEFAULT 100,
  timezone text NOT NULL DEFAULT 'UTC',
  working_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  late_grace_minutes integer NOT NULL DEFAULT 0,
  early_leave_minutes integer NOT NULL DEFAULT 0,
  min_gps_accuracy_m integer NOT NULL DEFAULT 50,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enterprise_id, name)
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- Enterprise members can read branches
DROP POLICY IF EXISTS "branches_select_enterprise" ON branches;
CREATE POLICY "branches_select_enterprise"
  ON branches FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.enterprise_id = branches.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
    )
  );

-- Super admin can read all branches
DROP POLICY IF EXISTS "branches_select_super_admin" ON branches;
CREATE POLICY "branches_select_super_admin"
  ON branches FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

-- Enterprise admins with branches.manage can create
DROP POLICY IF EXISTS "branches_insert_enterprise" ON branches;
CREATE POLICY "branches_insert_enterprise"
  ON branches FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = branches.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'branches.manage'
    )
  );

-- Enterprise admins with branches.manage can update
DROP POLICY IF EXISTS "branches_update_enterprise" ON branches;
CREATE POLICY "branches_update_enterprise"
  ON branches FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = branches.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'branches.manage'
    )
  );

-- Enterprise admins with branches.manage can delete
DROP POLICY IF EXISTS "branches_delete_enterprise" ON branches;
CREATE POLICY "branches_delete_enterprise"
  ON branches FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = branches.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'branches.manage'
    )
  );

-- ============================================================
-- BRANCH ASSIGNMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS branch_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  assignment_type text NOT NULL DEFAULT 'staff'
    CHECK (assignment_type IN ('manager', 'staff')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, user_id)
);

ALTER TABLE branch_assignments ENABLE ROW LEVEL SECURITY;

-- Enterprise members can read assignments in their enterprise
DROP POLICY IF EXISTS "branch_assign_select_enterprise" ON branch_assignments;
CREATE POLICY "branch_assign_select_enterprise"
  ON branch_assignments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.enterprise_id = branch_assignments.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
    )
  );

-- Super admin can read all
DROP POLICY IF EXISTS "branch_assign_select_super_admin" ON branch_assignments;
CREATE POLICY "branch_assign_select_super_admin"
  ON branch_assignments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

-- Users can read their own assignments
DROP POLICY IF EXISTS "branch_assign_select_own" ON branch_assignments;
CREATE POLICY "branch_assign_select_own"
  ON branch_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Enterprise admins with branches.manage can create assignments
DROP POLICY IF EXISTS "branch_assign_insert_enterprise" ON branch_assignments;
CREATE POLICY "branch_assign_insert_enterprise"
  ON branch_assignments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = branch_assignments.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'branches.manage'
    )
  );

-- Enterprise admins with branches.manage can delete assignments
DROP POLICY IF EXISTS "branch_assign_delete_enterprise" ON branch_assignments;
CREATE POLICY "branch_assign_delete_enterprise"
  ON branch_assignments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = branch_assignments.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'branches.manage'
    )
  );

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_branches_enterprise_id ON branches(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_branches_active ON branches(is_active);
CREATE INDEX IF NOT EXISTS idx_branch_assign_branch_id ON branch_assignments(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_assign_user_id ON branch_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_branch_assign_enterprise_id ON branch_assignments(enterprise_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- check_branch_limit: Checks if enterprise can add more branches
CREATE OR REPLACE FUNCTION public.check_branch_limit(p_enterprise_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_branches integer;
  v_current_count integer;
  v_plan_id uuid;
BEGIN
  SELECT plan_id INTO v_plan_id FROM enterprises WHERE id = p_enterprise_id;
  IF v_plan_id IS NULL THEN
    RETURN true;
  END IF;

  SELECT max_branches INTO v_max_branches FROM plans WHERE id = v_plan_id;
  IF v_max_branches IS NULL THEN
    RETURN true;
  END IF;

  SELECT COUNT(*) INTO v_current_count
  FROM branches
  WHERE enterprise_id = p_enterprise_id
  AND is_active = true;

  RETURN v_current_count < v_max_branches;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_branch_limit(uuid) TO authenticated;

-- get_managed_branch_ids: Returns branch IDs a user manages
CREATE OR REPLACE FUNCTION public.get_managed_branch_ids(p_user_id uuid, p_enterprise_id uuid)
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(branch_id), ARRAY[]::uuid[])
  FROM branch_assignments
  WHERE user_id = p_user_id
  AND enterprise_id = p_enterprise_id
  AND assignment_type = 'manager';
$$;

GRANT EXECUTE ON FUNCTION public.get_managed_branch_ids(uuid, uuid) TO authenticated;

-- get_user_branch_ids: Returns all branch IDs a user is assigned to
CREATE OR REPLACE FUNCTION public.get_user_branch_ids(p_user_id uuid, p_enterprise_id uuid)
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(branch_id), ARRAY[]::uuid[])
  FROM branch_assignments
  WHERE user_id = p_user_id
  AND enterprise_id = p_enterprise_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_branch_ids(uuid, uuid) TO authenticated;

-- verify_geofence: Haversine-based geofence check
CREATE OR REPLACE FUNCTION public.verify_geofence(
  p_branch_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_accuracy double precision DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch RECORD;
  v_distance_m double precision;
  v_earth_radius_m double precision := 6371000.0;
  v_dlat double precision;
  v_dlng double precision;
  v_a double precision;
  v_c double precision;
BEGIN
  SELECT geofence_lat, geofence_lng, geofence_radius_m, min_gps_accuracy_m, timezone, is_active
  INTO v_branch
  FROM branches
  WHERE id = p_branch_id;

  IF NOT FOUND THEN
    RETURN json_build_object('verdict', 'invalid_branch', 'message', 'Branch not found');
  END IF;

  IF NOT v_branch.is_active THEN
    RETURN json_build_object('verdict', 'branch_inactive', 'message', 'Branch is inactive');
  END IF;

  -- Check GPS accuracy
  IF p_accuracy IS NOT NULL AND p_accuracy > v_branch.min_gps_accuracy_m THEN
    RETURN json_build_object(
      'verdict', 'low_accuracy',
      'message', 'GPS accuracy too low. Required: ' || v_branch.min_gps_accuracy_m || 'm, got: ' || p_accuracy || 'm',
      'min_accuracy', v_branch.min_gps_accuracy_m,
      'provided_accuracy', p_accuracy
    );
  END IF;

  -- Haversine formula
  v_dlat := radians(p_lat - v_branch.geofence_lat);
  v_dlng := radians(p_lng - v_branch.geofence_lng);
  v_a := sin(v_dlat / 2) * sin(v_dlat / 2) +
         cos(radians(v_branch.geofence_lat)) * cos(radians(p_lat)) *
         sin(v_dlng / 2) * sin(v_dlng / 2);
  v_c := 2 * atan2(sqrt(v_a), sqrt(1 - v_a));
  v_distance_m := v_earth_radius_m * v_c;

  IF v_distance_m <= v_branch.geofence_radius_m THEN
    RETURN json_build_object(
      'verdict', 'inside',
      'distance_m', round(v_distance_m::numeric, 1),
      'radius_m', v_branch.geofence_radius_m,
      'timezone', v_branch.timezone
    );
  ELSE
    RETURN json_build_object(
      'verdict', 'outside',
      'distance_m', round(v_distance_m::numeric, 1),
      'radius_m', v_branch.geofence_radius_m,
      'message', 'You are ' || round(v_distance_m::numeric, 0) || 'm away. Must be within ' || v_branch.geofence_radius_m || 'm.'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_geofence(uuid, double precision, double precision, double precision) TO authenticated;
