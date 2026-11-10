'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Clock, ClipboardCheck } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  check_in_time: string;
  check_out_time: string | null;
  status: string;
  late_minutes: number;
  early_leave_minutes: number;
  is_expected_day: boolean;
  schedule_source: string;
  branches: { name: string } | null;
}

export default function MyAttendancePage() {
  const { activeWorkspace } = useAuth();
  const enterpriseId = activeWorkspace?.enterprise_id;
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [monthRecords, setMonthRecords] = useState<Record<string, AttendanceRecord>>({});

  const load = useCallback(async () => {
    if (!enterpriseId) return;
    setLoading(true);
    const { data: user } = await supabase.auth.getUser();
    if (!user.user?.id) { setLoading(false); return; }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1, 0);

    const { data } = await supabase
      .from('attendance_records')
      .select(`
        id, check_in_time, check_out_time, status, late_minutes, early_leave_minutes,
        is_expected_day, schedule_source, check_in_date,
        branches!inner(name)
      `)
      .eq('enterprise_id', enterpriseId)
      .eq('user_id', user.user.id)
      .gte('check_in_date', startOfMonth.toISOString().split('T')[0])
      .lte('check_in_date', endOfMonth.toISOString().split('T')[0])
      .order('check_in_time', { ascending: false });

    if (data) {
      const mapped = data.map((r) => ({
        id: r.id,
        check_in_time: r.check_in_time,
        check_out_time: r.check_out_time,
        status: r.status,
        late_minutes: r.late_minutes,
        early_leave_minutes: r.early_leave_minutes,
        is_expected_day: r.is_expected_day,
        schedule_source: r.schedule_source,
        branches: r.branches as unknown as { name: string } | null,
      }));
      setRecords(mapped);
      const byDate: Record<string, AttendanceRecord> = {};
      mapped.forEach((r) => {
        const dateStr = new Date(r.check_in_time).toISOString().split('T')[0];
        if (!byDate[dateStr]) byDate[dateStr] = r;
      });
      setMonthRecords(byDate);
    }
    setLoading(false);
  }, [enterpriseId]);

  useEffect(() => {
    load();
  }, [load]);

  const statusBadge = (status: string) => {
    const variant = status === 'late' ? 'destructive' : status === 'early_leave' ? 'secondary' : 'default';
    return <Badge variant={variant as 'default' | 'destructive' | 'secondary'}>{status.replace(/_/g, ' ')}</Badge>;
  };

  const selectedDateStr = selectedDate?.toISOString().split('T')[0];
  const selectedRecord = selectedDateStr ? monthRecords[selectedDateStr] : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Attendance</h1>
        <p className="mt-1 text-sm text-slate-500">View your attendance history and status</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              modifiers={{
                present: (date) => {
                  const ds = date.toISOString().split('T')[0];
                  return !!monthRecords[ds] && monthRecords[ds].status === 'present';
                },
                late: (date) => {
                  const ds = date.toISOString().split('T')[0];
                  return !!monthRecords[ds] && monthRecords[ds].status === 'late';
                },
              }}
              modifiersStyles={{
                present: { backgroundColor: 'rgb(220 252 231)', color: 'rgb(22 163 74)' },
                late: { backgroundColor: 'rgb(254 226 226)', color: 'rgb(220 38 38)' },
              }}
            />
          </CardContent>
        </Card>

        {/* Selected Day Detail */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Select a date'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedRecord ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs font-medium">Check In</span>
                    </div>
                    <p className="mt-2 text-lg font-bold">
                      {new Date(selectedRecord.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Clock className="h-4 w-4" />
                      <span className="text-xs font-medium">Check Out</span>
                    </div>
                    <p className="mt-2 text-lg font-bold">
                      {selectedRecord.check_out_time
                        ? new Date(selectedRecord.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  {statusBadge(selectedRecord.status)}
                  <Badge variant="outline">{selectedRecord.branches?.name || 'Unknown branch'}</Badge>
                  {selectedRecord.late_minutes > 0 && (
                    <Badge variant="destructive">{selectedRecord.late_minutes} min late</Badge>
                  )}
                  {selectedRecord.early_leave_minutes > 0 && (
                    <Badge variant="secondary">{selectedRecord.early_leave_minutes} min early</Badge>
                  )}
                  {!selectedRecord.is_expected_day && (
                    <Badge variant="outline">Not a scheduled day</Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <ClipboardCheck className="h-10 w-10 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No attendance record for this day.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Records Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Records</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : records.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No attendance records yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.slice(0, 15).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">
                      {new Date(r.check_in_time).toLocaleDateString()}
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
                    <TableCell>{statusBadge(r.status)}</TableCell>
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
