'use client';

import { useAuth } from '@/lib/auth-context';

export function usePermissions() {
  const { permissions } = useAuth();

  return {
    permissions,
    can: (permission: string) => permissions.includes(permission),
    canAny: (perms: string[]) => perms.some((p) => permissions.includes(p)),
    canAll: (perms: string[]) => perms.every((p) => permissions.includes(p)),
  };
}
