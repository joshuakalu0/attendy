'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { DashboardLayout } from '@/components/dashboard/dashboard-layout';

export default function UserDashboardLayout({ children }: { children: ReactNode }) {
  const { user, activeWorkspace, profile, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  // Personal workspace or super admin in personal context
  if (activeWorkspace?.type === 'enterprise') {
    router.push('/unauthorized');
    return null;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
