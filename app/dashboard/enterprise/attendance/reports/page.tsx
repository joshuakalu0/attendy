'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { BarChart3, Download, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

interface ReportRecord {
  id: string;
  user_id: string;
  check_in_date: string;
  check_in_time: string;
  check_out_time: string | null;
  status: string;
  late_minutes: number;
  early_leave_minutes: number;
  is_expected_day: boolean;
  profiles: { email: string; full_name: string | null } | null;
  branches: { name: string } | null;
}

interface Branch {
  id: string;
  name: string;
}

export default function ReportsPage() {
  const { activeWorkspace } = useAuth();
  const { can } = usePermissions();
  const enterpriseId = activeWorkspace?.enterprise_id;
  const [branches, setBranches] = useState<Branch[]>([]);
  const [records, setRecords] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = useCallback(async () => {
    if (!enterpriseId) return;
    setLoading(true);
    let query = supabase
      .from('attendance_records')
      .select(`
        id, user_id, check_in_date, check_in_time, check_out_time, status,
        late_minutes, early_leave_minutes, is_expected_day,
        profiles!inner(email, full_name),
        branches!inner(name)
      `)
      .eq('enterprise_id', enterpriseId)
      .gte('check_in_date', dateFrom)
      .lte('check_in_date', dateTo)
      .order('check_in_date', { ascending: false })
      .order('check_in_time', { ascending: false });

    if (branchFilter !== 'all') {
      query = query.eq('branch_id', branchFilter);
    }
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data } = await query;
    if (data) {
      setRecords(data.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        check_in_date: r.check_in_date,
        check_in_time: r.check_in_time,
        check_out_time: r.check_out_time,
        status: r.status,
        late_minutes: r.late_minutes,
        early_leave_minutes: r.early_leave_minutes,
        is_expected_day: r.is_expected_day,
        profiles: r.profiles as unknown as { email: string; full_name: string | null } | null,
        branches: r.branches as unknown as { name: string } | null,
      })));
    } else {
      setRecords([]);
    }
    setLoading(false);
  }, [enterpriseId, dateFrom, dateTo, branchFilter, statusFilter]);

  useEffect(() => {
    if (!enterpriseId) return;
    (async () => {
      const { data } = await supabase
        .from('branches')
        .select('id, name')
        .eq('enterprise_id', enterpriseId)
        .order('name');
      if (data) setBranches(data as Branch[]);
    })();
  }, [enterpriseId]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCSV = () => {
    const headers = ['Date', 'Employee', 'Email', 'Branch', 'Check In', 'Check Out', 'Status', 'Late (min)', 'Early Leave (min)'];
    const rows = records.map((r) => [
      r.check_in_date,
      r.profiles?.full_name || '',
      r.profiles?.email || '',
      r.branches?.name || '',
      new Date(r.check_in_time).toLocaleTimeString(),
      r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString() : '',
      r.status,
      r.late_minutes.toString(),
      r.early_leave_minutes.toString(),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-report-${dateFrom}-to-${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported.');
  };

  if (!can('reports.view')) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-500">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  const statusVariant = (status: string): 'default' | 'destructive' | 'secondary' | 'outline' => {
    if (status === 'late') return 'destructive';
    if (status === 'early_leave') return 'secondary';
    if (status === 'present') return 'default';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">View and export attendance records</p>
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={records.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label className="text-xs">From Date</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">To Date</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Branch</Label>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="early_leave">Early Leave</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total Records</p>
            <p className="text-2xl font-bold">{records.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Present</p>
            <p className="text-2xl font-bold text-green-600">{records.filter((r) => r.status === 'present').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Late</p>
            <p className="text-2xl font-bold text-amber-600">{records.filter((r) => r.status === 'late').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Early Leave</p>
            <p className="text-2xl font-bold text-slate-600">{records.filter((r) => r.status === 'early_leave').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-slate-400" />
            Attendance Records ({records.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FileSpreadsheet className="h-12 w-12 text-slate-300" />
              <p className="mt-2 text-sm text-slate-500">No records found for the selected filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Late</TableHead>
                  <TableHead>Early</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.slice(0, 100).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.check_in_date}</TableCell>
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
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(r.status)}>{r.status.replace(/_/g, ' ')}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.late_minutes > 0 ? `${r.late_minutes}m` : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.early_leave_minutes > 0 ? `${r.early_leave_minutes}m` : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {records.length > 100 && (
        <p className="text-center text-xs text-slate-400">
          Showing first 100 records. Export CSV to see all {records.length} records.
        </p>
      )}
    </div>
  );
}
