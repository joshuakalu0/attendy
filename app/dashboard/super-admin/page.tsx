'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, CreditCard, Briefcase, TrendingUp, CalendarCheck, UserCheck, Activity } from 'lucide-react';

interface PlatformStats {
  enterprises: number;
  activeEnterprises: number;
  users: number;
  activeUsers: number;
  plans: number;
  subscriptions: number;
  activeSubscriptions: number;
  meetings: number;
  attendanceRecords: number;
  newUsersThisMonth: number;
}

interface RecentEnterprise {
  id: string;
  name: string;
  subscription_status: string;
  is_active: boolean;
  created_at: string;
}

interface RecentUser {
  id: string;
  email: string;
  full_name: string | null;
  account_type_label: string;
  created_at: string;
}

export default function SuperAdminOverviewPage() {
  const [stats, setStats] = useState<PlatformStats>({
    enterprises: 0, activeEnterprises: 0, users: 0, activeUsers: 0,
    plans: 0, subscriptions: 0, activeSubscriptions: 0,
    meetings: 0, attendanceRecords: 0, newUsersThisMonth: 0,
  });
  const [recentEnts, setRecentEnts] = useState<RecentEnterprise[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [entRes, entActiveRes, userRes, userActiveRes, planRes, subRes, subActiveRes,
        meetingRes, attendRes, newUserRes, recentEntRes, recentUserRes] = await Promise.all([
        supabase.from('enterprises').select('id', { count: 'exact', head: true }),
        supabase.from('enterprises').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('plans').select('id', { count: 'exact', head: true }),
        supabase.from('subscriptions').select('id', { count: 'exact', head: true }),
        supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('meetings').select('id', { count: 'exact', head: true }),
        supabase.from('attendance_records').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
        supabase.from('enterprises').select('id, name, subscription_status, is_active, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('profiles').select('id, email, full_name, created_at, account_types!inner(label)').order('created_at', { ascending: false }).limit(5),
      ]);

      setStats({
        enterprises: entRes.count || 0,
        activeEnterprises: entActiveRes.count || 0,
        users: userRes.count || 0,
        activeUsers: userActiveRes.count || 0,
        plans: planRes.count || 0,
        subscriptions: subRes.count || 0,
        activeSubscriptions: subActiveRes.count || 0,
        meetings: meetingRes.count || 0,
        attendanceRecords: attendRes.count || 0,
        newUsersThisMonth: newUserRes.count || 0,
      });

      if (recentEntRes.data) setRecentEnts(recentEntRes.data as RecentEnterprise[]);
      if (recentUserRes.data) {
        setRecentUsers((recentUserRes.data as Array<Record<string, unknown>>).map((u) => ({
          id: u.id as string,
          email: u.email as string,
          full_name: u.full_name as string | null,
          account_type_label: (u.account_types as { label: string }).label,
          created_at: u.created_at as string,
        })));
      }
      setLoading(false);
    })();
  }, []);

  const primaryCards = [
    { label: 'Enterprises', value: stats.enterprises, sub: `${stats.activeEnterprises} active`, icon: Building2, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Users', value: stats.users, sub: `${stats.activeUsers} active`, icon: Users, color: 'text-green-600 bg-green-50' },
    { label: 'Subscriptions', value: stats.subscriptions, sub: `${stats.activeSubscriptions} active`, icon: Briefcase, color: 'text-purple-600 bg-purple-50' },
    { label: 'Meetings Created', value: stats.meetings, sub: 'all-time', icon: CalendarCheck, color: 'text-teal-600 bg-teal-50' },
  ];

  const secondaryCards = [
    { label: 'Attendance Records', value: stats.attendanceRecords, icon: Activity, color: 'text-orange-600 bg-orange-50' },
    { label: 'New Users This Month', value: stats.newUsersThisMonth, icon: TrendingUp, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Active Plans', value: stats.plans, icon: CreditCard, color: 'text-amber-600 bg-amber-50' },
    { label: 'Active Subscriptions', value: stats.activeSubscriptions, icon: UserCheck, color: 'text-emerald-600 bg-emerald-50' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Overview</h1>
        <p className="mt-1 text-sm text-slate-500">Real-time system-wide statistics and monitoring</p>
      </div>

      {/* Primary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {primaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${card.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-3xl font-bold">{card.value}</span>
                </div>
                <p className="mt-3 text-sm font-medium text-slate-700">{card.label}</p>
                <p className="text-xs text-slate-400">{card.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Secondary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {secondaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="border-slate-200">
              <CardContent className="flex items-center gap-3 p-4">
                <div className={`flex h-9 w-9 items-center justify-center rounded-md ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-bold">{card.value}</p>
                  <p className="text-xs text-slate-500">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Enterprises</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentEnts.length === 0 ? (
              <p className="text-sm text-slate-500">No enterprises yet.</p>
            ) : (
              recentEnts.map((ent) => (
                <div key={ent.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium">{ent.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{ent.subscription_status}</Badge>
                    <Badge variant={ent.is_active ? 'default' : 'destructive'} className="text-xs">
                      {ent.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentUsers.length === 0 ? (
              <p className="text-sm text-slate-500">No users yet.</p>
            ) : (
              recentUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{u.full_name || 'Unnamed'}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">{u.account_type_label}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
