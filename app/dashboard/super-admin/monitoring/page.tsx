'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  CalendarCheck, Users, Activity, CreditCard, Search, MapPin, TrendingUp,
} from 'lucide-react';

interface MeetingRow {
  id: string;
  title: string;
  user_id: string;
  is_active: boolean;
  is_pro: boolean;
  meeting_date: string;
  created_at: string;
  attendee_count: number;
  creator_email: string;
}

interface GatewayRow {
  id: string;
  gateway_key: string;
  display_name: string;
  is_enabled: boolean;
  enterprise_id: string;
  enterprise_name: string;
  has_keys: boolean;
}

interface MonitorStats {
  totalMeetings: number;
  activeMeetings: number;
  proMeetings: number;
  totalAttendees: number;
  totalAttendanceRecords: number;
  totalGateways: number;
  enabledGateways: number;
}

export default function SuperAdminMonitoringPage() {
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [gateways, setGateways] = useState<GatewayRow[]>([]);
  const [stats, setStats] = useState<MonitorStats>({
    totalMeetings: 0, activeMeetings: 0, proMeetings: 0,
    totalAttendees: 0, totalAttendanceRecords: 0,
    totalGateways: 0, enabledGateways: 0,
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const [meetingRes, attendRes, attendCountRes, gatewayRes, entRes] = await Promise.all([
      supabase.from('meetings').select('id, title, user_id, is_active, is_pro, meeting_date, created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('attendance_records').select('id', { count: 'exact', head: true }),
      supabase.from('meeting_attendees').select('meeting_id'),
      supabase.from('payment_gateways').select('id, gateway_key, display_name, is_enabled, api_key, api_secret, enterprise_id'),
      supabase.from('enterprises').select('id, name'),
    ]);

    // Build attendee counts
    const attendeeCounts = new Map<string, number>();
    for (const a of (attendCountRes.data || [])) {
      attendeeCounts.set(a.meeting_id, (attendeeCounts.get(a.meeting_id) || 0) + 1);
    }

    // Build enterprise map
    const entMap = new Map((entRes.data || []).map((e) => [e.id, e.name]));

    // Resolve meeting creator emails
    const userIds = (meetingRes.data || []).map((m) => m.user_id).filter(Boolean);
    let creatorMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles').select('user_id, email').in('user_id', userIds);
      creatorMap = new Map((profileData || []).map((p) => [p.user_id, p.email]));
    }

    if (meetingRes.data) {
      setMeetings(meetingRes.data.map((m) => ({
        id: m.id,
        title: m.title,
        user_id: m.user_id,
        is_active: m.is_active,
        is_pro: m.is_pro,
        meeting_date: m.meeting_date,
        created_at: m.created_at,
        attendee_count: attendeeCounts.get(m.id) || 0,
        creator_email: creatorMap.get(m.user_id) || '—',
      })));
    }

    if (gatewayRes.data) {
      setGateways(gatewayRes.data.map((g) => ({
        id: g.id,
        gateway_key: g.gateway_key,
        display_name: g.display_name,
        is_enabled: g.is_enabled,
        enterprise_id: g.enterprise_id,
        enterprise_name: entMap.get(g.enterprise_id) || 'Unknown',
        has_keys: !!(g.api_key && g.api_secret),
      })));
    }

    setStats({
      totalMeetings: meetingRes.data?.length || 0,
      activeMeetings: (meetingRes.data || []).filter((m) => m.is_active).length,
      proMeetings: (meetingRes.data || []).filter((m) => m.is_pro).length,
      totalAttendees: (attendCountRes.data || []).length,
      totalAttendanceRecords: attendRes.count || 0,
      totalGateways: gatewayRes.data?.length || 0,
      enabledGateways: (gatewayRes.data || []).filter((g) => g.is_enabled).length,
    });

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredMeetings = meetings.filter(
    (m) => !search ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.creator_email.toLowerCase().includes(search.toLowerCase())
  );

  const statCards = [
    { label: 'Meetings (50 max)', value: stats.totalMeetings, sub: `${stats.activeMeetings} active`, icon: CalendarCheck, color: 'text-teal-600 bg-teal-50' },
    { label: 'Meeting Attendees', value: stats.totalAttendees, sub: 'all-time', icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Enterprise Attendance', value: stats.totalAttendanceRecords, sub: 'records', icon: Activity, color: 'text-orange-600 bg-orange-50' },
    { label: 'Payment Gateways', value: stats.totalGateways, sub: `${stats.enabledGateways} enabled`, icon: CreditCard, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Monitoring</h1>
        <p className="mt-1 text-sm text-slate-500">Monitor meetings, attendance activity, and payment gateways across the platform</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
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

      {/* Recent meetings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Meetings</CardTitle>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Search meetings..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No meetings found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Meeting</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Attendees</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMeetings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.title}</TableCell>
                    <TableCell className="text-sm text-slate-600">{m.creator_email}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {m.attendee_count}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.is_pro ? 'default' : 'secondary'} className="text-xs">
                        {m.is_pro ? 'Pro' : 'Free'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={m.is_active ? 'default' : 'outline'} className="text-xs">
                        {m.is_active ? 'Active' : 'Closed'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(m.meeting_date).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment gateways */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Gateway Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          {gateways.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No payment gateways configured by any enterprise.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Enterprise</TableHead>
                  <TableHead>Gateway</TableHead>
                  <TableHead>Keys</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gateways.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {g.enterprise_name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{g.display_name}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={g.has_keys ? 'default' : 'destructive'} className="text-xs">
                        {g.has_keys ? 'Configured' : 'Missing'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={g.is_enabled ? 'default' : 'secondary'} className="text-xs">
                        {g.is_enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
