/*
# Phase 7: Lite Sessions — Schema and RLS

## Overview
Creates lite_sessions table for individual (non-enterprise) users to track
time on personal activities. No enterprise required, no geofence, no schedules.

## New Tables
1. lite_sessions — Simple start/stop time tracking with notes and tags

## Security
- RLS: users can only CRUD their own sessions
*/

CREATE TABLE IF NOT EXISTS lite_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled Session',
  notes text,
  tags text[] NOT NULL DEFAULT '{}',
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0,
  is_running boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lite_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lite_sessions_select_own" ON lite_sessions;
CREATE POLICY "lite_sessions_select_own"
  ON lite_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "lite_sessions_insert_own" ON lite_sessions;
CREATE POLICY "lite_sessions_insert_own"
  ON lite_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "lite_sessions_update_own" ON lite_sessions;
CREATE POLICY "lite_sessions_update_own"
  ON lite_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "lite_sessions_delete_own" ON lite_sessions;
CREATE POLICY "lite_sessions_delete_own"
  ON lite_sessions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_lite_sessions_user_id ON lite_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_lite_sessions_start_time ON lite_sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_lite_sessions_running ON lite_sessions(is_running);
