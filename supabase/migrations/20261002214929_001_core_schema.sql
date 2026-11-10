/*
# Core Schema: Account Types, Profiles, Enterprises, RBAC, Departments

## Overview
Creates the foundational data model for a multi-tenant SaaS platform with
extensible user types, enterprise tenancy, role-based access control (RBAC),
and department grouping. All tables are created first, then RLS policies
are applied after all tables exist to avoid forward-reference errors.

## New Tables
1. account_types - Extensible registry of user types
2. profiles - Public user profile data linked to auth.users
3. enterprises - Organization (tenant) records
4. permissions - Granular permission strings
5. roles - Bundles of permissions (system + custom enterprise roles)
6. role_permissions - Many-to-many join between roles and permissions
7. memberships - Links users to enterprises with a role
8. departments - Optional grouping within an enterprise
9. department_members - Links users to departments

## Security
- RLS enabled on every table with ownership/membership-based policies.
- Super admin gets cross-tenant read access via account_type check.
- Enterprise data isolated by membership existence checks.
*/

-- ============================================================
-- TABLES (created in dependency order, no policies yet)
-- ============================================================

CREATE TABLE IF NOT EXISTS account_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  description text,
  default_role_id uuid,
  dashboard_route text NOT NULL,
  onboarding_flow text NOT NULL DEFAULT 'default',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  phone text,
  account_type_id uuid REFERENCES account_types(id),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'deactivated', 'grace_period', 'deleted')),
  two_factor_enabled boolean NOT NULL DEFAULT false,
  two_factor_secret text,
  two_factor_recovery_codes jsonb DEFAULT '[]'::jsonb,
  notification_prefs jsonb NOT NULL DEFAULT '{"invite":true,"password_change":true,"new_device":true,"payment":true}'::jsonb,
  theme text NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
  language text NOT NULL DEFAULT 'en',
  timezone text NOT NULL DEFAULT 'UTC',
  deletion_requested_at timestamptz,
  deletion_scheduled_for timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS enterprises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  contact_email text,
  contact_phone text,
  address text,
  timezone text NOT NULL DEFAULT 'UTC',
  currency text NOT NULL DEFAULT 'USD',
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_id uuid,
  subscription_status text NOT NULL DEFAULT 'none'
    CHECK (subscription_status IN ('none', 'active', 'trialing', 'past_due', 'canceled', 'inactive')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  enterprise_id uuid REFERENCES enterprises(id) ON DELETE CASCADE,
  account_type_id uuid REFERENCES account_types(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT role_scope CHECK (
    (is_system = true AND enterprise_id IS NULL) OR
    (is_system = false AND enterprise_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  department_id uuid,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invited', 'deactivated', 'left')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, enterprise_id)
);

CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  head_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enterprise_id, name)
);

CREATE TABLE IF NOT EXISTS department_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enterprise_id uuid NOT NULL REFERENCES enterprises(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (department_id, user_id)
);

-- Add FK: memberships.department_id -> departments.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'memberships_department_id_fkey'
  ) THEN
    ALTER TABLE memberships
    ADD CONSTRAINT memberships_department_id_fkey
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================
-- RLS ENABLE
-- ============================================================
ALTER TABLE account_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE enterprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Helper: super admin check subquery used across policies
-- We inline it in each policy for performance.

-- ---- account_types: readable by all authenticated ----
DROP POLICY IF EXISTS "account_types_read_all" ON account_types;
CREATE POLICY "account_types_read_all"
  ON account_types FOR SELECT TO authenticated USING (true);

-- ---- permissions: readable by all authenticated ----
DROP POLICY IF EXISTS "permissions_select_all" ON permissions;
CREATE POLICY "permissions_select_all"
  ON permissions FOR SELECT TO authenticated USING (true);

-- ---- profiles ----
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_select_super_admin" ON profiles;
CREATE POLICY "profiles_select_super_admin"
  ON profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "profiles_update_super_admin" ON profiles;
CREATE POLICY "profiles_update_super_admin"
  ON profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

-- ---- enterprises ----
DROP POLICY IF EXISTS "enterprises_select_members" ON enterprises;
CREATE POLICY "enterprises_select_members"
  ON enterprises FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.enterprise_id = enterprises.id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "enterprises_select_super_admin" ON enterprises;
CREATE POLICY "enterprises_select_super_admin"
  ON enterprises FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

DROP POLICY IF EXISTS "enterprises_insert" ON enterprises;
CREATE POLICY "enterprises_insert"
  ON enterprises FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "enterprises_update_owner" ON enterprises;
CREATE POLICY "enterprises_update_owner"
  ON enterprises FOR UPDATE TO authenticated
  USING (
    enterprises.owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

-- ---- roles ----
DROP POLICY IF EXISTS "roles_select_all" ON roles;
CREATE POLICY "roles_select_all"
  ON roles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "roles_super_admin_insert" ON roles;
CREATE POLICY "roles_super_admin_insert"
  ON roles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

DROP POLICY IF EXISTS "roles_enterprise_insert" ON roles;
CREATE POLICY "roles_enterprise_insert"
  ON roles FOR INSERT TO authenticated
  WITH CHECK (
    enterprise_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = roles.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'roles.manage'
    )
  );

DROP POLICY IF EXISTS "roles_enterprise_update" ON roles;
CREATE POLICY "roles_enterprise_update"
  ON roles FOR UPDATE TO authenticated
  USING (
    is_system = false AND enterprise_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = roles.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'roles.manage'
    )
  );

DROP POLICY IF EXISTS "roles_enterprise_delete" ON roles;
CREATE POLICY "roles_enterprise_delete"
  ON roles FOR DELETE TO authenticated
  USING (
    is_system = false AND enterprise_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = roles.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'roles.manage'
    )
  );

-- ---- role_permissions ----
DROP POLICY IF EXISTS "role_permissions_select_all" ON role_permissions;
CREATE POLICY "role_permissions_select_all"
  ON role_permissions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rp_super_admin_insert" ON role_permissions;
CREATE POLICY "rp_super_admin_insert"
  ON role_permissions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

DROP POLICY IF EXISTS "rp_enterprise_insert" ON role_permissions;
CREATE POLICY "rp_enterprise_insert"
  ON role_permissions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.id = role_permissions.role_id
      AND r.is_system = false
      AND r.enterprise_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM memberships m
        JOIN role_permissions mrp ON mrp.role_id = m.role_id
        JOIN permissions mp ON mp.id = mrp.permission_id
        WHERE m.enterprise_id = r.enterprise_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND mp.key = 'roles.manage'
      )
    )
  );

DROP POLICY IF EXISTS "rp_super_admin_delete" ON role_permissions;
CREATE POLICY "rp_super_admin_delete"
  ON role_permissions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

DROP POLICY IF EXISTS "rp_enterprise_delete" ON role_permissions;
CREATE POLICY "rp_enterprise_delete"
  ON role_permissions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roles r
      WHERE r.id = role_permissions.role_id
      AND r.is_system = false
      AND r.enterprise_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM memberships m
        JOIN role_permissions mrp ON mrp.role_id = m.role_id
        JOIN permissions mp ON mp.id = mrp.permission_id
        WHERE m.enterprise_id = r.enterprise_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND mp.key = 'roles.manage'
      )
    )
  );

-- ---- memberships ----
DROP POLICY IF EXISTS "memberships_select_own" ON memberships;
CREATE POLICY "memberships_select_own"
  ON memberships FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "memberships_select_enterprise" ON memberships;
CREATE POLICY "memberships_select_enterprise"
  ON memberships FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m2
      WHERE m2.enterprise_id = memberships.enterprise_id
      AND m2.user_id = auth.uid()
      AND m2.status = 'active'
    )
  );

DROP POLICY IF EXISTS "memberships_select_super_admin" ON memberships;
CREATE POLICY "memberships_select_super_admin"
  ON memberships FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

DROP POLICY IF EXISTS "memberships_insert_enterprise" ON memberships;
CREATE POLICY "memberships_insert_enterprise"
  ON memberships FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = memberships.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'employees.invite'
    )
  );

DROP POLICY IF EXISTS "memberships_super_admin_insert" ON memberships;
CREATE POLICY "memberships_super_admin_insert"
  ON memberships FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

DROP POLICY IF EXISTS "memberships_update_enterprise" ON memberships;
CREATE POLICY "memberships_update_enterprise"
  ON memberships FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = memberships.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key IN ('employees.invite', 'employees.remove', 'roles.manage')
    )
  );

DROP POLICY IF EXISTS "memberships_super_admin_update" ON memberships;
CREATE POLICY "memberships_super_admin_update"
  ON memberships FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

DROP POLICY IF EXISTS "memberships_delete_enterprise" ON memberships;
CREATE POLICY "memberships_delete_enterprise"
  ON memberships FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = memberships.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'employees.remove'
    )
  );

DROP POLICY IF EXISTS "memberships_super_admin_delete" ON memberships;
CREATE POLICY "memberships_super_admin_delete"
  ON memberships FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

-- ---- departments ----
DROP POLICY IF EXISTS "departments_select_enterprise" ON departments;
CREATE POLICY "departments_select_enterprise"
  ON departments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.enterprise_id = departments.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "departments_select_super_admin" ON departments;
CREATE POLICY "departments_select_super_admin"
  ON departments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

DROP POLICY IF EXISTS "departments_insert_enterprise" ON departments;
CREATE POLICY "departments_insert_enterprise"
  ON departments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = departments.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'settings.edit'
    )
  );

DROP POLICY IF EXISTS "departments_update_enterprise" ON departments;
CREATE POLICY "departments_update_enterprise"
  ON departments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = departments.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'settings.edit'
    )
  );

DROP POLICY IF EXISTS "departments_delete_enterprise" ON departments;
CREATE POLICY "departments_delete_enterprise"
  ON departments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = departments.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'settings.edit'
    )
  );

-- ---- department_members ----
DROP POLICY IF EXISTS "dept_members_select_enterprise" ON department_members;
CREATE POLICY "dept_members_select_enterprise"
  ON department_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.enterprise_id = department_members.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "dept_members_select_super_admin" ON department_members;
CREATE POLICY "dept_members_select_super_admin"
  ON department_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.user_id = auth.uid()
      AND p.account_type_id IN (SELECT id FROM account_types WHERE key = 'super_admin')
    )
  );

DROP POLICY IF EXISTS "dept_members_insert_enterprise" ON department_members;
CREATE POLICY "dept_members_insert_enterprise"
  ON department_members FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = department_members.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'settings.edit'
    )
  );

DROP POLICY IF EXISTS "dept_members_delete_enterprise" ON department_members;
CREATE POLICY "dept_members_delete_enterprise"
  ON department_members FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN role_permissions rp ON rp.role_id = m.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE m.enterprise_id = department_members.enterprise_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND p.key = 'settings.edit'
    )
  );

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_enterprises_owner_id ON enterprises(owner_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_enterprise_id ON memberships(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);
CREATE INDEX IF NOT EXISTS idx_roles_enterprise_id ON roles(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_departments_enterprise_id ON departments(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_dept_members_enterprise_id ON department_members(enterprise_id);
