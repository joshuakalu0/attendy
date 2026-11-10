/*
# Add 'suspended' and 'invited' to profiles status check constraint

The super admin users page can suspend users or set them to invited status,
but the check constraint only allowed active/deactivated/grace_period/deleted.
*/

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_status_check
  CHECK (status = ANY (ARRAY['active'::text, 'deactivated'::text, 'grace_period'::text, 'deleted'::text, 'suspended'::text, 'invited'::text]));
