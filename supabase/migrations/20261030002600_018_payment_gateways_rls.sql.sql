/*
# RLS policies for payment_gateways

1. Security
- Enable RLS on payment_gateways (already created in migration 017).
- Grant CRUD to authenticated only.
- Enterprise members with settings.edit or billing.manage permission can manage gateways.
- All active enterprise members can view enabled gateways (needed to display payment options).
*/

ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON payment_gateways TO authenticated;

-- Members can view gateways for enterprises they belong to
DROP POLICY IF EXISTS "pg_select_enterprise_members" ON payment_gateways;
CREATE POLICY "pg_select_enterprise_members"
ON payment_gateways FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.enterprise_id = payment_gateways.enterprise_id
    AND m.user_id = auth.uid()
    AND m.status = 'active'
  )
);

-- Only members with settings.edit permission can insert
DROP POLICY IF EXISTS "pg_insert_manage" ON payment_gateways;
CREATE POLICY "pg_insert_manage"
ON payment_gateways FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM memberships m
    JOIN role_permissions rp ON rp.role_id = m.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE m.enterprise_id = payment_gateways.enterprise_id
    AND m.user_id = auth.uid()
    AND m.status = 'active'
    AND p.key = 'settings.edit'
  )
);

-- Only members with settings.edit permission can update
DROP POLICY IF EXISTS "pg_update_manage" ON payment_gateways;
CREATE POLICY "pg_update_manage"
ON payment_gateways FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM memberships m
    JOIN role_permissions rp ON rp.role_id = m.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE m.enterprise_id = payment_gateways.enterprise_id
    AND m.user_id = auth.uid()
    AND m.status = 'active'
    AND p.key = 'settings.edit'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM memberships m
    JOIN role_permissions rp ON rp.role_id = m.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE m.enterprise_id = payment_gateways.enterprise_id
    AND m.user_id = auth.uid()
    AND m.status = 'active'
    AND p.key = 'settings.edit'
  )
);

-- Only members with settings.edit permission can delete
DROP POLICY IF EXISTS "pg_delete_manage" ON payment_gateways;
CREATE POLICY "pg_delete_manage"
ON payment_gateways FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM memberships m
    JOIN role_permissions rp ON rp.role_id = m.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE m.enterprise_id = payment_gateways.enterprise_id
    AND m.user_id = auth.uid()
    AND m.status = 'active'
    AND p.key = 'settings.edit'
  )
);
