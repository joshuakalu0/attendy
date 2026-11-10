import type { ModuleRegistryEntry } from '@/lib/types';

export const moduleRegistry: ModuleRegistryEntry[] = [
  // Enterprise attendance modules
  {
    key: 'branches',
    label: 'Branches',
    href: '/dashboard/enterprise/branches',
    icon: 'MapPin',
    requiredPermission: 'branches.view',
    requiresActiveSubscription: true,
  },
  {
    key: 'calendar',
    label: 'Calendar & Schedules',
    href: '/dashboard/enterprise/calendar',
    icon: 'CalendarDays',
    requiredPermission: 'schedules.view',
    requiresActiveSubscription: true,
  },
  {
    key: 'attendance-live',
    label: 'Live Attendance',
    href: '/dashboard/enterprise/attendance/live',
    icon: 'Radio',
    requiredPermission: 'attendance.view_branch',
    requiresActiveSubscription: true,
  },
  {
    key: 'attendance-reports',
    label: 'Reports',
    href: '/dashboard/enterprise/attendance/reports',
    icon: 'BarChart3',
    requiredPermission: 'reports.view',
    requiresActiveSubscription: true,
  },
  {
    key: 'staff-checkin',
    label: 'Check In',
    href: '/dashboard/enterprise/attendance/check-in',
    icon: 'Clock',
    requiredPermission: 'attendance.submit',
    requiresActiveSubscription: false,
  },
  {
    key: 'my-attendance',
    label: 'My Attendance',
    href: '/dashboard/enterprise/attendance/my',
    icon: 'ClipboardCheck',
    requiredPermission: 'attendance.view_own',
    requiresActiveSubscription: false,
  },
  // Personal/Lite modules
  {
    key: 'lite-sessions',
    label: 'Lite Sessions',
    href: '/dashboard/user/lite',
    icon: 'Zap',
    requiredPermission: 'lite.sessions.manage',
    requiresActiveSubscription: false,
  },
];

export function getModulesForContext(context: string): ModuleRegistryEntry[] {
  return moduleRegistry.filter((m) =>
    m.href.includes(`/dashboard/${context}/`)
  );
}

export function getModulesForWorkspace(
  workspaceType: 'personal' | 'enterprise',
  isStaff: boolean = false,
): ModuleRegistryEntry[] {
  if (workspaceType === 'personal') {
    return moduleRegistry.filter((m) => m.href.startsWith('/dashboard/user/'));
  }
  // Enterprise: return all enterprise-scoped modules
  return moduleRegistry.filter((m) => m.href.startsWith('/dashboard/enterprise/'));
}
