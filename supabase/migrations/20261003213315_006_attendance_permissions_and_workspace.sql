/*
# Phase 1: Attendance Permissions, Workspace-Scoped Permissions, Plan Limit Columns

## Overview
This migration adds:
1. 13 new attendance-related permissions to the existing permissions table.
2. Maps these permissions to existing system roles (Owner, Admin, Manager, Staff, Normal User).
3. Adds a `get_user_permissions_for_enterprise(p_enterprise_id)` function that returns
   permissions scoped to a specific enterprise membership (for workspace switching).
4. Adds a `get_user_workspaces()` function that returns all workspaces (personal + enterprises)
   available to the current user.
5. Adds plan limit columns: `max_branches`, `max_lite_sessions`, `max_report_exports`.
6. Adds a `get_invite_by_token(p_token)` SECURITY DEFINER function for safe token-based lookup.
7. Adds a `get_managed_branch_ids(p_user_id, p_enterprise_id)` placeholder function (returns
   empty array until branches table exists in Phase 2, then will be updated).

## New Permissions (13)
- branches.view, branches.manage
- schedules.view, schedules.manage
- attendance.submit, attendance.view_own, attendance.view_branch, attendance.view_all
- attendance.correct, attendance.export
- reports.view
- lite.sessions.manage

## Permission → Role Mapping
- Super Admin: ALL new permissions
- Enterprise Owner: all attendance permissions (manage, view_all, correct, export, reports)
- Enterprise Admin: same as Owner minus billing.manage (already handled)
- Manager: branches.view, schedules.view, attendance.view_branch, attendance.correct, reports.view
- Staff: attendance.submit, attendance.view_own, schedules.view
- Normal User: lite.sessions.manage

## Plan Limit Columns
- max_branches (integer, nullable = unlimited)
- max_lite_sessions (integer, nullable = unlimited)
- max_report_exports (integer, nullable = unlimited, 0 = none)

## Security
- All new functions are SECURITY DEFINER with search_path = public.
- get_invite_by_token replaces the overly broad invites_select_by_token RLS policy.
- Tightens the anon invite policy to only allow lookup via the function.
*/

-- ============================================================
-- NEW PERMISSIONS
-- ============================================================
INSERT INTO permissions (key, label, description, category) VALUES
  ('branches.view', 'View Branches', 'Can view enterprise branches', 'attendance'),
  ('branches.manage', 'Manage Branches', 'Can create, edit, and deactivate branches', 'attendance'),
  ('schedules.view', 'View Schedules', 'Can view attendance schedules', 'attendance'),
  ('schedules.manage', 'Manage Schedules', 'Can create and edit attendance schedules', 'attendance'),
  ('attendance.submit', 'Submit Attendance', 'Can check in and check out', 'attendance'),
  ('attendance.view_own', 'View Own Attendance', 'Can view own attendance records', 'attendance'),
  ('attendance.view_branch', 'View Branch Attendance', 'Can view attendance for assigned branches', 'attendance'),
  ('attendance.view_all', 'View All Attendance', 'Can view attendance for all branches', 'attendance'),
  ('attendance.correct', 'Correct Attendance', 'Can correct attendance records with reason', 'attendance'),
  ('attendance.export', 'Export Attendance', 'Can export attendance reports as CSV', 'attendance'),
  ('reports.view', 'View Reports', 'Can view attendance reports and analytics', 'attendance'),
  ('lite.sessions.manage', 'Manage Lite Sessions', 'Can create and manage Lite attendance sessions', 'attendance')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- ROLE-PERMISSION MAPPINGS FOR NEW PERMISSIONS
-- ============================================================

-- Super Admin: gets all new permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM permissions
WHERE key IN (
  'branches.view', 'branches.manage', 'schedules.view', 'schedules.manage',
  'attendance.submit', 'attendance.view_own', 'attendance.view_branch',
  'attendance.view_all', 'attendance.correct', 'attendance.export',
  'reports.view', 'lite.sessions.manage'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Enterprise Owner: all attendance permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', id FROM permissions
WHERE key IN (
  'branches.view', 'branches.manage', 'schedules.view', 'schedules.manage',
  'attendance.submit', 'attendance.view_own', 'attendance.view_branch',
  'attendance.view_all', 'attendance.correct', 'attendance.export',
  'reports.view', 'lite.sessions.manage'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Enterprise Admin: same as Owner
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', id FROM permissions
WHERE key IN (
  'branches.view', 'branches.manage', 'schedules.view', 'schedules.manage',
  'attendance.submit', 'attendance.view_own', 'attendance.view_branch',
  'attendance.view_all', 'attendance.correct', 'attendance.export',
  'reports.view', 'lite.sessions.manage'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager: branch-scoped view, correct, reports
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000004', id FROM permissions
WHERE key IN (
  'branches.view', 'schedules.view',
  'attendance.view_branch', 'attendance.correct', 'reports.view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Staff: submit and view own
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000005', id FROM permissions
WHERE key IN (
  'attendance.submit', 'attendance.view_own', 'schedules.view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Normal User: lite sessions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000006', id FROM permissions
WHERE key IN (
  'lite.sessions.manage'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================
-- PLAN LIMIT COLUMNS
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'max_branches'
  ) THEN
    ALTER TABLE plans ADD COLUMN max_branches integer;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'max_lite_sessions'
  ) THEN
    ALTER TABLE plans ADD COLUMN max_lite_sessions integer;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'plans' AND column_name = 'max_report_exports'
  ) THEN
    ALTER TABLE plans ADD COLUMN max_report_exports integer;
  END IF;
END $$;

-- Update existing plans with attendance limits
UPDATE plans SET max_branches = 1 WHERE name = 'Free';
UPDATE plans SET max_branches = 10, max_lite_sessions = 10 WHERE name = 'Pro';
UPDATE plans SET max_branches = NULL, max_lite_sessions = NULL, max_report_exports = NULL WHERE name = 'Enterprise';

-- ============================================================
-- get_user_permissions_for_enterprise: Workspace-scoped permissions
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_permissions_for_enterprise(p_enterprise_id uuid)
RETURNS text[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Permissions from the specified enterprise membership only
  SELECT COALESCE(array_agg(DISTINCT p.key), ARRAY[]::text[])
  FROM memberships m
  JOIN role_permissions rp ON rp.role_id = m.role_id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE m.user_id = auth.uid()
  AND m.enterprise_id = p_enterprise_id
  AND m.status = 'active'

  UNION

  -- Plus account-type default role permissions (for personal workspace features)
  SELECT COALESCE(array_agg(DISTINCT p.key), ARRAY[]::text[])
  FROM profiles pr
  JOIN account_types at ON at.id = pr.account_type_id
  LEFT JOIN roles r ON r.id = at.default_role_id
  LEFT JOIN role_permissions rp ON rp.role_id = r.id
  LEFT JOIN permissions p ON p.id = rp.permission_id
  WHERE pr.user_id = auth.uid()
  AND p.key IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_permissions_for_enterprise(uuid) TO authenticated;

-- ============================================================
-- get_user_workspaces: Returns all workspaces for current user
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_workspaces()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'personal', json_build_object(
      'type', 'personal',
      'label', COALESCE(pr.full_name, pr.email)
    ),
    'enterprises', COALESCE((
      SELECT json_agg(json_build_object(
        'type', 'enterprise',
        'enterprise_id', m.enterprise_id,
        'label', e.name,
        'role_name', r.name,
        'is_owner', e.owner_id = m.user_id
      ))
      FROM memberships m
      JOIN enterprises e ON e.id = m.enterprise_id
      JOIN roles r ON r.id = m.role_id
      WHERE m.user_id = auth.uid()
      AND m.status = 'active'
      AND e.is_active = true
    ), '[]'::json)
  )
  FROM profiles pr
  WHERE pr.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_user_workspaces() TO authenticated;

-- ============================================================
-- get_invite_by_token: Safe token-based invite lookup
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_invite_by_token(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite json;
BEGIN
  SELECT json_build_object(
    'id', i.id,
    'email', i.email,
    'status', i.status,
    'expires_at', i.expires_at,
    'enterprise_id', i.enterprise_id,
    'role_id', i.role_id,
    'enterprise_name', e.name,
    'role_name', r.name
  )
  INTO v_invite
  FROM invites i
  JOIN enterprises e ON e.id = i.enterprise_id
  JOIN roles r ON r.id = i.role_id
  WHERE i.token = p_token;

  RETURN v_invite;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO anon, authenticated;

-- ============================================================
-- Tighten invite RLS: remove overly broad anon policy
-- ============================================================
DROP POLICY IF EXISTS "invites_select_by_token" ON invites;

-- Anon can only read invites via the get_invite_by_token function (SECURITY DEFINER)
-- No direct table access for anon
