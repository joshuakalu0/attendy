/*
# Seed System Data: Permissions, Roles, Account Types, Role-Permission Mappings

## Overview
Seeds all granular permissions, system roles (Super Admin, Enterprise Owner,
Enterprise Admin, Manager, Staff, Normal User), account types, and the
role-permission mappings that define what each role can do.

## Seeded Data
1. **Permissions** - 20 granular permission strings across 7 categories:
   employees.invite, employees.remove, employees.manage, roles.manage,
   billing.view, billing.manage, settings.edit, settings.view,
   audit.view, departments.manage, enterprise.profile.edit,
   users.view, plans.manage, subscriptions.manage, impersonation.use,
   dashboard.view, members.view, core.module.access, notifications.manage,
   enterprise.create

2. **System Roles** - 6 immutable roles:
   - Super Admin: all permissions
   - Enterprise Owner: enterprise management permissions
   - Enterprise Admin: enterprise management minus billing.manage
   - Manager: employee management, view billing
   - Staff: view dashboard, view members
   - Normal User: personal dashboard, billing, settings

3. **Account Types** - 3 types:
   - super_admin -> /dashboard/super-admin
   - enterprise -> /dashboard/enterprise
   - normal_user -> /dashboard/user

4. **Role-Permission Mappings** - Connects each role to its permissions.

## Notes
- System roles have is_system=true and enterprise_id=null.
- Account types reference default_role_id for each type.
- This migration is idempotent — uses INSERT ... ON CONFLICT DO NOTHING.
*/

-- ============================================================
-- PERMISSIONS
-- ============================================================
INSERT INTO permissions (key, label, description, category) VALUES
  ('employees.invite', 'Invite Employees', 'Can send invitations to new employees', 'employees'),
  ('employees.remove', 'Remove Employees', 'Can remove employees from enterprise', 'employees'),
  ('employees.manage', 'Manage Employees', 'Can deactivate/reactivate employees, change roles', 'employees'),
  ('roles.manage', 'Manage Roles', 'Can create, edit, and delete custom roles', 'roles'),
  ('billing.view', 'View Billing', 'Can view billing and subscription details', 'billing'),
  ('billing.manage', 'Manage Billing', 'Can change plans, update payment methods', 'billing'),
  ('settings.edit', 'Edit Settings', 'Can edit enterprise settings', 'settings'),
  ('settings.view', 'View Settings', 'Can view enterprise settings', 'settings'),
  ('audit.view', 'View Audit Log', 'Can view the audit log', 'audit'),
  ('departments.manage', 'Manage Departments', 'Can create, edit, and delete departments', 'departments'),
  ('enterprise.profile.edit', 'Edit Enterprise Profile', 'Can edit the enterprise profile', 'enterprise'),
  ('users.view', 'View All Users', 'Can view all platform users (super admin)', 'platform'),
  ('plans.manage', 'Manage Plans', 'Can create and edit subscription plans (super admin)', 'platform'),
  ('subscriptions.manage', 'Manage Subscriptions', 'Can manage any subscription (super admin)', 'platform'),
  ('impersonation.use', 'Impersonate Users', 'Can impersonate enterprise users for support', 'platform'),
  ('dashboard.view', 'View Dashboard', 'Can view the dashboard', 'general'),
  ('members.view', 'View Members', 'Can view enterprise members', 'employees'),
  ('core.module.access', 'Access Core Module', 'Can access the core product module', 'general'),
  ('notifications.manage', 'Manage Notifications', 'Can manage notification settings', 'settings'),
  ('enterprise.create', 'Create Enterprise', 'Can create a new enterprise account', 'general')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- SYSTEM ROLES
-- ============================================================
INSERT INTO roles (id, name, description, is_system, enterprise_id, account_type_id) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Super Admin', 'Platform owner with full access to everything', true, NULL, NULL),
  ('00000000-0000-0000-0000-000000000002', 'Enterprise Owner', 'Owner of an enterprise with full enterprise access', true, NULL, NULL),
  ('00000000-0000-0000-0000-000000000003', 'Enterprise Admin', 'Administrator of an enterprise', true, NULL, NULL),
  ('00000000-0000-0000-0000-000000000004', 'Manager', 'Manager within an enterprise', true, NULL, NULL),
  ('00000000-0000-0000-0000-000000000005', 'Staff', 'Staff member within an enterprise', true, NULL, NULL),
  ('00000000-0000-0000-0000-000000000006', 'Normal User', 'Individual user not attached to any enterprise', true, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ACCOUNT TYPES
-- ============================================================
INSERT INTO account_types (key, label, description, default_role_id, dashboard_route, onboarding_flow, sort_order) VALUES
  ('super_admin', 'Super Admin', 'Platform owner with full access', '00000000-0000-0000-0000-000000000001', '/dashboard/super-admin', 'super_admin', 1),
  ('enterprise', 'Enterprise', 'Organization account with employees', '00000000-0000-0000-0000-000000000002', '/dashboard/enterprise', 'enterprise', 2),
  ('normal_user', 'Normal User', 'Individual account', '00000000-0000-0000-0000-000000000006', '/dashboard/user', 'normal_user', 3)
ON CONFLICT (key) DO NOTHING;

-- Link account_types.default_role_id to the system roles
UPDATE account_types SET default_role_id = '00000000-0000-0000-0000-000000000001' WHERE key = 'super_admin';
UPDATE account_types SET default_role_id = '00000000-0000-0000-0000-000000000002' WHERE key = 'enterprise';
UPDATE account_types SET default_role_id = '00000000-0000-0000-0000-000000000006' WHERE key = 'normal_user';

-- ============================================================
-- ROLE-PERMISSION MAPPINGS
-- ============================================================

-- Super Admin: ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id FROM permissions
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Enterprise Owner: enterprise management permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', id FROM permissions
WHERE key IN (
  'employees.invite', 'employees.remove', 'employees.manage',
  'roles.manage', 'billing.view', 'billing.manage',
  'settings.edit', 'settings.view', 'audit.view',
  'departments.manage', 'enterprise.profile.edit',
  'dashboard.view', 'members.view', 'core.module.access',
  'notifications.manage'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Enterprise Admin: enterprise management minus billing.manage
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', id FROM permissions
WHERE key IN (
  'employees.invite', 'employees.remove', 'employees.manage',
  'roles.manage', 'billing.view',
  'settings.edit', 'settings.view', 'audit.view',
  'departments.manage', 'enterprise.profile.edit',
  'dashboard.view', 'members.view', 'core.module.access',
  'notifications.manage'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager: employee management, view billing
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000004', id FROM permissions
WHERE key IN (
  'employees.invite', 'employees.manage',
  'billing.view', 'settings.view',
  'departments.manage', 'audit.view',
  'dashboard.view', 'members.view', 'core.module.access'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Staff: view dashboard, view members
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000005', id FROM permissions
WHERE key IN (
  'dashboard.view', 'members.view', 'core.module.access'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Normal User: personal dashboard, billing, settings
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000006', id FROM permissions
WHERE key IN (
  'dashboard.view', 'billing.view', 'billing.manage',
  'core.module.access', 'notifications.manage'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;
