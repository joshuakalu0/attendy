-- Fix: Allow anon to insert enterprises during self-service registration
-- When a new user signs up with email confirmation ON, they have no session,
-- so subsequent inserts run as anon. The insert policy was scoped to
-- authenticated only, blocking enterprise creation.

DROP POLICY IF EXISTS "enterprises_insert" ON enterprises;
CREATE POLICY "enterprises_insert"
  ON enterprises FOR INSERT TO anon, authenticated
  WITH CHECK (true);
