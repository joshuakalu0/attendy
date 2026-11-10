'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { Building2, CalendarCheck, CreditCard, UserCircle, Users } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function UserOverviewPage() {
  const { profile, workspaces } = useAuth();

  const enterpriseWorkspaces = workspaces.filter((w) => w.type === 'enterprise');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Personal Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back, {profile?.full_name || profile?.email}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <UserCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Account</p>
              <p className="text-xl font-bold capitalize">{profile?.account_type_label || 'User'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50 text-green-600">
              <CreditCard className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Status</p>
              <p className="text-xl font-bold capitalize">{profile?.status || 'Active'}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Workspaces</p>
              <p className="text-xl font-bold">{workspaces.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meetings Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-amber-500" />
            Attendance Meetings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500 mb-3">
            Create single attendance sheets for classes, meetings, or events. Share a link or code for participants to check in — no account needed for them.
          </p>
          <Link
            href="/dashboard/user/lite"
            className="text-sm font-medium text-primary hover:underline"
          >
            Manage Meetings →
          </Link>
        </CardContent>
      </Card>

      {/* Workspaces Panel */}
      {enterpriseWorkspaces.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-500" />
              Your Workspaces
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {enterpriseWorkspaces.map((ws) => (
                <div
                  key={ws.enterprise_id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-slate-400" />
                    <div>
                      <p className="text-sm font-medium">{ws.label}</p>
                      <p className="text-xs text-slate-500">{ws.role_name}</p>
                    </div>
                  </div>
                  {ws.is_owner && <Badge variant="secondary">Owner</Badge>}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Use the workspace switcher in the top bar to switch context.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
