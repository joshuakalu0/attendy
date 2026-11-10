# Codebase Audit — Pre-Attendance Build

## 1. Sessions, Current User, Active Tenant, and can() API

### Session management
- **Client-side only.** `AuthProvider` (`lib/auth-context.tsx`) calls `supabase.auth.getSession()` on mount and subscribes to `onAuthStateChange`. No server-side session validation exists — the `lib/supabase/server.ts` file creates a client with cookie forwarding but is unused by any page.
- On auth state change, `loadUserData(userId)` fires three parallel RPCs: `get_user_profile`, `get_user_permissions`, `get_user_enterprise`.
- The `sessions` table exists for device tracking but is not populated automatically — the "Sign Out All Devices" button in `dashboard-layout.tsx` sets `is_revoked = true` on all rows.

### Current user resolution
- `useAuth()` returns `{ user, profile, enterprises, permissions, loading, refresh }`.
- `user` is `{ id, email }` from the Supabase session.
- `profile` comes from `get_user_profile()` RPC — a JSON object with `account_type` (key string like `'enterprise'`), `account_type_label`, `dashboard_route`, plus theme/language/timezone/notification_prefs.
- `enterprises` comes from `get_user_enterprise()` RPC — a JSON array of `{ enterprise_id, role_id, role_name, membership_id, status, department_id, is_owner }`.

### Active tenant resolution
- **There is no active tenant concept.** The frontend uses `enterprises[0]` as the single enterprise in `dashboard-layout.tsx` and all enterprise dashboard pages. The `get_user_enterprise()` function returns ALL memberships, but the UI only displays the first.
- No workspace switcher exists. No workspace ID is stored in the session or URL.

### can() API
```typescript
// lib/hooks/use-permissions.ts
const { can, canAny, canAll } = usePermissions();
can('employees.invite')     // boolean — flat string check
canAny(['a', 'b'])          // any match
canAll(['a', 'b'])          // all match
```
- **No resource parameter.** `can(permission)` checks `permissions.includes(permission)`. There is no `can(user, permission, resource?)` signature. Branch-scoped access does not exist.
- The `<Can>` component (`components/auth/can.tsx`) wraps `can()` for declarative use.
- Permissions come from `get_user_permissions()` RPC which merges enterprise role permissions with account-type default role permissions into one flat array.

### Post-login routing
- `app/login-router/page.tsx` reads `profile.dashboard_route` and redirects. Single destination per account type — no workspace picker.

## 2. Data Models

### User
- `auth.users` (Supabase managed) → `profiles` (1:1 via `user_id` FK, ON DELETE CASCADE).
- `profiles`: `id`, `user_id`, `email`, `full_name`, `avatar_url`, `phone`, `account_type_id` (single FK → `account_types`), `status` (`active|deactivated|grace_period|deleted`), `two_factor_enabled`, `two_factor_secret`, `two_factor_recovery_codes` (jsonb), `notification_prefs` (jsonb), `theme`, `language`, `timezone`, `deletion_requested_at`, `deletion_scheduled_for`, timestamps.
- **Constraint**: One `account_type_id` per user. A user is either super_admin, enterprise, or normal_user — not multiple.

### AccountType
- `account_types`: `id`, `key` (unique: `super_admin|enterprise|normal_user`), `label`, `description`, `default_role_id` (FK → roles), `dashboard_route`, `onboarding_flow`, `sort_order`, `is_active`.
- Seeded with 3 types. Extensible by inserting new rows.

### Enterprise/Tenant
- `enterprises`: `id`, `name`, `logo_url`, `contact_email`, `contact_phone`, `address`, `timezone`, `currency`, `owner_id` (FK → auth.users), `plan_id` (FK → plans), `subscription_status` (`none|active|trialing|past_due|canceled|inactive`), `is_active`, timestamps.

### Membership
- `memberships`: `id`, `user_id`, `enterprise_id`, `role_id`, `department_id`, `status` (`active|invited|deactivated|left`), `joined_at`, timestamps.
- **UNIQUE(user_id, enterprise_id)** — one membership per enterprise per user.
- RLS: user reads own memberships + enterprise members read each other's; inserts require `employees.invite` permission; updates require `employees.invite|employees.remove|roles.manage`; deletes require `employees.remove`.

### Role
- `roles`: `id`, `name`, `description`, `is_system`, `enterprise_id` (nullable — null for system, set for custom), `account_type_id` (nullable link to account type).
- **Constraint**: `CHECK (is_system=true AND enterprise_id IS NULL) OR (is_system=false AND enterprise_id IS NOT NULL)`.
- 6 system roles seeded with fixed UUIDs: Super Admin, Enterprise Owner, Enterprise Admin, Manager, Staff, Normal User.

### Permission
- `permissions`: `id`, `key` (unique), `label`, `description`, `category`.
- 20 permissions seeded across 7 categories.

### Role-Permission
- `role_permissions`: `role_id`, `permission_id`, UNIQUE pair.
- Super Admin gets ALL permissions. Owner/Admin/Manager/Staff/Normal User get subsets.

### Invite
- `invites`: `id`, `enterprise_id`, `email`, `role_id`, `invited_by`, `token` (unique, `encode(gen_random_bytes(32), 'hex')`), `status` (`pending|accepted|expired|cancelled`), `department_id`, `expires_at` (default 7 days), `accepted_at`, `accepted_by`, timestamps.
- RLS: enterprise members can read; `employees.invite` needed to create/update/delete; `anon` can read by token (for accept flow — but policy is `USING (token IS NOT NULL)` which is overly broad).

### Plan
- `plans`: `id`, `name`, `description`, `price_cents`, `currency`, `interval` (`monthly|yearly`), `max_employees` (nullable = unlimited), `features` (jsonb), `is_active`, `sort_order`, `paystack_plan_code`.
- 3 plans seeded: Free ($0, 5 employees), Pro ($49, 50 employees), Enterprise ($199, unlimited).

### Subscription
- `subscriptions`: `id`, `enterprise_id` (nullable), `user_id` (nullable), `plan_id`, `status`, period dates, Paystack codes, `metadata` (jsonb).
- CHECK: at least one of enterprise_id or user_id must be set.

### AuditLog
- `audit_logs`: `id`, `enterprise_id` (nullable), `actor_id`, `actor_email`, `action`, `resource_type`, `resource_id`, `details` (jsonb), `ip_address`, `user_agent`, `impersonated_by`, `created_at`.
- Append-only (no UPDATE/DELETE policies). Insert by any authenticated user.

### Notification
- `notifications`: `id`, `user_id`, `type`, `title`, `message`, `data` (jsonb), `read`, `created_at`.
- User-scoped CRUD via RLS.

### Tenant isolation enforcement
- **Row Level Security on every table.** Enterprise-scoped tables check `EXISTS (SELECT 1 FROM memberships WHERE enterprise_id = <table>.enterprise_id AND user_id = auth.uid() AND status = 'active')`.
- Super admin bypasses via `account_types.key = 'super_admin'` check.
- Profiles are user-scoped (own row only) with super admin override.
- No column-level security. No SECURITY DEFINER functions for mutations (except audit logging and seat limit check).

## 3. Module Registry

### How it works
- `lib/module-registry.ts`: exports `moduleRegistry: ModuleRegistryEntry[]` (currently empty) and `getModulesForContext(context)` which filters entries by `href.includes('/dashboard/${context}/')`.
- `ModuleRegistryEntry`: `{ key, label, href, icon, requiredPermission, requiresActiveSubscription }`.
- **The registry is not consumed by the dashboard layout.** The `DashboardLayout` component hardcodes nav items in `getNavItems(accountType)` and renders a static "Core Module" placeholder div. No code reads from `moduleRegistry` or `getModulesForContext()`.

### Where the core slot is
- In `components/dashboard/dashboard-layout.tsx`, inside `SidebarContent()`, after the nav items: a `<div className="pt-4">` with "Core Module" label and a dashed-border placeholder with `<Plug>` icon and "Not configured" text.
- `components/dashboard/core-module-slot.tsx` renders a similar placeholder for page bodies.
- Enterprise and super-admin overview pages (`app/dashboard/enterprise/page.tsx`, `app/dashboard/super-admin/page.tsx`) render `<CoreModuleSlot />` in the page body.

## 4. Invites, Plan Limits, Audit, Notifications

### Invites
- Created via direct `supabase.from('invites').insert(...)` in `app/dashboard/enterprise/employees/page.tsx`.
- Token auto-generated by default (`encode(gen_random_bytes(32), 'hex')`).
- Accept flow in `app/accept-invite/page.tsx`: reads invite by token from URL param, validates status/expiry, calls `supabase.auth.signUp()` with the invite email, then inserts a `memberships` row and marks invite as accepted.
- **No email verification gate** in the accept flow — signUp is called and membership is created immediately.
- **No branch assignment** or staff schedule in invites.
- **No bulk invite** — only single email.

### Plan limits
- `check_seat_limit(p_enterprise_id)` RPC: returns boolean. Checks `max_employees` from plan against count of `memberships WHERE status IN ('active', 'invited')`.
- Only `max_employees` exists. No `max_branches`, `max_lite_sessions`, or other attendance-related limits.
- Called in the employees page before sending an invite.

### Audit logging
- `log_audit_event(p_action, p_resource_type, p_resource_id, p_details, p_enterprise_id, p_impersonated_by)` RPC: SECURITY DEFINER, inserts row with `auth.uid()` as actor.
- Called in employees page for `employee.invited` action.
- Audit log viewed in `app/dashboard/enterprise/audit/page.tsx` and `app/dashboard/super-admin/audit/page.tsx`.

### Notifications
- Direct `supabase.from('notifications').insert(...)` — no helper function.
- Read in dashboard layout topbar via `supabase.from('notifications').select(...)`.
- No notification creation for invites, schedule changes, or absence alerts.

### Jobs
- **No job mechanism exists.** No cron, no scheduled functions, no edge functions deployed. Absence computation, invite expiry, and reminders would need to be built.

## 5. Gaps Against the Prompt

| # | Gap | Smallest change |
|---|-----|-----------------|
| 1 | **One account type per user** — `profiles.account_type_id` is a single FK. A user cannot be both `normal_user` and an enterprise member. | Remove the dependency on `account_type_id` for permission resolution. `get_user_permissions()` already merges both sources — the issue is the frontend treats `account_type` as the routing key. Add an `active_workspace_id` concept (stored in a new `user_workspace_state` table or in profiles) and route based on workspace type, not account_type. |
| 2 | **No workspace switcher** — frontend uses `enterprises[0]` only. | Add `activeEnterpriseId` state to `AuthProvider`, persist to localStorage, pass to all queries. Add switcher dropdown in topbar. |
| 3 | **`can()` has no resource parameter** — cannot do branch-scoped checks. | Extend `usePermissions` to accept an optional resource context. Add a `get_user_permissions_for_enterprise(p_enterprise_id)` RPC that returns permissions scoped to the active workspace. Branch scoping handled via a separate `get_managed_branch_ids()` check. |
| 4 | **No attendance tables** — branches, schedules, attendance_records, lite_sessions, etc. | New migration creating all attendance tables with RLS. |
| 5 | **No attendance permissions** — `branches.view`, `attendance.submit`, etc. | Insert new permission rows and add to system role mappings in a new migration. |
| 6 | **No schedule resolution function** | Pure TypeScript function in `lib/attendance/schedule-resolver.ts` + a SQL mirror for server-side validation. |
| 7 | **No geofence verification** | Server-side RPC `verify_geofence(p_branch_id, p_lat, p_lng, p_accuracy)` using Haversine formula. |
| 8 | **No Lite sessions** | New `lite_sessions` and `lite_session_participants` tables + pages under `/dashboard/user/lite/`. |
| 9 | **`handle_new_user` always assigns `normal_user`** | Keep as-is — enterprise owners get `normal_user` type + an enterprise membership with Owner role. The account_type becomes "what kind of standalone user are you" while memberships define enterprise access. This aligns with the multi-workspace model. |
| 10 | **Plan limits only have `max_employees`** | ALTER TABLE plans to add `max_branches`, `max_lite_sessions`, `max_report_exports` columns. Update `check_seat_limit` and add `check_branch_limit`, `check_lite_session_limit` RPCs. |
| 11 | **No job mechanism** | Add a Supabase Edge Function (`supabase/functions/cron-jobs/`) triggered by Supabase's cron extension or an external scheduler for absence computation and invite expiry. |
| 12 | **Module registry not wired to layout** | Update `dashboard-layout.tsx` to read `getModulesForContext()` and render those entries instead of the static placeholder. |
| 13 | **No tests** | Add `lib/attendance/__tests__/schedule-resolver.test.ts` and other test files. Use a simple test runner or manual assertions. |
| 14 | **Invite accept flow doesn't verify email** | The accept flow calls `signUp` but creates membership before email verification. Fix: only create membership after email confirmation, or use a database trigger on `profiles` INSERT that checks for pending invites by email. |
| 15 | **`invites_select_by_token` RLS policy is overly broad** — `USING (token IS NOT NULL)` lets anyone read any invite. | Tighten to require matching token in a WHERE clause, or use a SECURITY DEFINER function `get_invite_by_token(p_token)` instead. |
| 16 | **No bulk invite** | Extend the employees page with a bulk dialog (CSV upload / paste emails) that validates and inserts multiple invites. |
| 17 | **No `get_user_permissions` workspace scoping** — returns permissions from ALL memberships combined. | Add `get_user_permissions_for_enterprise(p_enterprise_id)` that only returns permissions from that specific membership + account-type default. Use this in the frontend when a workspace is active. |
| 18 | **Post-login router doesn't handle multiple workspaces** | Add workspace picker page when `enterprises.length > 0` (or when user has both personal + enterprise). |

## Architecture Decisions for the Attendance Build

### Multi-workspace approach
- Keep `profiles.account_type_id` as-is (always `normal_user` for new signups; `super_admin` for platform admins).
- The "Personal workspace" is the user's own account context (`account_type = normal_user`). Enterprise workspaces come from memberships.
- Add `active_workspace` to the auth context: `{ type: 'personal' }` or `{ type: 'enterprise', id: enterpriseId }`.
- Store active workspace in localStorage for persistence across reloads.
- `get_user_permissions()` will be replaced by `get_user_permissions_for_enterprise(p_enterprise_id)` when in an enterprise workspace, and by account-type permissions when in personal workspace.
- The dashboard layout reads the active workspace to determine which nav items to show (enterprise nav vs personal nav).

### Branch-scoped access
- Branch managers get `attendance.view_branch` permission. A new RPC `get_managed_branch_ids(p_user_id, p_enterprise_id)` returns the branch IDs they can see.
- All branch-scoped queries filter by these IDs. RLS policies on `attendance_records` and `branches` check branch assignment.

### Schedule resolution
- Pure function `resolveSchedule(date, staffId, branchId, enterpriseId)` in TypeScript.
- Resolution order: holiday > staff override > branch calendar > tenant calendar.
- Same logic mirrored in SQL for server-side validation in the check-in RPC.
