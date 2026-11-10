/*
# Custom Work Hours + Shift Templates

## Overview
Adds time columns to staff_schedules so individual employees can have custom
work hours (e.g. 7:00–11:00, only 2 days/week). Creates shift_templates for
reusable predefined schedules and shift_assignments to apply templates to
individual employees or entire groups (all employees at a branch, in a
department, or with a specific role).

## Modified Tables
- `staff_schedules`: adds `start_time time` and `end_time time` columns (nullable)
  so per-employee custom hours can be stored alongside the weekday pattern.

## New Tables
1. `shift_templates` — Reusable named shift definitions (days + time window)
2. `shift_assignments` — Links a shift template to either an individual employee
   or a group scope (branch, department, or role within an enterprise)

## Security
- RLS on both new tables: enterprise members can read; schedules.manage for CRUD
- Grants on both tables for authenticated
*/

-- Add time columns to staff_schedules
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_schedules' AND column_name = 'start_time') THEN
    ALTER TABLE staff_schedules ADD COLUMN start_time time;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_schedules' AND column_name = 'end_time') THEN
    ALTER TABLE staff_schedules ADD COLUMN end_time time;
  END IF;
END $$;

-- ============================================================
-- SHIFT TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS shift_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  weekdays integer[] NOT NULL DEFAULT '{}',
  start_time time,
  end_time time,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enterprise_id, name)
);

ALTER TABLE shift_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_shift_templates_enterprise ON shift_templates(enterprise_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON shift_templates TO authenticated;

DROP POLICY IF EXISTS "shift_templates_select_enterprise" ON shift_templates;
CREATE POLICY "shift_templates_select_enterprise"
  ON shift_templates FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM memberships m
      WHERE m.enterprise_id = shift_templates.enterprise_id
      AND m.user_id = auth.uid() AND m.status = 'active')
  );

DROP POLICY IF EXISTS "shift_templates_select_super_admin" ON shift_templates;
CREATE POLICY "shift_templates_select_super_admin"
  ON shift_templates FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin'))
  );

DROP POLICY IF EXISTS "shift_templates_insert_enterprise" ON shift_templates;
CREATE POLICY "shift_templates_insert_enterprise"
  ON shift_templates FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = shift_templates.enterprise_id
      AND m.user_id = auth.uid() AND m.status = 'active'
      AND p.key = 'schedules.manage')
  );

DROP POLICY IF EXISTS "shift_templates_update_enterprise" ON shift_templates;
CREATE POLICY "shift_templates_update_enterprise"
  ON shift_templates FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = shift_templates.enterprise_id
      AND m.user_id = auth.uid() AND m.status = 'active'
      AND p.key = 'schedules.manage')
  );

DROP POLICY IF EXISTS "shift_templates_delete_enterprise" ON shift_templates;
CREATE POLICY "shift_templates_delete_enterprise"
  ON shift_templates FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = shift_templates.enterprise_id
      AND m.user_id = auth.uid() AND m.status = 'active'
      AND p.key = 'schedules.manage')
  );

-- ============================================================
-- SHIFT ASSIGNMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS shift_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  shift_template_id uuid NOT NULL REFERENCES shift_templates(id) ON DELETE CASCADE,
  -- For individual assignment:
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  -- For group assignment:
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  department_id uuid,
  -- assignment_scope: 'individual', 'branch', 'department', 'all'
  assignment_scope text NOT NULL DEFAULT 'individual'
    CHECK (assignment_scope IN ('individual', 'branch', 'department', 'all')),
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shift_assignments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_shift_assign_enterprise ON shift_assignments(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_shift_assign_template ON shift_assignments(shift_template_id);
CREATE INDEX IF NOT EXISTS idx_shift_assign_user ON shift_assignments(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON shift_assignments TO authenticated;

DROP POLICY IF EXISTS "shift_assign_select_enterprise" ON shift_assignments;
CREATE POLICY "shift_assign_select_enterprise"
  ON shift_assignments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM memberships m
      WHERE m.enterprise_id = shift_assignments.enterprise_id
      AND m.user_id = auth.uid() AND m.status = 'active')
  );

DROP POLICY IF EXISTS "shift_assign_select_super_admin" ON shift_assignments;
CREATE POLICY "shift_assign_select_super_admin"
  ON shift_assignments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin'))
  );

DROP POLICY IF EXISTS "shift_assign_select_own" ON shift_assignments;
CREATE POLICY "shift_assign_select_own"
  ON shift_assignments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "shift_assign_insert_enterprise" ON shift_assignments;
CREATE POLICY "shift_assign_insert_enterprise"
  ON shift_assignments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = shift_assignments.enterprise_id
      AND m.user_id = auth.uid() AND m.status = 'active'
      AND p.key = 'schedules.manage')
  );

DROP POLICY IF EXISTS "shift_assign_update_enterprise" ON shift_assignments;
CREATE POLICY "shift_assign_update_enterprise"
  ON shift_assignments FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = shift_assignments.enterprise_id
      AND m.user_id = auth.uid() AND m.status = 'active'
      AND p.key = 'schedules.manage')
  );

DROP POLICY IF EXISTS "shift_assign_delete_enterprise" ON shift_assignments;
CREATE POLICY "shift_assign_delete_enterprise"
  ON shift_assignments FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = shift_assignments.enterprise_id
      AND m.user_id = auth.uid() AND m.status = 'active'
      AND p.key = 'schedules.manage')
  );
