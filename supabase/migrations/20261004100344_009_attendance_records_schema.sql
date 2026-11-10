/*
# Phase 4: Attendance Records — Schema, RLS, and Check-in Function
*/

-- ============================================================
-- ATTENDANCE RECORDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_in_time timestamptz NOT NULL DEFAULT now(),
  check_in_date date NOT NULL DEFAULT CURRENT_DATE,
  check_in_lat double precision NOT NULL,
  check_in_lng double precision NOT NULL,
  check_in_accuracy double precision,
  check_out_time timestamptz,
  check_out_lat double precision,
  check_out_lng double precision,
  check_out_accuracy double precision,
  status text NOT NULL DEFAULT 'present'
    CHECK (status IN ('present', 'late', 'absent', 'early_leave', 'incomplete')),
  late_minutes integer NOT NULL DEFAULT 0,
  early_leave_minutes integer NOT NULL DEFAULT 0,
  is_expected_day boolean NOT NULL DEFAULT true,
  schedule_source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enterprise_id, user_id, branch_id, check_in_date)
);

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_select_enterprise" ON attendance_records;
CREATE POLICY "attendance_select_enterprise"
  ON attendance_records FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.enterprise_id = attendance_records.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "attendance_select_own" ON attendance_records;
CREATE POLICY "attendance_select_own"
  ON attendance_records FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "attendance_select_super_admin" ON attendance_records;
CREATE POLICY "attendance_select_super_admin"
  ON attendance_records FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

DROP POLICY IF EXISTS "attendance_insert_own" ON attendance_records;
CREATE POLICY "attendance_insert_own"
  ON attendance_records FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.enterprise_id = attendance_records.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "attendance_update_own" ON attendance_records;
CREATE POLICY "attendance_update_own"
  ON attendance_records FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "attendance_update_enterprise" ON attendance_records;
CREATE POLICY "attendance_update_enterprise"
  ON attendance_records FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = attendance_records.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'attendance.correct'
    )
  );

DROP POLICY IF EXISTS "attendance_delete_enterprise" ON attendance_records;
CREATE POLICY "attendance_delete_enterprise"
  ON attendance_records FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = attendance_records.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'attendance.correct'
    )
  );

CREATE INDEX IF NOT EXISTS idx_attendance_enterprise_id ON attendance_records(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_attendance_branch_id ON attendance_records(branch_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_check_in_time ON attendance_records(check_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance_records(status);

-- ============================================================
-- submit_check_in function
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_check_in(
  p_enterprise_id uuid,
  p_branch_id uuid,
  p_lat double precision,
  p_lng double precision,
  p_accuracy double precision DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_branch RECORD;
  v_is_assigned boolean;
  v_is_manager boolean;
  v_today date := CURRENT_DATE;
  v_existing_id uuid;
  v_geofence_result json;
  v_schedule_result json;
  v_status text := 'present';
  v_late_minutes integer := 0;
  v_is_expected boolean := true;
  v_schedule_source text;
  v_check_in_time timestamptz := now();
  v_branch_tz text;
  v_local_hour integer;
  v_local_minute integer;
  v_expected_start_hour integer := 9;
  v_new_id uuid;
BEGIN
  PERFORM 1 FROM memberships
  WHERE enterprise_id = p_enterprise_id
  AND user_id = v_user_id
  AND status = 'active';
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'not_a_member', 'message', 'You are not an active member of this enterprise.');
  END IF;

  SELECT * INTO v_branch FROM branches WHERE id = p_branch_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'branch_not_found', 'message', 'Branch not found.');
  END IF;
  IF v_branch.is_active = false THEN
    RETURN json_build_object('success', false, 'error', 'branch_inactive', 'message', 'This branch is currently inactive.');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM branch_assignments
    WHERE branch_id = p_branch_id
    AND user_id = v_user_id
    AND assignment_type = 'manager'
  ) INTO v_is_manager;

  IF v_is_manager = false THEN
    SELECT EXISTS(
      SELECT 1 FROM branch_assignments
      WHERE branch_id = p_branch_id
      AND user_id = v_user_id
    ) INTO v_is_assigned;

    IF v_is_assigned = false THEN
      RETURN json_build_object('success', false, 'error', 'not_assigned', 'message', 'You are not assigned to this branch.');
    END IF;
  END IF;

  SELECT id INTO v_existing_id
  FROM attendance_records
  WHERE enterprise_id = p_enterprise_id
  AND user_id = v_user_id
  AND branch_id = p_branch_id
  AND check_in_date = v_today;

  IF v_existing_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'already_checked_in', 'message', 'You have already checked in today.', 'record_id', v_existing_id);
  END IF;

  SELECT * INTO v_geofence_result FROM verify_geofence(p_branch_id, p_lat, p_lng, p_accuracy);
  IF (v_geofence_result->>'verdict')::text NOT IN ('inside') THEN
    RETURN json_build_object('success', false, 'error', 'geofence_failed', 'geofence', v_geofence_result, 'message', v_geofence_result->>'message');
  END IF;

  SELECT * INTO v_schedule_result FROM resolve_schedule(p_enterprise_id, v_today, v_user_id, p_branch_id);
  v_is_expected := (v_schedule_result->>'expected')::boolean;
  v_schedule_source := v_schedule_result->>'source';

  v_branch_tz := COALESCE(v_branch.timezone, 'UTC');
  v_local_hour := EXTRACT(HOUR FROM v_check_in_time AT TIME ZONE v_branch_tz)::integer;
  v_local_minute := EXTRACT(MINUTE FROM v_check_in_time AT TIME ZONE v_branch_tz)::integer;

  IF v_is_expected AND v_local_hour > v_expected_start_hour THEN
    v_late_minutes := (v_local_hour - v_expected_start_hour) * 60 + v_local_minute - COALESCE(v_branch.late_grace_minutes, 0);
    IF v_late_minutes > 0 THEN
      v_status := 'late';
    ELSE
      v_late_minutes := 0;
    END IF;
  END IF;

  INSERT INTO attendance_records (
    enterprise_id, branch_id, user_id,
    check_in_time, check_in_date, check_in_lat, check_in_lng, check_in_accuracy,
    status, late_minutes, is_expected_day, schedule_source, metadata
  ) VALUES (
    p_enterprise_id, p_branch_id, v_user_id,
    v_check_in_time, v_today, p_lat, p_lng, p_accuracy,
    v_status, v_late_minutes, v_is_expected, v_schedule_source, p_metadata
  ) RETURNING id INTO v_new_id;

  PERFORM log_audit_event(
    'attendance.check_in',
    'attendance_record',
    v_new_id,
    json_build_object('branch', v_branch.name, 'status', v_status, 'late_minutes', v_late_minutes)::jsonb,
    p_enterprise_id
  );

  RETURN json_build_object(
    'success', true,
    'record_id', v_new_id,
    'status', v_status,
    'late_minutes', v_late_minutes,
    'is_expected', v_is_expected,
    'schedule_source', v_schedule_source,
    'check_in_time', v_check_in_time
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_check_in(uuid, uuid, double precision, double precision, double precision, jsonb) TO authenticated;

-- ============================================================
-- submit_check_out function
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_check_out(
  p_record_id uuid,
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
  v_user_id uuid := auth.uid();
  v_record RECORD;
  v_check_out_time timestamptz := now();
  v_branch_tz text;
  v_local_hour integer;
  v_local_minute integer;
  v_expected_end_hour integer := 17;
  v_early_leave integer := 0;
  v_branch_grace integer := 0;
  v_new_status text;
BEGIN
  SELECT * INTO v_record FROM attendance_records WHERE id = p_record_id AND user_id = v_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'not_found', 'message', 'Attendance record not found.');
  END IF;

  IF v_record.check_out_time IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'already_checked_out', 'message', 'You have already checked out.');
  END IF;

  SELECT timezone, early_leave_minutes INTO v_branch_tz, v_branch_grace FROM branches WHERE id = v_record.branch_id;
  v_branch_tz := COALESCE(v_branch_tz, 'UTC');
  v_local_hour := EXTRACT(HOUR FROM v_check_out_time AT TIME ZONE v_branch_tz)::integer;
  v_local_minute := EXTRACT(MINUTE FROM v_check_out_time AT TIME ZONE v_branch_tz)::integer;

  IF v_local_hour < v_expected_end_hour AND v_record.is_expected_day THEN
    v_early_leave := (v_expected_end_hour - v_local_hour) * 60 - v_local_minute - v_branch_grace;
    IF v_early_leave > 0 THEN
      v_new_status := 'early_leave';
    ELSE
      v_early_leave := 0;
      v_new_status := v_record.status;
    END IF;
  ELSE
    v_early_leave := 0;
    v_new_status := v_record.status;
  END IF;

  UPDATE attendance_records
  SET check_out_time = v_check_out_time,
      check_out_lat = p_lat,
      check_out_lng = p_lng,
      check_out_accuracy = p_accuracy,
      early_leave_minutes = v_early_leave,
      status = CASE WHEN v_new_status = 'early_leave' THEN 'early_leave' ELSE status END,
      updated_at = now()
  WHERE id = p_record_id;

  PERFORM log_audit_event(
    'attendance.check_out',
    'attendance_record',
    p_record_id,
    json_build_object('early_leave_minutes', v_early_leave)::jsonb,
    v_record.enterprise_id
  );

  RETURN json_build_object(
    'success', true,
    'check_out_time', v_check_out_time,
    'early_leave_minutes', v_early_leave,
    'status', v_new_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_check_out(uuid, double precision, double precision, double precision) TO authenticated;
