'use client';

import { ReactNode } from 'react';
import { usePermissions } from '@/lib/hooks/use-permissions';

interface CanProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function Can({ permission, children, fallback = null }: CanProps) {
  const { can } = usePermissions();
  if (can(permission)) return <>{children}</>;
  return <>{fallback}</>;
}
