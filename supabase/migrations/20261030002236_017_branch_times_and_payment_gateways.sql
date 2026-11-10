/*
# Branch Override Time Columns + Payment Gateways

## Overview
1. Adds start_time/end_time to branch_calendar_overrides so branches can have
   special working hours, not just special days.
2. Creates payment_gateways table for multi-gateway support (Stripe, Paystack,
   Flutterwave) with per-enterprise enable/disable and API key storage.

## Modified Tables
- branch_calendar_overrides: adds start_time time, end_time time (nullable)

## New Tables
- payment_gateways: one row per gateway per enterprise, with enabled flag,
  API key, and gateway-specific config JSONB.

## Security
- payment_gateways: enterprise members can SELECT; billing.manage for CRUD
*/

-- Add time columns to branch_calendar_overrides
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'branch_calendar_overrides' AND column_name = 'start_time') THEN
    ALTER TABLE branch_calendar_overrides ADD COLUMN start_time time;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_name = 'branch_calendar_overrides' AND column_name = 'end_time') THEN
    ALTER TABLE branch_calendar_overrides ADD COLUMN end_time time;
  END IF;
END $$;

-- ============================================================
-- PAYMENT GATEWAYS
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  gateway_key text NOT NULL CHECK (gateway_key IN ('stripe', 'paystack', 'flutterwave')),
  display_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  api_key text,
  api_secret text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enterprise_id, gateway_key)
);

ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payment_gateways_enterprise ON payment_gateways(enterprise_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON payment_gateways TO authenticated;

DROP POLICY IF EXISTS "payment_gateways_select_enterprise" ON payment_gateways;
CREATE POLICY "payment_gateways_select_enterprise"
  ON payment_gateways FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM memberships m
      WHERE m.enterprise_id = payment_gateways.enterprise_id
      AND m.user_id = auth.uid() AND m.status = 'active')
  );

DROP POLICY IF EXISTS "payment_gateways_select_super_admin" ON payment_gateways;
CREATE POLICY "payment_gateways_select_super_admin"
  ON payment_gateways FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin'))
  );

DROP POLICY IF EXISTS "payment_gateways_insert_enterprise" ON payment_gateways;
CREATE POLICY "payment_gateways_insert_enterprise"
  ON payment_gateways FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = payment_gateways.enterprise_id
      AND m.user_id = auth.uid() AND m.status = 'active'
      AND p.key = 'billing.manage')
  );

DROP POLICY IF EXISTS "payment_gateways_update_enterprise" ON payment_gateways;
CREATE POLICY "payment_gateways_update_enterprise"
  ON payment_gateways FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = payment_gateways.enterprise_id
      AND m.user_id = auth.uid() AND m.status = 'active'
      AND p.key = 'billing.manage')
  );

DROP POLICY IF EXISTS "payment_gateways_delete_enterprise" ON payment_gateways;
CREATE POLICY "payment_gateways_delete_enterprise"
  ON payment_gateways FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = payment_gateways.enterprise_id
      AND m.user_id = auth.uid() AND m.status = 'active'
      AND p.key = 'billing.manage')
  );
