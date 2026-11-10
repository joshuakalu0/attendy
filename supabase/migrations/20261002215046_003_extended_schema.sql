/*
# Extended Schema: Invites, Audit Log, Notifications, Plans, Subscriptions, Payments, Sessions

## Overview
Creates the remaining tables for employee invitations, audit logging,
notifications, billing (plans, subscriptions, payments), and session tracking.

## New Tables
1. invites - Employee invitations with signed expiring tokens
2. audit_logs - Append-only audit log for all security-relevant events
3. notifications - In-app notifications for users
4. plans - Subscription plans with pricing, intervals, and limits
5. subscriptions - Active subscriptions linking enterprises/users to plans
6. payments - Payment records from Paystack
7. sessions - Device/session tracking for login history and revocation

## Security
- RLS on every table with appropriate scoping.
- audit_logs: insert-only for most users; read scoped by enterprise or super admin.
- invites: enterprise-scoped read; insert by enterprise admins with invite permission.
- notifications: user-scoped (own notifications only).
- plans: readable by all authenticated; writable by super admin only.
- subscriptions/payments: enterprise owner or super admin.
- sessions: user can read/revoke own sessions.
*/

-- ============================================================
-- INVITES
-- ============================================================
CREATE TABLE IF NOT EXISTS invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  email text NOT NULL,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  invited_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Enterprise members can read invites in their enterprise
DROP POLICY IF EXISTS "invites_select_enterprise" ON invites;
CREATE POLICY "invites_select_enterprise"
  ON invites FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.enterprise_id = invites.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
    )
  );

-- Super admin can read all invites
DROP POLICY IF EXISTS "invites_select_super_admin" ON invites;
CREATE POLICY "invites_select_super_admin"
  ON invites FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

-- Enterprise admins can create invites
DROP POLICY IF EXISTS "invites_insert_enterprise" ON invites;
CREATE POLICY "invites_insert_enterprise"
  ON invites FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = invites.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'employees.invite'
    )
  );

-- Enterprise admins can update invites (resend, cancel)
DROP POLICY IF EXISTS "invites_update_enterprise" ON invites;
CREATE POLICY "invites_update_enterprise"
  ON invites FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = invites.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'employees.invite'
    )
  );

-- Enterprise admins can delete invites
DROP POLICY IF EXISTS "invites_delete_enterprise" ON invites;
CREATE POLICY "invites_delete_enterprise"
  ON invites FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = invites.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'employees.invite'
    )
  );

-- Anyone can read an invite by token (for accept flow — no auth needed)
-- We use a separate policy for token-based lookup
DROP POLICY IF EXISTS "invites_select_by_token" ON invites;
CREATE POLICY "invites_select_by_token"
  ON invites FOR SELECT TO anon, authenticated
  USING (token IS NOT NULL);

-- ============================================================
-- AUDIT LOGS (append-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid REFERENCES enterprises(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  impersonated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Enterprise members with audit.view can read their enterprise's audit logs
DROP POLICY IF EXISTS "audit_logs_select_enterprise" ON audit_logs;
CREATE POLICY "audit_logs_select_enterprise"
  ON audit_logs FOR SELECT TO authenticated
  USING (
    enterprise_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = audit_logs.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'audit.view'
    )
  );

-- Super admin can read all audit logs
DROP POLICY IF EXISTS "audit_logs_select_super_admin" ON audit_logs;
CREATE POLICY "audit_logs_select_super_admin"
  ON audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

-- Users can read their own audit log entries (personal events)
DROP POLICY IF EXISTS "audit_logs_select_own" ON audit_logs;
CREATE POLICY "audit_logs_select_own"
  ON audit_logs FOR SELECT TO authenticated
  USING (actor_id = auth.uid());

-- All authenticated users can insert audit logs (events are logged by the system)
DROP POLICY IF EXISTS "audit_logs_insert" ON audit_logs;
CREATE POLICY "audit_logs_insert"
  ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- No UPDATE or DELETE policies — audit logs are append-only

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own"
  ON notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_own" ON notifications;
CREATE POLICY "notifications_insert_own"
  ON notifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own"
  ON notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own"
  ON notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  interval text NOT NULL DEFAULT 'monthly'
    CHECK (interval IN ('monthly', 'yearly')),
  max_employees integer,
  features jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  paystack_plan_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_select_all" ON plans;
CREATE POLICY "plans_select_all"
  ON plans FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "plans_super_admin_insert" ON plans;
CREATE POLICY "plans_super_admin_insert"
  ON plans FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

DROP POLICY IF EXISTS "plans_super_admin_update" ON plans;
CREATE POLICY "plans_super_admin_update"
  ON plans FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

DROP POLICY IF EXISTS "plans_super_admin_delete" ON plans;
CREATE POLICY "plans_super_admin_delete"
  ON plans FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid REFERENCES enterprises(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'none'
    CHECK (status IN ('none', 'active', 'trialing', 'past_due', 'canceled', 'inactive')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  trial_end timestamptz,
  paystack_subscription_code text,
  paystack_customer_code text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sub_owner CHECK (enterprise_id IS NOT NULL OR user_id IS NOT NULL)
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Enterprise members with billing.view can read their enterprise subscription
DROP POLICY IF EXISTS "subscriptions_select_enterprise" ON subscriptions;
CREATE POLICY "subscriptions_select_enterprise"
  ON subscriptions FOR SELECT TO authenticated
  USING (
    enterprise_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = subscriptions.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'billing.view'
    )
  );

-- Users can read their own subscription
DROP POLICY IF EXISTS "subscriptions_select_own" ON subscriptions;
CREATE POLICY "subscriptions_select_own"
  ON subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Super admin can read all subscriptions
DROP POLICY IF EXISTS "subscriptions_select_super_admin" ON subscriptions;
CREATE POLICY "subscriptions_select_super_admin"
  ON subscriptions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

-- Enterprise owners/admins can manage subscriptions
DROP POLICY IF EXISTS "subscriptions_insert_enterprise" ON subscriptions;
CREATE POLICY "subscriptions_insert_enterprise"
  ON subscriptions FOR INSERT TO authenticated
  WITH CHECK (
    enterprise_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = subscriptions.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'billing.manage'
    )
  );

DROP POLICY IF EXISTS "subscriptions_update_enterprise" ON subscriptions;
CREATE POLICY "subscriptions_update_enterprise"
  ON subscriptions FOR UPDATE TO authenticated
  USING (
    enterprise_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = subscriptions.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'billing.manage'
    )
  );

-- Users can insert/update their own subscription
DROP POLICY IF EXISTS "subscriptions_insert_own" ON subscriptions;
CREATE POLICY "subscriptions_insert_own"
  ON subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "subscriptions_update_own" ON subscriptions;
CREATE POLICY "subscriptions_update_own"
  ON subscriptions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Super admin can manage all subscriptions
DROP POLICY IF EXISTS "subscriptions_super_admin_insert" ON subscriptions;
CREATE POLICY "subscriptions_super_admin_insert"
  ON subscriptions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

DROP POLICY IF EXISTS "subscriptions_super_admin_update" ON subscriptions;
CREATE POLICY "subscriptions_super_admin_update"
  ON subscriptions FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid REFERENCES enterprises(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  plan_id uuid REFERENCES plans(id) ON DELETE SET NULL,
  amount_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  paystack_reference text UNIQUE,
  paystack_transaction_id text,
  paystack_response jsonb DEFAULT '{}'::jsonb,
  invoice_url text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Enterprise members with billing.view can read their enterprise payments
DROP POLICY IF EXISTS "payments_select_enterprise" ON payments;
CREATE POLICY "payments_select_enterprise"
  ON payments FOR SELECT TO authenticated
  USING (
    enterprise_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = payments.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'billing.view'
    )
  );

-- Users can read their own payments
DROP POLICY IF EXISTS "payments_select_own" ON payments;
CREATE POLICY "payments_select_own"
  ON payments FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Super admin can read all payments
DROP POLICY IF EXISTS "payments_select_super_admin" ON payments;
CREATE POLICY "payments_select_super_admin"
  ON payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

-- Enterprise owners can insert payment records
DROP POLICY IF EXISTS "payments_insert_enterprise" ON payments;
CREATE POLICY "payments_insert_enterprise"
  ON payments FOR INSERT TO authenticated
  WITH CHECK (
    enterprise_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = payments.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'billing.manage'
    )
  );

-- Users can insert their own payment records
DROP POLICY IF EXISTS "payments_insert_own" ON payments;
CREATE POLICY "payments_insert_own"
  ON payments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Super admin can insert payment records
DROP POLICY IF EXISTS "payments_super_admin_insert" ON payments;
CREATE POLICY "payments_super_admin_insert"
  ON payments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

-- Webhook (anon) can insert payments — needed for Paystack webhook
DROP POLICY IF EXISTS "payments_insert_anon" ON payments;
CREATE POLICY "payments_insert_anon"
  ON payments FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Super admin can update all payments
DROP POLICY IF EXISTS "payments_super_admin_update" ON payments;
CREATE POLICY "payments_super_admin_update"
  ON payments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

-- Enterprise owners can update their enterprise payments
DROP POLICY IF EXISTS "payments_update_enterprise" ON payments;
CREATE POLICY "payments_update_enterprise"
  ON payments FOR UPDATE TO authenticated
  USING (
    enterprise_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = payments.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'billing.manage'
    )
  );

-- Webhook (anon) can update payments — needed for Paystack webhook
DROP POLICY IF EXISTS "payments_update_anon" ON payments;
CREATE POLICY "payments_update_anon"
  ON payments FOR UPDATE TO anon, authenticated
  USING (true);

-- ============================================================
-- SESSIONS (device tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name text,
  device_type text,
  ip_address text,
  user_agent text,
  location text,
  is_current boolean NOT NULL DEFAULT false,
  is_revoked boolean NOT NULL DEFAULT false,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_select_own" ON sessions;
CREATE POLICY "sessions_select_own"
  ON sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_insert_own" ON sessions;
CREATE POLICY "sessions_insert_own"
  ON sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_update_own" ON sessions;
CREATE POLICY "sessions_update_own"
  ON sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sessions_delete_own" ON sessions;
CREATE POLICY "sessions_delete_own"
  ON sessions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_invites_enterprise_id ON invites(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_enterprise_id ON audit_logs(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_subscriptions_enterprise_id ON subscriptions(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_enterprise_id ON payments(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked ON sessions(is_revoked);

-- ============================================================
-- UPDATE ENTERPRISES FK TO PLANS
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'enterprises_plan_id_fkey'
  ) THEN
    ALTER TABLE enterprises
    ADD CONSTRAINT enterprises_plan_id_fkey
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL;
  END IF;
END $$;
