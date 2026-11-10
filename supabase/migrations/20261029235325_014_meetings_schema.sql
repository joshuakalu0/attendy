/*
# Meetings — Single Attendance Sheets for Lite Users

## Overview
Replaces the old "lite_sessions" timer concept with a proper attendance meeting system.
A lite user (teacher, organizer) creates a "meeting" — a single attendance sheet with:
- A title, description, date, and time window (start/end)
- Custom fields the organizer wants participants to fill (e.g. matric number, department)
- A unique join code and shareable link
- GPS location capture for the organizer when creating
- Participants join via code/link WITHOUT an account, fill the requested fields, and submit

Free tier: max 5 meetings per user. Pro tier: unlimited (enforced via a count check).

## New Tables
1. `meetings` — The attendance sheet itself (title, time window, join code, GPS, owner)
2. `meeting_fields` — Custom fields the organizer wants collected per participant
3. `meeting_attendees` — Each participant's attendance submission with their field responses

## Modified Tables
- `lite_sessions` is left in place but no longer used by the UI (backward compatible).

## Security
- `meetings`: owner-scoped CRUD for authenticated users (the organizer)
  - BUT SELECT is also open to anon for joining by code (so participants without accounts can view meeting details)
- `meeting_fields`: readable by anyone who can read the parent meeting; writable only by meeting owner
- `meeting_attendees`: insertable by anyone (anon + authenticated) so participants can submit without an account;
  readable only by the meeting owner; deletable only by the meeting owner

## Important Notes
1. The join code is a 6-character uppercase alphanumeric string, unique across all meetings.
2. GPS coordinates are optional on both meeting creation and attendee submission.
3. The `field_responses` column on `meeting_attendees` is a JSONB object mapping field_id -> value.
4. Free-tier limit (5 meetings) is enforced in application code by counting active meetings per user.
*/

-- 1. Meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  meeting_date date NOT NULL DEFAULT CURRENT_DATE,
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '17:00',
  join_code text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
  is_active boolean NOT NULL DEFAULT true,
  is_pro boolean NOT NULL DEFAULT false,
  latitude double precision,
  longitude double precision,
  location_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_join_code ON meetings(join_code);
CREATE INDEX IF NOT EXISTS idx_meetings_active ON meetings(is_active);

-- Grants: authenticated users manage their own meetings; anon can SELECT (for joining by code)
GRANT SELECT, INSERT, UPDATE, DELETE ON meetings TO authenticated;
GRANT SELECT ON meetings TO anon;

-- Policies for meetings
DROP POLICY IF EXISTS "meetings_select_own" ON meetings;
CREATE POLICY "meetings_select_own"
  ON meetings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "meetings_insert_own" ON meetings;
CREATE POLICY "meetings_insert_own"
  ON meetings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "meetings_update_own" ON meetings;
CREATE POLICY "meetings_update_own"
  ON meetings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "meetings_delete_own" ON meetings;
CREATE POLICY "meetings_delete_own"
  ON meetings FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Anon can select meetings by join code (for the public join page)
DROP POLICY IF EXISTS "meetings_anon_select_by_code" ON meetings;
CREATE POLICY "meetings_anon_select_by_code"
  ON meetings FOR SELECT TO anon
  USING (is_active = true);

-- 2. Meeting custom fields table
CREATE TABLE IF NOT EXISTS meeting_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text', -- text, number, email, phone, select
  is_required boolean NOT NULL DEFAULT true,
  options text[] NOT NULL DEFAULT '{}', -- for select type
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE meeting_fields ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_meeting_fields_meeting_id ON meeting_fields(meeting_id);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON meeting_fields TO authenticated;
GRANT SELECT ON meeting_fields TO anon;

-- Policies: owner of parent meeting can CRUD; anyone can SELECT (for join page)
DROP POLICY IF EXISTS "meeting_fields_select" ON meeting_fields;
CREATE POLICY "meeting_fields_select"
  ON meeting_fields FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "meeting_fields_insert_own" ON meeting_fields;
CREATE POLICY "meeting_fields_insert_own"
  ON meeting_fields FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = meeting_fields.meeting_id AND meetings.user_id = auth.uid()));

DROP POLICY IF EXISTS "meeting_fields_update_own" ON meeting_fields;
CREATE POLICY "meeting_fields_update_own"
  ON meeting_fields FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = meeting_fields.meeting_id AND meetings.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = meeting_fields.meeting_id AND meetings.user_id = auth.uid()));

DROP POLICY IF EXISTS "meeting_fields_delete_own" ON meeting_fields;
CREATE POLICY "meeting_fields_delete_own"
  ON meeting_fields FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = meeting_fields.meeting_id AND meetings.user_id = auth.uid()));

-- 3. Meeting attendees table
CREATE TABLE IF NOT EXISTS meeting_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  participant_name text NOT NULL,
  participant_email text,
  field_responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  latitude double precision,
  longitude double precision,
  submitted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE meeting_attendees ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id ON meeting_attendees(meeting_id);

-- Grants: authenticated (owner) can SELECT/DELETE; anon + authenticated can INSERT
GRANT SELECT, INSERT, DELETE ON meeting_attendees TO authenticated;
GRANT INSERT ON meeting_attendees TO anon;

-- Policies
-- Owner can see attendees of their meetings
DROP POLICY IF EXISTS "meeting_attendees_select_own" ON meeting_attendees;
CREATE POLICY "meeting_attendees_select_own"
  ON meeting_attendees FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = meeting_attendees.meeting_id AND meetings.user_id = auth.uid()));

-- Anyone can submit attendance (no account needed)
DROP POLICY IF EXISTS "meeting_attendees_insert_any" ON meeting_attendees;
CREATE POLICY "meeting_attendees_insert_any"
  ON meeting_attendees FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only meeting owner can delete attendees
DROP POLICY IF EXISTS "meeting_attendees_delete_own" ON meeting_attendees;
CREATE POLICY "meeting_attendees_delete_own"
  ON meeting_attendees FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM meetings WHERE meetings.id = meeting_attendees.meeting_id AND meetings.user_id = auth.uid()));

-- Function to generate a unique join code
CREATE OR REPLACE FUNCTION public.generate_unique_join_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  LOOP
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    SELECT EXISTS(SELECT 1 FROM meetings WHERE join_code = v_code) INTO v_exists;
    IF NOT v_exists THEN
      RETURN v_code;
    END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.generate_unique_join_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_unique_join_code() TO authenticated;
