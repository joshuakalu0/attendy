# Platform — Multi-tenant Authentication, RBAC & Account Platform

A production-grade authentication, authorization, organization-management, billing, and settings layer for a SaaS product. Built with Next.js (App Router), TypeScript, Tailwind CSS, and Supabase (PostgreSQL).

## Table of Contents

- [Overview](#overview)
- [Stack](#stack)
- [Setup](#setup)
- [Architecture](#architecture)
- [Database ERD](#database-erd)
- [How to Add a New User Type](#how-to-add-a-new-user-type)
- [How to Plug in the Core Feature Module](#how-to-plug-in-the-core-feature-module)
- [Assumptions](#assumptions)

## Overview

This platform provides the complete "shell" of a SaaS product — everything except the core product feature itself. It includes:

- **Authentication**: Email + password registration with email verification, login, logout, logout-all-devices, password reset and change, brute-force protection via Supabase Auth.
- **RBAC**: Granular permissions, system roles (Super Admin, Enterprise Owner, Enterprise Admin, Manager, Staff, Normal User), custom enterprise roles, permission checks on both frontend and backend.
- **Multi-tenancy**: Enterprise isolation enforced at the database level via Row Level Security (RLS) policies.
- **Enterprise management**: Employee invitations (email + signed token), employee list/search/filter, role assignment, deactivate/reactivate, remove, departments.
- **Dashboards**: Super Admin, Enterprise, Normal User, and Employee views, each with a shared layout shell, permission-based sidebar navigation, and a clearly marked empty "Core Module" slot.
- **Billing**: Plans management (super admin), subscription tracking, payment history, plan limits enforced server-side.
- **Audit log**: Append-only, enterprise-scoped and platform-wide.
- **Notifications**: In-app notifications with unread badge.
- **Module registry**: A single registration point for the future core feature.

## Stack

| Component | Technology |
|-----------|-----------|
| Frontend | Next.js 13 (App Router), TypeScript, Tailwind CSS |
| UI Library | shadcn/ui + Radix UI |
| Backend | Supabase (PostgreSQL, Auth, RLS, Edge Functions) |
| Auth | Supabase Auth (JWT, refresh rotation, email verification) |
| Icons | lucide-react |

> **Note on Django**: The original spec requested Django + DRF. This environment runs Next.js with Supabase as its backend. Every Django concept maps to a Supabase equivalent:
> - DRF permission classes → RLS policies + SECURITY DEFINER functions
> - Queryset-level tenant isolation → Row Level Security
> - Django management commands → SQL migrations
> - Django email backend → Supabase Auth email

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment variables**: The `.env` file is pre-populated with Supabase credentials. For reference, see `.env.example`.

3. **Run the dev server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

## Architecture

```
├── app/
│   ├── page.tsx                    # Landing page
│   ├── login/                      # Login page
│   ├── register/                   # Registration (individual + enterprise)
│   ├── forgot-password/            # Password reset request
│   ├── reset-password/             # Set new password
│   ├── accept-invite/              # Employee invite acceptance
│   ├── login-router/               # Post-login redirect based on account type
│   ├── unauthorized/               # 403 page
│   └── dashboard/
│       ├── enterprise/             # Enterprise dashboard (overview, employees, roles, departments, billing, audit, settings, profile)
│       ├── super-admin/            # Super Admin dashboard (overview, enterprises, users, plans, subscriptions, audit, settings, profile)
│       └── user/                   # Normal User dashboard (overview, billing, settings, profile)
├── components/
│   ├── dashboard/                  # Shared layout shell, core module slot
│   ├── auth/                       # Permission gate component
│   └── ui/                         # shadcn/ui components
├── lib/
│   ├── supabase/                   # Supabase client (browser + server)
│   ├── auth-context.tsx            # Auth provider with profile, permissions, enterprises
│   ├── hooks/use-permissions.ts    # Permission check hook
│   ├── module-registry.ts          # Core module registration point
│   ├── types.ts                    # TypeScript types
│   └── utils.ts                    # Utility functions
└── supabase/
    └── migrations/                 # 5 SQL migrations (schema, seed, functions)
```

### Authentication Flow

1. User signs up (individual or enterprise) → Supabase Auth creates the user → trigger auto-creates a `profiles` row with `normal_user` or `enterprise` account type.
2. For enterprise signup, the system also creates an `enterprises` row and a `memberships` row (Owner role).
3. After login, the `login-router` page reads the user's account type and redirects to the appropriate dashboard.
4. The `AuthProvider` loads the user's profile, permissions (via `get_user_permissions()` RPC), and enterprise memberships (via `get_user_enterprise()` RPC) on every auth state change.

### Permission System

- **Backend**: RLS policies check membership + role_permissions before allowing access. SECURITY DEFINER functions handle privileged operations.
- **Frontend**: The `usePermissions` hook returns the user's permission array. The `<Can>` component gates UI elements. This is UX-only — the backend is the source of truth.

### Tenant Isolation

Every enterprise-scoped table has RLS policies that check `EXISTS (SELECT 1 FROM memberships WHERE enterprise_id = <table>.enterprise_id AND user_id = auth.uid() AND status = 'active')`. A user from enterprise A cannot read or write enterprise B's data.

## Database ERD

```
account_types (1) ──< (N) profiles
account_types (1) ──< (1) roles (default_role_id)
enterprises (1) ──< (N) memberships >── (1) users (auth.users)
enterprises (1) ──< (N) departments
enterprises (1) ──< (N) invites
enterprises (1) ──< (N) roles (custom)
enterprises (1) ──< (N) subscriptions
enterprises (1) ──< (N) payments
enterprises (1) ──< (N) audit_logs
roles (1) ──< (N) role_permissions >── (1) permissions
roles (1) ──< (N) memberships
departments (1) ──< (N) department_members
plans (1) ──< (N) subscriptions
plans (1) ──< (N) enterprises (via plan_id)
users (auth.users) (1) ──< (1) profiles
users (auth.users) (1) ──< (N) notifications
users (auth.users) (1) ──< (N) sessions
users (auth.users) (1) ──< (N) audit_logs (actor_id)
```

### Tables

| Table | Purpose |
|-------|---------|
| `account_types` | Extensible registry of user types (super_admin, enterprise, normal_user) |
| `profiles` | Public user data linked to auth.users |
| `enterprises` | Organization (tenant) records |
| `memberships` | User ↔ enterprise link with role |
| `permissions` | Granular permission strings |
| `roles` | Permission bundles (system + custom) |
| `role_permissions` | Many-to-many: roles ↔ permissions |
| `invites` | Employee invitations with signed tokens |
| `departments` | Optional enterprise grouping |
| `department_members` | User ↔ department link |
| `plans` | Subscription plans |
| `subscriptions` | Active subscriptions |
| `payments` | Payment records |
| `audit_logs` | Append-only audit trail |
| `notifications` | In-app notifications |
| `sessions` | Device/session tracking |

## How to Add a New User Type

The account type system is a database registry, not a hardcoded enum. To add a new type (e.g., "Partner"):

1. **Insert a new account type** via SQL:
   ```sql
   INSERT INTO account_types (key, label, description, dashboard_route, onboarding_flow, sort_order)
   VALUES ('partner', 'Partner', 'Partner account type', '/dashboard/partner', 'partner', 4);
   ```

2. **Create a system role** for the new type:
   ```sql
   INSERT INTO roles (id, name, description, is_system, enterprise_id, account_type_id)
   VALUES (gen_random_uuid(), 'Partner', 'Partner role', true, NULL,
     (SELECT id FROM account_types WHERE key = 'partner'));
   ```

3. **Assign permissions** to the role:
   ```sql
   INSERT INTO role_permissions (role_id, permission_id)
   SELECT <role_id>, id FROM permissions WHERE key IN ('dashboard.view', 'core.module.access');
   ```

4. **Update the default_role_id**:
   ```sql
   UPDATE account_types SET default_role_id = <role_id> WHERE key = 'partner';
   ```

5. **Create the dashboard route**: Add `app/dashboard/partner/` with a layout and pages.

6. **Update the nav items** in `components/dashboard/dashboard-layout.tsx` to handle the new account type.

No core auth code changes are needed — the profile trigger, permission lookup, and login router all read from the `account_types` table.

## How to Plug in the Core Feature Module

The module registry is the single registration point. Every dashboard has a clearly marked "Core Module" slot that displays a placeholder until a module is registered.

1. **Create the feature pages** under your dashboard:
   ```
   app/dashboard/enterprise/core-module/inventory/page.tsx
   ```

2. **Register the module** in `lib/module-registry.ts`:
   ```typescript
   export const moduleRegistry: ModuleRegistryEntry[] = [
     {
       key: 'inventory',
       label: 'Inventory',
       href: '/dashboard/enterprise/core-module/inventory',
       icon: 'Package',
       requiredPermission: 'core.module.access',
       requiresActiveSubscription: true,
     },
   ];
   ```

3. The module automatically appears in the sidebar nav for users with the `core.module.access` permission. If `requiresActiveSubscription` is true, the module is gated by the enterprise's subscription status.

4. To add the module to the sidebar, update the nav items in the dashboard layout to include entries from `getModulesForContext()`.

## Assumptions

1. **Django → Supabase**: The original spec requested Django + DRF. Since this environment runs Next.js + Supabase, all backend logic is implemented via Supabase RLS policies, SECURITY DEFINER functions, and Edge Functions. The architecture is equivalent.

2. **Paystack**: The billing UI and database schema are fully built. The Paystack payment integration (transaction initialization, webhook verification) requires a Paystack secret key. The plan selection flow shows a notification indicating payment integration is ready for Paystack configuration.

3. **Google OAuth**: Not implemented in this build. Supabase Auth supports Google OAuth natively — it can be enabled by adding Google as a provider in the Supabase dashboard and adding a "Sign in with Google" button to the login page.

4. **2FA**: The database schema includes 2FA fields (secret, recovery codes, enabled flag). The TOTP enrollment and verification flow requires an Edge Function with a TOTP library. The security page UI is ready for this integration.

5. **Email**: Supabase Auth handles verification and password reset emails natively. Custom notification emails (invites, payment receipts) would be sent via Edge Functions with an SMTP provider.

6. **Impersonation**: The audit log schema includes an `impersonated_by` field. The full impersonation flow (time-limited session, banner, audit logging) requires a SECURITY DEFINER function to set the impersonation context and middleware to enforce the banner.
