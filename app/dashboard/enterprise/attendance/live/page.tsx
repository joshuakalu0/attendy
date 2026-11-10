'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Radio, Users, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
}

interface LiveRecord {
  id: string;
  user_id: string;
  check_in_time: string;
  check_out_time: string | null;
  status: string;
  late_minutes: number;
  profiles: { email: string; full_name: string | null } | null;
  branches: { name: string } | null;
}

export default function LiveAttendancePage() {
  const { activeWorkspace } = useAuth();
  const { can } = usePermissions();
  const enterpriseId = activeWorkspace?.enterprise_id;
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [records, setRecords] = useState<LiveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ checkedIn: 0, onTime: 0, late: 0, checkedOut: 0 });

  const load = useCallback(async () => {
    if (!enterpriseId) return;
    setLoading(true);

    const today = new Date().toISOString().split('T')[0];
    let query = supabase
      .from('attendance_records')
      .select(`
        id, user_id, check_in_time, check_out_time, status, late_minutes,
        profiles!inner(email, full_name),
        branches!inner(name)
      `)
      .eq('enterprise_id', enterpriseId)
      .eq('check_in_date', today)
      .order('check_in_time', { ascending: false });

    if (selectedBranch !== 'all') {
      query = query.eq('branch_id', selectedBranch);
    }

    const { data } = await query;

    if (data) {
      const mapped = data.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        check_in_time: r.check_in_time,
        check_out_time: r.check_out_time,
        status: r.status,
        late_minutes: r.late_minutes,
        profiles: r.profiles as unknown as { email: string; full_name: string | null } | null,
        branches: r.branches as unknown as { name: string } | null,
      }));
      setRecords(mapped);
      setStats({
        checkedIn: mapped.length,
        onTime: mapped.filter((r) => r.status === 'present').length,
        late: mapped.filter((r) => r.status === 'late').length,
        checkedOut: mapped.filter((r) => r.check_out_time !== null).length,
      });
    } else {
      setRecords([]);
      setStats({ checkedIn: 0, onTime: 0, late: 0, checkedOut: 0 });
    }
    setLoading(false);
  }, [enterpriseId, selectedBranch]);

  useEffect(() => {
    if (!enterpriseId) return;
    (async () => {
      const { data } = await supabase
        .from('branches')
        .select('id, name')
        .eq('enterprise_id', enterpriseId)
        .eq('is_active', true)
        .order('name');
      if (data) setBranches(data as Branch[]);
    })();
  }, [enterpriseId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  if (!can('attendance.view_branch')) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-500">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    if (status === 'late') return <Badge variant="destructive">Late</Badge>;
    if (status === 'early_leave') return <Badge variant="secondary">Early Leave</Badge>;
    if (status === 'present') return <Badge variant="default">Present</Badge>;
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Live Attendance</h1>
          <p className="mt-1 text-sm text-slate-500">Real-time attendance for today (auto-refreshes every 30s)</p>
        </div>
        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Checked In</p>
              <p className="text-2xl font-bold">{stats.checkedIn}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">On Time</p>
              <p className="text-2xl font-bold">{stats.onTime}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Late</p>
              <p className="text-2xl font-bold">{stats.late}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
              <XCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Checked Out</p>
              <p className="text-2xl font-bold">{stats.checkedOut}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Radio className="h-5 w-5 text-green-500" />
            Today's Check-ins
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No one has checked in yet today.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{r.profiles?.full_name || 'Unnamed'}</p>
                        <p className="text-xs text-slate-500">{r.profiles?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{r.branches?.name || '—'}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(r.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.check_out_time
                        ? new Date(r.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : <span className="text-slate-400">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {statusBadge(r.status)}
                        {r.late_minutes > 0 && (
                          <span className="text-xs text-red-500">{r.late_minutes}m</span>
                        )}
                      </div>
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
