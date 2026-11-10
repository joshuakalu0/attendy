'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

export default function LoginRouter() {
  const router = useRouter();
  const { user, profile, workspaces, activeWorkspace, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    // Super admin goes to super-admin dashboard
    if (profile?.account_type === 'super_admin' && workspaces.length <= 1) {
      router.replace('/dashboard/super-admin');
      return;
    }

    // If user has workspaces, route to the active one
    if (activeWorkspace) {
      if (activeWorkspace.type === 'enterprise') {
        router.replace('/dashboard/enterprise');
      } else if (profile?.account_type === 'super_admin') {
        router.replace('/dashboard/super-admin');
      } else {
        router.replace('/dashboard/user');
      }
      return;
    }

    // Fallback
    if (profile?.dashboard_route) {
      router.replace(profile.dashboard_route);
    } else {
      router.replace('/dashboard/user');
    }
  }, [user, profile, workspaces, activeWorkspace, loading, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-slate-500">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
