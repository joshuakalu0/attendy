'use client';

import { ReactNode, useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { getModulesForWorkspace } from '@/lib/module-registry';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  CreditCard,
  Settings,
  Building2,
  Bell,
  LogOut,
  User as UserIcon,
  Menu,
  Layers,
  ChevronDown,
  CircleUser,
  FileText,
  Crown,
  Briefcase,
  ScrollText,
  MapPin,
  CalendarDays,
  Wallet,
  Radio,
  BarChart3,
  Clock,
  ClipboardCheck,
  Zap,
  CalendarCheck,
  UserCircle,
  Activity,
} from 'lucide-react';
import type { NavItem, Workspace } from '@/lib/types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Users, ShieldCheck, CreditCard, Settings, Building2,
  Bell, FileText, Crown, Briefcase, ScrollText, CircleUser,
  MapPin, CalendarDays, Radio, BarChart3, Clock, ClipboardCheck, Zap,
  CalendarCheck, UserCircle, Wallet, Activity,
};

function getEnterpriseNavItems(hasAttendancePerms: boolean): NavItem[] {
  const items: NavItem[] = [
    { label: 'Overview', href: '/dashboard/enterprise', icon: 'LayoutDashboard' },
    { label: 'Employees', href: '/dashboard/enterprise/employees', icon: 'Users', permission: 'members.view' },
    { label: 'Roles & Permissions', href: '/dashboard/enterprise/roles', icon: 'ShieldCheck', permission: 'roles.manage' },
    { label: 'Departments', href: '/dashboard/enterprise/departments', icon: 'Building2', permission: 'settings.edit' },
  ];

  if (hasAttendancePerms) {
    items.push(
      { label: 'Branches', href: '/dashboard/enterprise/branches', icon: 'MapPin', permission: 'branches.view' },
      { label: 'Calendar & Schedules', href: '/dashboard/enterprise/calendar', icon: 'CalendarDays', permission: 'schedules.view' },
      { label: 'Live Attendance', href: '/dashboard/enterprise/attendance/live', icon: 'Radio', permission: 'attendance.view_branch' },
      { label: 'Reports', href: '/dashboard/enterprise/attendance/reports', icon: 'BarChart3', permission: 'reports.view' },
      { label: 'Check In', href: '/dashboard/enterprise/attendance/check-in', icon: 'Clock', permission: 'attendance.submit' },
      { label: 'My Attendance', href: '/dashboard/enterprise/attendance/my', icon: 'ClipboardCheck', permission: 'attendance.view_own' },
    );
  }

  items.push(
    { label: 'Payment Gateways', href: '/dashboard/enterprise/payment-gateways', icon: 'Wallet', permission: 'settings.edit' },
    { label: 'Billing', href: '/dashboard/enterprise/billing', icon: 'CreditCard', permission: 'billing.view' },
    { label: 'Audit Log', href: '/dashboard/enterprise/audit', icon: 'ScrollText', permission: 'audit.view' },
    { label: 'Settings', href: '/dashboard/enterprise/settings', icon: 'Settings', permission: 'settings.edit' },
  );

  return items;
}

function getPersonalNavItems(): NavItem[] {
  return [
    { label: 'Overview', href: '/dashboard/user', icon: 'LayoutDashboard' },
    { label: 'Meetings', href: '/dashboard/user/lite', icon: 'CalendarCheck', permission: 'lite.sessions.manage' },
    { label: 'Billing', href: '/dashboard/user/billing', icon: 'CreditCard', permission: 'billing.view' },
    { label: 'Settings', href: '/dashboard/user/settings', icon: 'Settings' },
  ];
}

function getSuperAdminNavItems(): NavItem[] {
  return [
    { label: 'Overview', href: '/dashboard/super-admin', icon: 'LayoutDashboard' },
    { label: 'Enterprises', href: '/dashboard/super-admin/enterprises', icon: 'Building2' },
    { label: 'Users', href: '/dashboard/super-admin/users', icon: 'Users' },
    { label: 'Plans', href: '/dashboard/super-admin/plans', icon: 'CreditCard' },
    { label: 'Subscriptions', href: '/dashboard/super-admin/subscriptions', icon: 'Briefcase' },
    { label: 'Monitoring', href: '/dashboard/super-admin/monitoring', icon: 'Activity' },
    { label: 'Audit Log', href: '/dashboard/super-admin/audit', icon: 'ScrollText', permission: 'audit.view' },
    { label: 'Settings', href: '/dashboard/super-admin/settings', icon: 'Settings', permission: 'settings.edit' },
  ];
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, profile, workspaces, activeWorkspace, setActiveWorkspace, loading } = useAuth();
  const { can, permissions } = usePermissions();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Array<{
    id: string; title: string; message: string; read: boolean; created_at: string;
  }>>([]);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('id, title, message, read, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    }
  };

  const markNotificationRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleLogoutAll = async () => {
    if (user) {
      await supabase.from('sessions').update({ is_revoked: true }).eq('user_id', user.id);
    }
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleSwitchWorkspace = (ws: Workspace) => {
    setActiveWorkspace(ws);
    if (ws.type === 'personal') {
      if (profile?.account_type === 'super_admin') {
        router.push('/dashboard/super-admin');
      } else {
        router.push('/dashboard/user');
      }
    } else {
      router.push('/dashboard/enterprise');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !profile) {
    router.push('/login');
    return null;
  }

  const isSuperAdmin = profile.account_type === 'super_admin';
  const isEnterpriseWorkspace = activeWorkspace?.type === 'enterprise';

  // Determine nav items based on workspace context
  let navItems: NavItem[];
  if (isSuperAdmin && !isEnterpriseWorkspace) {
    navItems = getSuperAdminNavItems();
  } else if (isEnterpriseWorkspace) {
    const hasAttendance = permissions.some((p) =>
      p.startsWith('attendance.') || p.startsWith('branches.') || p.startsWith('schedules.') || p.startsWith('reports.')
    );
    navItems = getEnterpriseNavItems(hasAttendance);
  } else {
    navItems = getPersonalNavItems();
  }

  const visibleNavItems = navItems.filter((item) => !item.permission || can(item.permission));

  const displayName = profile.full_name || profile.email;
  const initials = displayName
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Layers className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold">Platform</span>
      </div>

      {activeWorkspace && (
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            {activeWorkspace.type === 'enterprise' ? (
              <Building2 className="h-4 w-4 text-slate-400" />
            ) : (
              <UserCircle className="h-4 w-4 text-slate-400" />
            )}
            <span className="truncate text-sm font-medium">{activeWorkspace.label}</span>
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleNavItems.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="truncate text-xs text-slate-500">
              {activeWorkspace?.type === 'enterprise' ? activeWorkspace.role_name : (profile.account_type_label || profile.account_type)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-white md:block">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Workspace Switcher */}
            {workspaces.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2">
                    {activeWorkspace?.type === 'enterprise' ? (
                      <Building2 className="h-4 w-4 text-slate-400" />
                    ) : (
                      <UserCircle className="h-4 w-4 text-slate-400" />
                    )}
                    <span className="max-w-[120px] truncate text-sm font-medium">
                      {activeWorkspace?.label || 'Select Workspace'}
                    </span>
                    <ChevronDown className="h-3 w-3 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {workspaces.map((ws) => (
                    <DropdownMenuItem
                      key={ws.type === 'enterprise' ? ws.enterprise_id : 'personal'}
                      onClick={() => handleSwitchWorkspace(ws)}
                      className={cn(
                        'flex items-center gap-2',
                        activeWorkspace?.type === ws.type &&
                          (ws.type === 'personal' || activeWorkspace?.enterprise_id === ws.enterprise_id)
                          ? 'bg-primary/10'
                          : ''
                      )}
                    >
                      {ws.type === 'enterprise' ? (
                        <Building2 className="h-4 w-4 text-slate-400" />
                      ) : (
                        <UserCircle className="h-4 w-4 text-slate-400" />
                      )}
                      <span className="flex-1 truncate">{ws.label}</span>
                      {ws.is_owner && <Crown className="h-3 w-3 text-amber-500" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <h2 className="hidden text-sm font-medium text-slate-500 sm:block">
              {pathname.split('/').filter(Boolean).slice(-1)[0]?.replace(/-/g, ' ') || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">No notifications</div>
                ) : (
                  notifications.map((n) => (
                    <DropdownMenuItem
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className="flex flex-col items-start gap-1 p-3"
                    >
                      <div className="flex w-full items-center justify-between">
                        <span className="text-sm font-medium">{n.title}</span>
                        {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                      <span className="text-xs text-slate-500">{n.message}</span>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{displayName}</span>
                    <span className="text-xs font-normal text-slate-500">{profile.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push(isEnterpriseWorkspace ? '/dashboard/enterprise/profile' : '/dashboard/user/profile')}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(isEnterpriseWorkspace ? '/dashboard/enterprise/settings' : '/dashboard/user/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogoutAll} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out All Devices
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
