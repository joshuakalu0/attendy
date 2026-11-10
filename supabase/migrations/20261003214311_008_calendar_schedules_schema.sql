/*
# Phase 3: Calendar & Schedules — Schema, RLS, and Resolution Function

## Overview
Creates tables for tenant-level calendars, branch calendar overrides, staff schedule
overrides, and holidays. Includes a SQL-based schedule resolution function that
implements the deterministic resolution order: holiday > staff override > branch
calendar > tenant calendar.

## New Tables
1. calendars — Tenant-level attendance calendar (recurring patterns + specific dates)
2. branch_calendar_overrides — Per-branch calendar overrides
3. staff_schedules — Per-staff schedule overrides with effective dates
4. holidays — Named holidays (tenant + branch scoped)

## Schedule Resolution Order (deterministic, used everywhere)
1. Holiday wins — if the date is a holiday at any applicable level, the day is not expected
2. Staff override — if the staff member has an active override for this date, use it
3. Branch calendar — if the branch has a calendar override for this date, use it
4. Tenant calendar — default calendar for the enterprise

## Calendar Entry Format
Each calendar entry has a `pattern_type` of either:
- 'recurring': weekdays array [0-6] + date range (start_date, end_date)
- 'specific': individual dates in the `specific_dates` jsonb array

## Security
- RLS on all tables: enterprise members can read; schedules.manage for CRUD
- Resolution function is SECURITY DEFINER
*/

-- ============================================================
-- CALENDARS TABLE (tenant level)
-- ============================================================
CREATE TABLE IF NOT EXISTS calendars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default Calendar',
  pattern_type text NOT NULL DEFAULT 'recurring'
    CHECK (pattern_type IN ('recurring', 'specific')),
  weekdays integer[] NOT NULL DEFAULT '{}',
  start_date date,
  end_date date,
  specific_dates date[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enterprise_id, name)
);

ALTER TABLE calendars ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendars_select_enterprise" ON calendars;
CREATE POLICY "calendars_select_enterprise"
  ON calendars FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.enterprise_id = calendars.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "calendars_select_super_admin" ON calendars;
CREATE POLICY "calendars_select_super_admin"
  ON calendars FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

DROP POLICY IF EXISTS "calendars_insert_enterprise" ON calendars;
CREATE POLICY "calendars_insert_enterprise"
  ON calendars FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = calendars.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'schedules.manage'
    )
  );

DROP POLICY IF EXISTS "calendars_update_enterprise" ON calendars;
CREATE POLICY "calendars_update_enterprise"
  ON calendars FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = calendars.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'schedules.manage'
    )
  );

DROP POLICY IF EXISTS "calendars_delete_enterprise" ON calendars;
CREATE POLICY "calendars_delete_enterprise"
  ON calendars FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = calendars.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'schedules.manage'
    )
  );

-- ============================================================
-- BRANCH CALENDAR OVERRIDES
-- ============================================================
CREATE TABLE IF NOT EXISTS branch_calendar_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  pattern_type text NOT NULL DEFAULT 'recurring'
    CHECK (pattern_type IN ('recurring', 'specific')),
  weekdays integer[] NOT NULL DEFAULT '{}',
  start_date date,
  end_date date,
  specific_dates date[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id)
);

ALTER TABLE branch_calendar_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branch_cal_select_enterprise" ON branch_calendar_overrides;
CREATE POLICY "branch_cal_select_enterprise"
  ON branch_calendar_overrides FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.enterprise_id = branch_calendar_overrides.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "branch_cal_select_super_admin" ON branch_calendar_overrides;
CREATE POLICY "branch_cal_select_super_admin"
  ON branch_calendar_overrides FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

DROP POLICY IF EXISTS "branch_cal_insert_enterprise" ON branch_calendar_overrides;
CREATE POLICY "branch_cal_insert_enterprise"
  ON branch_calendar_overrides FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = branch_calendar_overrides.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'schedules.manage'
    )
  );

DROP POLICY IF EXISTS "branch_cal_update_enterprise" ON branch_calendar_overrides;
CREATE POLICY "branch_cal_update_enterprise"
  ON branch_calendar_overrides FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = branch_calendar_overrides.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'schedules.manage'
    )
  );

DROP POLICY IF EXISTS "branch_cal_delete_enterprise" ON branch_calendar_overrides;
CREATE POLICY "branch_cal_delete_enterprise"
  ON branch_calendar_overrides FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = branch_calendar_overrides.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'schedules.manage'
    )
  );

-- ============================================================
-- STAFF SCHEDULES (per-staff overrides)
-- ============================================================
CREATE TABLE IF NOT EXISTS staff_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  pattern_type text NOT NULL DEFAULT 'recurring'
    CHECK (pattern_type IN ('recurring', 'specific')),
  weekdays integer[] NOT NULL DEFAULT '{}',
  start_date date,
  end_date date,
  specific_dates date[] NOT NULL DEFAULT '{}',
  effective_from date NOT NULL DEFAULT CURRENT_DATE,
  effective_to date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_schedules_select_enterprise" ON staff_schedules;
CREATE POLICY "staff_schedules_select_enterprise"
  ON staff_schedules FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.enterprise_id = staff_schedules.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "staff_schedules_select_own" ON staff_schedules;
CREATE POLICY "staff_schedules_select_own"
  ON staff_schedules FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "staff_schedules_select_super_admin" ON staff_schedules;
CREATE POLICY "staff_schedules_select_super_admin"
  ON staff_schedules FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

DROP POLICY IF EXISTS "staff_schedules_insert_enterprise" ON staff_schedules;
CREATE POLICY "staff_schedules_insert_enterprise"
  ON staff_schedules FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = staff_schedules.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'schedules.manage'
    )
  );

DROP POLICY IF EXISTS "staff_schedules_update_enterprise" ON staff_schedules;
CREATE POLICY "staff_schedules_update_enterprise"
  ON staff_schedules FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = staff_schedules.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'schedules.manage'
    )
  );

DROP POLICY IF EXISTS "staff_schedules_delete_enterprise" ON staff_schedules;
CREATE POLICY "staff_schedules_delete_enterprise"
  ON staff_schedules FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = staff_schedules.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'schedules.manage'
    )
  );

-- ============================================================
-- HOLIDAYS
-- ============================================================
CREATE TABLE IF NOT EXISTS holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  holiday_date date NOT NULL,
  is_recurring_yearly boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enterprise_id, holiday_date, branch_id)
);

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "holidays_select_enterprise" ON holidays;
CREATE POLICY "holidays_select_enterprise"
  ON holidays FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.enterprise_id = holidays.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "holidays_select_super_admin" ON holidays;
CREATE POLICY "holidays_select_super_admin"
  ON holidays FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

DROP POLICY IF EXISTS "holidays_insert_enterprise" ON holidays;
CREATE POLICY "holidays_insert_enterprise"
  ON holidays FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = holidays.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'schedules.manage'
    )
  );

DROP POLICY IF EXISTS "holidays_delete_enterprise" ON holidays;
CREATE POLICY "holidays_delete_enterprise"
  ON holidays FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = holidays.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'schedules.manage'
    )
  );

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_calendars_enterprise_id ON calendars(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_branch_cal_branch_id ON branch_calendar_overrides(branch_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_user_id ON staff_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_schedules_enterprise_id ON staff_schedules(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_holidays_enterprise_id ON holidays(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(holiday_date);

-- ============================================================
-- resolve_schedule: SQL-based schedule resolution
-- ============================================================
CREATE OR REPLACE FUNCTION public.resolve_schedule(
  p_enterprise_id uuid,
  p_date date,
  p_user_id uuid DEFAULT NULL,
  p_branch_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dow integer;
  v_is_holiday boolean := false;
  v_holiday_name text;
  v_staff_expected boolean := NULL;
  v_branch_expected boolean := NULL;
  v_tenant_expected boolean := NULL;
  v_result text;
  v_source text;
  v_cal RECORD;
  v_branch_cal RECORD;
  v_staff_sched RECORD;
BEGIN
  v_dow := EXTRACT(DOW FROM p_date)::integer;

  -- 1. Check holiday (enterprise-level or branch-level)
  SELECT name INTO v_holiday_name
  FROM holidays
  WHERE enterprise_id = p_enterprise_id
  AND (
    (holiday_date = p_date)
    OR (is_recurring_yearly = true AND EXTRACT(month FROM holiday_date) = EXTRACT(month FROM p_date) AND EXTRACT(day FROM holiday_date) = EXTRACT(day FROM p_date))
  )
  AND (branch_id IS NULL OR branch_id = p_branch_id)
  LIMIT 1;

  IF v_holiday_name IS NOT NULL THEN
    RETURN json_build_object(
      'expected', false,
      'source', 'holiday',
      'holiday_name', v_holiday_name,
      'day_of_week', v_dow
    );
  END IF;

  -- 2. Check staff schedule override
  IF p_user_id IS NOT NULL THEN
    SELECT * INTO v_staff_sched
    FROM staff_schedules
    WHERE enterprise_id = p_enterprise_id
    AND user_id = p_user_id
    AND is_active = true
    AND p_date >= effective_from
    AND (effective_to IS NULL OR p_date <= effective_to)
    AND (
      (branch_id IS NULL OR branch_id = p_branch_id)
    )
    ORDER BY updated_at DESC
    LIMIT 1;

    IF v_staff_sched.id IS NOT NULL THEN
      IF v_staff_sched.pattern_type = 'recurring' THEN
        v_staff_expected := v_staff_sched.weekdays @> ARRAY[v_dow];
      ELSE
        v_staff_expected := p_date = ANY(v_staff_sched.specific_dates);
      END IF;

      RETURN json_build_object(
        'expected', v_staff_expected,
        'source', 'staff_override',
        'day_of_week', v_dow
      );
    END IF;
  END IF;

  -- 3. Check branch calendar override
  IF p_branch_id IS NOT NULL THEN
    SELECT * INTO v_branch_cal
    FROM branch_calendar_overrides
    WHERE branch_id = p_branch_id
    AND is_active = true
    LIMIT 1;

    IF v_branch_cal.id IS NOT NULL THEN
      IF v_branch_cal.pattern_type = 'recurring' THEN
        v_branch_expected := v_branch_cal.weekdays @> ARRAY[v_dow];
        IF v_branch_cal.start_date IS NOT NULL AND p_date < v_branch_cal.start_date THEN
          v_branch_expected := false;
        END IF;
        IF v_branch_cal.end_date IS NOT NULL AND p_date > v_branch_cal.end_date THEN
          v_branch_expected := false;
        END IF;
      ELSE
        v_branch_expected := p_date = ANY(v_branch_cal.specific_dates);
      END IF;

      RETURN json_build_object(
        'expected', v_branch_expected,
        'source', 'branch_calendar',
        'day_of_week', v_dow
      );
    END IF;
  END IF;

  -- 4. Check tenant calendar (default)
  SELECT * INTO v_cal
  FROM calendars
  WHERE enterprise_id = p_enterprise_id
  AND is_active = true
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_cal.id IS NOT NULL THEN
    IF v_cal.pattern_type = 'recurring' THEN
      v_tenant_expected := v_cal.weekdays @> ARRAY[v_dow];
      IF v_cal.start_date IS NOT NULL AND p_date < v_cal.start_date THEN
        v_tenant_expected := false;
      END IF;
      IF v_cal.end_date IS NOT NULL AND p_date > v_cal.end_date THEN
        v_tenant_expected := false;
      END IF;
    ELSE
      v_tenant_expected := p_date = ANY(v_cal.specific_dates);
    END IF;

    RETURN json_build_object(
      'expected', v_tenant_expected,
      'source', 'tenant_calendar',
      'day_of_week', v_dow
    );
  END IF;

  -- No calendar at all — not expected
  RETURN json_build_object(
    'expected', false,
    'source', 'no_calendar',
    'day_of_week', v_dow
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_schedule(uuid, date, uuid, uuid) TO authenticated;
