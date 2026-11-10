'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
  Users, CreditCard, MapPin, Activity, CalendarDays, Radio,
  BarChart3, Clock, ClipboardCheck, ArrowRight,
} from 'lucide-react';

export default function EnterpriseOverviewPage() {
  const { activeWorkspace } = useAuth();
  const { can } = usePermissions();
  const enterpriseId = activeWorkspace?.enterprise_id;
  const [stats, setStats] = useState({
    employeeCount: 0,
    inviteCount: 0,
    branchCount: 0,
    planName: 'None',
    subscriptionStatus: 'none',
    checkedInToday: 0,
    lateToday: 0,
  });

  useEffect(() => {
    if (!enterpriseId) return;
    (async () => {
      const today = new Date().toISOString().split('T')[0];
      const [membersRes, invitesRes, branchesRes, attendanceRes] = await Promise.all([
        supabase.from('memberships').select('id', { count: 'exact' }).eq('enterprise_id', enterpriseId).eq('status', 'active'),
        supabase.from('invites').select('id', { count: 'exact' }).eq('enterprise_id', enterpriseId).eq('status', 'pending'),
        supabase.from('branches').select('id', { count: 'exact' }).eq('enterprise_id', enterpriseId).eq('is_active', true),
        supabase.from('attendance_records').select('id, status', { count: 'exact' }).eq('enterprise_id', enterpriseId).eq('check_in_date', today),
      ]);
      const { data: ent } = await supabase
        .from('enterprises')
        .select('subscription_status, plan_id, plans(name)')
        .eq('id', enterpriseId)
        .maybeSingle();

      setStats({
        employeeCount: membersRes.count || 0,
        inviteCount: invitesRes.count || 0,
        branchCount: branchesRes.count || 0,
        planName: (ent?.plans as unknown as { name: string } | null)?.name || 'None',
        subscriptionStatus: ent?.subscription_status || 'none',
        checkedInToday: attendanceRes.data?.length || 0,
        lateToday: attendanceRes.data?.filter((r: { status: string }) => r.status === 'late').length || 0,
      });
    })();
  }, [enterpriseId]);

  const statCards = [
    { label: 'Active Employees', value: stats.employeeCount, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Checked In Today', value: stats.checkedInToday, icon: Activity, color: 'text-green-600 bg-green-50' },
    { label: 'Pending Invites', value: stats.inviteCount, icon: Activity, color: 'text-orange-600 bg-orange-50' },
    { label: 'Branches', value: stats.branchCount, icon: MapPin, color: 'text-teal-600 bg-teal-50' },
  ];

  const moduleLinks = [
    { label: 'Branches', href: '/dashboard/enterprise/branches', icon: MapPin, perm: 'branches.view', desc: 'Manage locations and geofences' },
    { label: 'Calendar', href: '/dashboard/enterprise/calendar', icon: CalendarDays, perm: 'schedules.view', desc: 'Set work days and holidays' },
    { label: 'Live Attendance', href: '/dashboard/enterprise/attendance/live', icon: Radio, perm: 'attendance.view_branch', desc: 'See who is checked in now' },
    { label: 'Check In', href: '/dashboard/enterprise/attendance/check-in', icon: Clock, perm: 'attendance.submit', desc: 'Record your attendance' },
    { label: 'My Attendance', href: '/dashboard/enterprise/attendance/my', icon: ClipboardCheck, perm: 'attendance.view_own', desc: 'View your attendance history' },
    { label: 'Reports', href: '/dashboard/enterprise/attendance/reports', icon: BarChart3, perm: 'reports.view', desc: 'Export attendance data' },
    { label: 'Employees', href: '/dashboard/enterprise/employees', icon: Users, perm: 'members.view', desc: 'Invite and manage staff' },
  ];

  const visibleModules = moduleLinks.filter((m) => can(m.perm));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{activeWorkspace?.label || 'Overview'}</h1>
        <div className="mt-1 flex items-center gap-3">
          <span className="text-sm text-slate-500">Enterprise Dashboard</span>
          <Badge variant={stats.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
            {stats.subscriptionStatus}
          </Badge>
          <Badge variant="outline">{stats.planName}</Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent className="flex items-center gap-4 p-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <p className="text-xl font-bold">{card.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {stats.lateToday > 0 && (
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <p className="text-sm text-slate-600">
              <span className="font-semibold">{stats.lateToday}</span> {stats.lateToday === 1 ? 'person was' : 'people were'} late today.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Module Quick Links */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Quick Access</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {visibleModules.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link key={mod.href} href={mod.href}>
                <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-600 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="mt-3 text-sm font-medium">{mod.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{mod.desc}</p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
