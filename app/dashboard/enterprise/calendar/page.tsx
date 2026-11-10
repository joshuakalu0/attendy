'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  CalendarDays, Plus, ChevronLeft, ChevronRight, Trash2, CalendarHeart,
  Save, UserCog, Building2, Clock, Layers, Users,
} from 'lucide-react';
import {
  resolveSchedule, getMonthDays, WEEKDAY_NAMES, WEEKDAY_FULL,
  type CalendarEntry, type HolidayEntry,
} from '@/lib/attendance/schedule-resolver';

interface TenantCalendar {
  id: string;
  name: string;
  pattern_type: 'recurring' | 'specific';
  weekdays: number[];
  start_date: string | null;
  end_date: string | null;
  specific_dates: string[];
  is_active: boolean;
}

interface Branch {
  id: string;
  name: string;
}

interface BranchOverride {
  id: string;
  branch_id: string;
  pattern_type: 'recurring' | 'specific';
  weekdays: number[];
  start_date: string | null;
  end_date: string | null;
  specific_dates: string[];
  is_active: boolean;
  start_time: string | null;
  end_time: string | null;
}

interface Holiday {
  id: string;
  name: string;
  holiday_date: string;
  is_recurring_yearly: boolean;
  branch_id: string | null;
}

interface Employee {
  user_id: string;
  full_name: string | null;
  email: string;
  role_name: string;
}

interface StaffSchedule {
  id: string;
  user_id: string;
  branch_id: string | null;
  weekdays: number[];
  start_time: string | null;
  end_time: string | null;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
}

interface ShiftTemplate {
  id: string;
  name: string;
  description: string | null;
  weekdays: number[];
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
}

interface ShiftAssignment {
  id: string;
  shift_template_id: string;
  user_id: string | null;
  branch_id: string | null;
  assignment_scope: string;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
}

const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const DEFAULT_WORKDAYS = [1, 2, 3, 4, 5];

export default function CalendarPage() {
  const { activeWorkspace } = useAuth();
  const { can } = usePermissions();
  const enterpriseId = activeWorkspace?.enterprise_id;
  const canManage = can('schedules.manage');

  const [calendar, setCalendar] = useState<TenantCalendar | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchOverrides, setBranchOverrides] = useState<BranchOverride[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  // Calendar view state
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());

  // Edit state
  const [editingWeekdays, setEditingWeekdays] = useState<number[]>(DEFAULT_WORKDAYS);
  const [editingActive, setEditingActive] = useState(true);
  const [savingCalendar, setSavingCalendar] = useState(false);

  // Holiday dialog
  const [holidayOpen, setHolidayOpen] = useState(false);
  const [holidayName, setHolidayName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayRecurring, setHolidayRecurring] = useState(false);

  // Branch override dialog
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideBranchId, setOverrideBranchId] = useState('');
  const [overrideWeekdays, setOverrideWeekdays] = useState<number[]>(DEFAULT_WORKDAYS);
  const [overrideStartTime, setOverrideStartTime] = useState('09:00');
  const [overrideEndTime, setOverrideEndTime] = useState('17:00');

  // Holiday dialog — now supports branch scope
  const [holidayBranchId, setHolidayBranchId] = useState('all');

  // Staff schedule state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [staffSchedules, setStaffSchedules] = useState<StaffSchedule[]>([]);
  const [staffSchedOpen, setStaffSchedOpen] = useState(false);
  const [staffUser, setStaffUser] = useState('');
  const [staffWeekdays, setStaffWeekdays] = useState<number[]>(DEFAULT_WORKDAYS);
  const [staffStartTime, setStaffStartTime] = useState('09:00');
  const [staffEndTime, setStaffEndTime] = useState('17:00');
  const [staffEffectiveFrom, setStaffEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [staffEffectiveTo, setStaffEffectiveTo] = useState('');

  // Shift template state
  const [shiftTemplates, setShiftTemplates] = useState<ShiftTemplate[]>([]);
  const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateWeekdays, setTemplateWeekdays] = useState<number[]>(DEFAULT_WORKDAYS);
  const [templateStartTime, setTemplateStartTime] = useState('09:00');
  const [templateEndTime, setTemplateEndTime] = useState('17:00');
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTemplateId, setAssignTemplateId] = useState('');
  const [assignScope, setAssignScope] = useState('individual');
  const [assignUserId, setAssignUserId] = useState('');
  const [assignBranchId, setAssignBranchId] = useState('');
  const [assignEffectiveFrom, setAssignEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);
  const [assignEffectiveTo, setAssignEffectiveTo] = useState('');

  const load = useCallback(async () => {
    if (!enterpriseId) return;
    setLoading(true);
    const [calRes, branchRes, overrideRes, holidayRes, empRes, staffRes, tmplRes, assignRes] = await Promise.all([
      supabase.from('calendars').select('*').eq('enterprise_id', enterpriseId).maybeSingle(),
      supabase.from('branches').select('id, name').eq('enterprise_id', enterpriseId).order('name'),
      supabase.from('branch_calendar_overrides').select('*').eq('enterprise_id', enterpriseId),
      supabase.from('holidays').select('*').eq('enterprise_id', enterpriseId).order('holiday_date'),
      supabase.from('memberships').select('user_id, status, roles!inner(name), profiles!inner(email, full_name)').eq('enterprise_id', enterpriseId).eq('status', 'active').order('joined_at'),
      supabase.from('staff_schedules').select('*').eq('enterprise_id', enterpriseId).order('effective_from', { ascending: false }),
      supabase.from('shift_templates').select('*').eq('enterprise_id', enterpriseId).order('name'),
      supabase.from('shift_assignments').select('*').eq('enterprise_id', enterpriseId).order('created_at', { ascending: false }),
    ]);

    if (calRes.data) {
      setCalendar(calRes.data as TenantCalendar);
      setEditingWeekdays(calRes.data.weekdays || DEFAULT_WORKDAYS);
      setEditingActive(calRes.data.is_active);
    }
    if (branchRes.data) setBranches(branchRes.data as Branch[]);
    if (overrideRes.data) setBranchOverrides(overrideRes.data as BranchOverride[]);
    if (holidayRes.data) setHolidays(holidayRes.data as Holiday[]);
    if (empRes.data) {
      setEmployees(empRes.data.map((m: Record<string, unknown>) => ({
        user_id: m.user_id as string,
        full_name: (m.profiles as { full_name: string | null }).full_name,
        email: (m.profiles as { email: string }).email,
        role_name: (m.roles as { name: string }).name,
      })) as Employee[]);
    }
    if (staffRes.data) setStaffSchedules(staffRes.data as StaffSchedule[]);
    if (tmplRes.data) setShiftTemplates(tmplRes.data as ShiftTemplate[]);
    if (assignRes.data) setShiftAssignments(assignRes.data as ShiftAssignment[]);
    setLoading(false);
  }, [enterpriseId]);

  useEffect(() => {
    load();
  }, [load]);

  const monthDays = useMemo(() => getMonthDays(viewYear, viewMonth), [viewYear, viewMonth]);

  const holidayEntries: HolidayEntry[] = useMemo(
    () => holidays.map((h) => ({ name: h.name, holiday_date: h.holiday_date, is_recurring_yearly: h.is_recurring_yearly })),
    [holidays]
  );

  const tenantCalendarEntry: CalendarEntry | null = useMemo(() => {
    if (!calendar) return null;
    return {
      pattern_type: calendar.pattern_type,
      weekdays: calendar.weekdays,
      start_date: calendar.start_date,
      end_date: calendar.end_date,
      specific_dates: calendar.specific_dates,
      is_active: calendar.is_active,
    };
  }, [calendar]);

  const getDayInfo = (dateStr: string) => {
    if (!dateStr || !tenantCalendarEntry) return null;
    return resolveSchedule({
      date: dateStr,
      holidays: holidayEntries,
      staffSchedule: null,
      branchCalendar: null,
      tenantCalendar: tenantCalendarEntry,
    });
  };

  const monthName = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long' });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const toggleWeekday = (day: number, list: number[], setter: (v: number[]) => void) => {
    if (list.includes(day)) {
      setter(list.filter((d) => d !== day));
    } else {
      setter([...list, day].sort());
    }
  };

  const handleSaveCalendar = async () => {
    if (!enterpriseId) return;
    setSavingCalendar(true);
    if (calendar) {
      const { error } = await supabase
        .from('calendars')
        .update({ weekdays: editingWeekdays, is_active: editingActive })
        .eq('id', calendar.id);
      if (error) toast.error('Failed to save calendar.');
      else toast.success('Calendar updated.');
    } else {
      const { error } = await supabase.from('calendars').insert({
        enterprise_id: enterpriseId,
        name: 'Default Calendar',
        pattern_type: 'recurring',
        weekdays: editingWeekdays,
        is_active: editingActive,
      });
      if (error) toast.error('Failed to create calendar.');
      else toast.success('Calendar created.');
    }
    setSavingCalendar(false);
    load();
  };

  const handleAddHoliday = async () => {
    if (!enterpriseId || !holidayName || !holidayDate) return;
    const { error } = await supabase.from('holidays').insert({
      enterprise_id: enterpriseId,
      name: holidayName,
      holiday_date: holidayDate,
      is_recurring_yearly: holidayRecurring,
      branch_id: holidayBranchId === 'all' ? null : holidayBranchId,
    });
    if (error) {
      toast.error(error.code === '23505' ? 'A holiday already exists on this date.' : 'Failed to add holiday.');
    } else {
      toast.success(`Holiday "${holidayName}" added.`);
      setHolidayName('');
      setHolidayDate('');
      setHolidayRecurring(false);
      setHolidayBranchId('all');
      setHolidayOpen(false);
      load();
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    const { error } = await supabase.from('holidays').delete().eq('id', id);
    if (error) toast.error('Failed to delete holiday.');
    else { toast.success('Holiday removed.'); load(); }
  };

  const handleAddOverride = async () => {
    if (!enterpriseId || !overrideBranchId) return;
    const { error } = await supabase.from('branch_calendar_overrides').insert({
      enterprise_id: enterpriseId,
      branch_id: overrideBranchId,
      pattern_type: 'recurring',
      weekdays: overrideWeekdays,
      start_time: overrideStartTime || null,
      end_time: overrideEndTime || null,
      is_active: true,
    });
    if (error) {
      toast.error(error.code === '23505' ? 'This branch already has a calendar override.' : 'Failed to add override.');
    } else {
      toast.success('Branch override created.');
      setOverrideBranchId('');
      setOverrideWeekdays(DEFAULT_WORKDAYS);
      setOverrideStartTime('09:00');
      setOverrideEndTime('17:00');
      setOverrideOpen(false);
      load();
    }
  };

  const handleDeleteOverride = async (id: string) => {
    const { error } = await supabase.from('branch_calendar_overrides').delete().eq('id', id);
    if (error) toast.error('Failed to delete override.');
    else { toast.success('Branch override removed.'); load(); }
  };

  const handleToggleOverride = async (id: string, current: boolean) => {
    const { error } = await supabase.from('branch_calendar_overrides').update({ is_active: !current }).eq('id', id);
    if (error) toast.error('Failed to toggle override.');
    else load();
  };

  const handleAddStaffSchedule = async () => {
    if (!enterpriseId || !staffUser) return;
    const { error } = await supabase.from('staff_schedules').insert({
      enterprise_id: enterpriseId,
      user_id: staffUser,
      pattern_type: 'recurring',
      weekdays: staffWeekdays,
      start_time: staffStartTime || null,
      end_time: staffEndTime || null,
      effective_from: staffEffectiveFrom,
      effective_to: staffEffectiveTo || null,
      is_active: true,
    });
    if (error) toast.error('Failed to save staff schedule.');
    else {
      toast.success('Staff schedule created.');
      setStaffUser('');
      setStaffWeekdays(DEFAULT_WORKDAYS);
      setStaffStartTime('09:00');
      setStaffEndTime('17:00');
      setStaffEffectiveFrom(new Date().toISOString().split('T')[0]);
      setStaffEffectiveTo('');
      setStaffSchedOpen(false);
      load();
    }
  };

  const handleDeleteStaffSchedule = async (id: string) => {
    const { error } = await supabase.from('staff_schedules').delete().eq('id', id);
    if (error) toast.error('Failed to delete staff schedule.');
    else { toast.success('Staff schedule removed.'); load(); }
  };

  const handleAddTemplate = async () => {
    if (!enterpriseId || !templateName.trim()) return;
    const { error } = await supabase.from('shift_templates').insert({
      enterprise_id: enterpriseId,
      name: templateName.trim(),
      description: templateDesc.trim() || null,
      weekdays: templateWeekdays,
      start_time: templateStartTime || null,
      end_time: templateEndTime || null,
      is_active: true,
    });
    if (error) {
      toast.error(error.code === '23505' ? 'A template with this name already exists.' : 'Failed to create template.');
    } else {
      toast.success('Shift template created.');
      setTemplateName('');
      setTemplateDesc('');
      setTemplateWeekdays(DEFAULT_WORKDAYS);
      setTemplateStartTime('09:00');
      setTemplateEndTime('17:00');
      setTemplateOpen(false);
      load();
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    const { error } = await supabase.from('shift_templates').delete().eq('id', id);
    if (error) toast.error('Failed to delete template.');
    else { toast.success('Template removed.'); load(); }
  };

  const handleAddAssignment = async () => {
    if (!enterpriseId || !assignTemplateId) return;
    if (assignScope === 'individual' && !assignUserId) {
      toast.error('Please select an employee.');
      return;
    }
    if (assignScope === 'branch' && !assignBranchId) {
      toast.error('Please select a branch.');
      return;
    }
    const { error } = await supabase.from('shift_assignments').insert({
      enterprise_id: enterpriseId,
      shift_template_id: assignTemplateId,
      user_id: assignScope === 'individual' ? assignUserId : null,
      branch_id: assignScope === 'branch' ? assignBranchId : null,
      assignment_scope: assignScope,
      effective_from: assignEffectiveFrom,
      effective_to: assignEffectiveTo || null,
      is_active: true,
    });
    if (error) toast.error('Failed to create assignment.');
    else {
      toast.success('Shift assigned.');
      setAssignTemplateId('');
      setAssignScope('individual');
      setAssignUserId('');
      setAssignBranchId('');
      setAssignEffectiveFrom(new Date().toISOString().split('T')[0]);
      setAssignEffectiveTo('');
      setAssignOpen(false);
      load();
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    const { error } = await supabase.from('shift_assignments').delete().eq('id', id);
    if (error) toast.error('Failed to remove assignment.');
    else { toast.success('Assignment removed.'); load(); }
  };

  const getEmployeeName = (userId: string) => {
    const emp = employees.find((e) => e.user_id === userId);
    return emp ? (emp.full_name || emp.email) : 'Unknown';
  };

  const getTemplateName = (templateId: string) => {
    const tmpl = shiftTemplates.find((t) => t.id === templateId);
    return tmpl ? tmpl.name : 'Unknown';
  };

  const getBranchName = (branchId: string) => {
    const b = branches.find((br) => br.id === branchId);
    return b ? b.name : 'Unknown';
  };

  if (!can('schedules.view')) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-500">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calendar &amp; Schedules</h1>
        <p className="mt-1 text-sm text-slate-500">Manage attendance calendars, holidays, and branch overrides</p>
      </div>

      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
          <TabsTrigger value="branches">Branch Overrides</TabsTrigger>
          <TabsTrigger value="staff">Staff Schedules</TabsTrigger>
          <TabsTrigger value="shifts">Shift Templates</TabsTrigger>
        </TabsList>

        {/* Calendar View Tab */}
        <TabsContent value="calendar" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Calendar Grid */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CalendarDays className="h-5 w-5 text-slate-400" />
                    {monthName} {viewYear}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={prevMonth}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={nextMonth}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1">
                  {WEEKDAY_NAMES.map((d) => (
                    <div key={d} className="pb-2 text-center text-xs font-semibold text-slate-400">
                      {d}
                    </div>
                  ))}
                  {monthDays.map((day, i) => {
                    if (!day.date) {
                      return <div key={i} />;
                    }
                    const info = getDayInfo(day.date);
                    const isExpected = info?.expected;
                    const isHoliday = info?.source === 'holiday';
                    return (
                      <div
                        key={i}
                        className={`rounded-lg border p-2 text-center text-sm transition-colors ${
                          day.isToday
                            ? 'border-primary ring-1 ring-primary/30'
                            : ''
                        } ${
                          isHoliday
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : isExpected
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : 'bg-slate-50 border-slate-100 text-slate-400'
                        }`}
                      >
                        <div className="font-medium">{day.day}</div>
                        {isHoliday && (
                          <div className="mt-1 truncate text-[10px] font-medium">
                            {info?.holiday_name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded bg-green-100 border border-green-200" />
                    Expected work day
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded bg-red-50 border border-red-200" />
                    Holiday
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded bg-slate-50 border border-slate-100" />
                    Not expected
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Calendar Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Default Calendar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label>Expected Work Days</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_WEEKDAYS.map((d) => (
                      <label
                        key={d}
                        className={`flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer ${
                          editingWeekdays.includes(d) ? 'border-primary bg-primary/5' : 'border-slate-200'
                        }`}
                      >
                        <Checkbox
                          checked={editingWeekdays.includes(d)}
                          disabled={!canManage}
                          onCheckedChange={() => toggleWeekday(d, editingWeekdays, setEditingWeekdays)}
                        />
                        <span>{WEEKDAY_FULL[d]}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="cal-active">Calendar Active</Label>
                  <Switch
                    id="cal-active"
                    checked={editingActive}
                    disabled={!canManage}
                    onCheckedChange={setEditingActive}
                  />
                </div>
                {canManage && (
                  <Button onClick={handleSaveCalendar} disabled={savingCalendar} className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    {savingCalendar ? 'Saving...' : 'Save Calendar'}
                  </Button>
                )}
                <p className="text-xs text-slate-400">
                  This is the default attendance calendar for your enterprise. Branch and staff overrides take priority.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Holidays Tab */}
        <TabsContent value="holidays" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Holidays override all schedules — no attendance is expected on these days.</p>
            {canManage && (
              <Button onClick={() => setHolidayOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Holiday
              </Button>
            )}
          </div>
          {holidays.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <CalendarHeart className="h-12 w-12 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No holidays configured.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {holidays.map((h) => (
                <Card key={h.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{h.name}</p>
                      <p className="text-sm text-slate-500">
                        {new Date(h.holiday_date + 'T00:00:00').toLocaleDateString('en-US', {
                          month: 'long', day: 'numeric', year: 'numeric',
                        })}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {h.is_recurring_yearly && (
                          <Badge variant="secondary">Recurring yearly</Badge>
                        )}
                        {h.branch_id ? (
                          <Badge variant="outline" className="text-xs">
                            <Building2 className="mr-1 h-3 w-3" />
                            {branches.find((b) => b.id === h.branch_id)?.name || 'Branch'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">All branches</Badge>
                        )}
                      </div>
                    </div>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeleteHoliday(h.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Branch Overrides Tab */}
        <TabsContent value="branches" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Branch overrides take priority over the default calendar for that branch.</p>
            {canManage && branches.length > 0 && (
              <Button onClick={() => setOverrideOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Branch Override
              </Button>
            )}
          </div>
          {branchOverrides.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Building2 className="h-12 w-12 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No branch calendar overrides configured.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {branchOverrides.map((o) => {
                const branch = branches.find((b) => b.id === o.branch_id);
                return (
                  <Card key={o.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-slate-400" />
                        <div>
                          <p className="font-medium">{branch?.name || 'Unknown Branch'}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {o.weekdays.sort().map((d) => (
                              <Badge key={d} variant="outline" className="text-xs">
                                {WEEKDAY_NAMES[d]}
                              </Badge>
                            ))}
                            {o.start_time && o.end_time && (
                              <span className="flex items-center gap-1 text-xs text-slate-500">
                                <Clock className="h-3 w-3" />
                                {o.start_time}—{o.end_time}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">Active</span>
                          <Switch
                            checked={o.is_active}
                            disabled={!canManage}
                            onCheckedChange={() => handleToggleOverride(o.id, o.is_active)}
                          />
                        </div>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDeleteOverride(o.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
          {branches.length === 0 && (
            <p className="text-sm text-amber-600">Create branches first before adding calendar overrides.</p>
          )}
        </TabsContent>

        {/* Staff Schedules Tab */}
        <TabsContent value="staff" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Assign custom work days and hours to individual employees. Overrides branch and default calendars.</p>
            {canManage && employees.length > 0 && (
              <Button onClick={() => setStaffSchedOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Staff Schedule
              </Button>
            )}
          </div>
          {staffSchedules.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <UserCog className="h-12 w-12 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No custom staff schedules configured.</p>
                <p className="mt-1 text-xs text-slate-400">Employees follow the default or branch calendar unless overridden here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {staffSchedules.map((s) => (
                <Card key={s.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <UserCog className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="font-medium">{getEmployeeName(s.user_id)}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {s.weekdays.sort().map((d) => (
                            <Badge key={d} variant="outline" className="text-xs">{WEEKDAY_NAMES[d]}</Badge>
                          ))}
                          {s.start_time && s.end_time && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="h-3 w-3" />
                              {s.start_time}—{s.end_time}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            from {s.effective_from}{s.effective_to ? ` to ${s.effective_to}` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    {canManage && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteStaffSchedule(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          {employees.length === 0 && (
            <p className="text-sm text-amber-600">Add employees first before creating staff schedules.</p>
          )}
        </TabsContent>

        {/* Shift Templates Tab */}
        <TabsContent value="shifts" className="space-y-4">
          {/* Templates section */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Shift Templates</h3>
              <p className="text-xs text-slate-500">Reusable predefined schedules — create once, assign to individuals or groups.</p>
            </div>
            {canManage && (
              <Button onClick={() => setTemplateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Button>
            )}
          </div>

          {shiftTemplates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Layers className="h-10 w-10 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No shift templates yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shiftTemplates.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{t.name}</p>
                        {t.description && <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>}
                      </div>
                      {canManage && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteTemplate(t.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {t.weekdays.sort().map((d) => (
                        <Badge key={d} variant="outline" className="text-xs">{WEEKDAY_NAMES[d]}</Badge>
                      ))}
                      {t.start_time && t.end_time && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="h-3 w-3" />
                          {t.start_time}—{t.end_time}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Assignments section */}
          <div className="flex items-center justify-between pt-4">
            <div>
              <h3 className="text-sm font-semibold">Assignments</h3>
              <p className="text-xs text-slate-500">Apply a shift template to an individual, a branch, or all employees.</p>
            </div>
            {canManage && shiftTemplates.length > 0 && (
              <Button variant="outline" onClick={() => setAssignOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Assign Shift
              </Button>
            )}
          </div>

          {shiftAssignments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-10 w-10 text-slate-300" />
                <p className="mt-2 text-sm text-slate-500">No shift assignments yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {shiftAssignments.map((a) => (
                <Card key={a.id}>
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <Layers className="h-4 w-4 text-slate-400" />
                      <div className="text-sm">
                        <span className="font-medium">{getTemplateName(a.shift_template_id)}</span>
                        <span className="mx-2 text-slate-300">→</span>
                        {a.assignment_scope === 'individual' && (
                          <span>{getEmployeeName(a.user_id || '')}</span>
                        )}
                        {a.assignment_scope === 'branch' && (
                          <span>Branch: {getBranchName(a.branch_id || '')}</span>
                        )}
                        {a.assignment_scope === 'all' && <span>All employees</span>}
                        {a.assignment_scope === 'department' && <span>Department</span>}
                        <span className="ml-2 text-xs text-slate-400">
                          from {a.effective_from}{a.effective_to ? ` to ${a.effective_to}` : ''}
                        </span>
                      </div>
                    </div>
                    {canManage && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteAssignment(a.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      <Dialog open={holidayOpen} onOpenChange={setHolidayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Holiday</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="holiday-name">Holiday Name</Label>
              <Input id="holiday-name" value={holidayName} onChange={(e) => setHolidayName(e.target.value)} placeholder="e.g. Independence Day" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-date">Date</Label>
              <Input id="holiday-date" type="date" value={holidayDate} onChange={(e) => setHolidayDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Applies To</Label>
              <Select value={holidayBranchId} onValueChange={setHolidayBranchId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All branches (entire enterprise)</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name} only</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="holiday-recurring" checked={holidayRecurring} onCheckedChange={setHolidayRecurring} />
              <Label htmlFor="holiday-recurring">Repeats every year</Label>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddHoliday} disabled={!holidayName || !holidayDate}>
              Add Holiday
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branch Override Dialog */}
      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Branch Calendar Override</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Branch</Label>
              <Select value={overrideBranchId} onValueChange={setOverrideBranchId}>
                <SelectTrigger><SelectValue placeholder="Select a branch" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label>Expected Work Days</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_WEEKDAYS.map((d) => (
                  <label
                    key={d}
                    className={`flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer ${
                      overrideWeekdays.includes(d) ? 'border-primary bg-primary/5' : 'border-slate-200'
                    }`}
                  >
                    <Checkbox
                      checked={overrideWeekdays.includes(d)}
                      onCheckedChange={() => toggleWeekday(d, overrideWeekdays, setOverrideWeekdays)}
                    />
                    <span>{WEEKDAY_FULL[d]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ovr-start">Start Time</Label>
                <Input id="ovr-start" type="time" value={overrideStartTime} onChange={(e) => setOverrideStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ovr-end">End Time</Label>
                <Input id="ovr-end" type="time" value={overrideEndTime} onChange={(e) => setOverrideEndTime(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideOpen(false)}>Cancel</Button>
            <Button onClick={handleAddOverride} disabled={!overrideBranchId}>Create Override</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Schedule Dialog */}
      <Dialog open={staffSchedOpen} onOpenChange={setStaffSchedOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Staff Schedule</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={staffUser} onValueChange={setStaffUser}>
                <SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.user_id} value={e.user_id}>
                      {e.full_name || e.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label>Expected Work Days</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_WEEKDAYS.map((d) => (
                  <label key={d} className={`flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer ${staffWeekdays.includes(d) ? 'border-primary bg-primary/5' : 'border-slate-200'}`}>
                    <Checkbox checked={staffWeekdays.includes(d)} onCheckedChange={() => toggleWeekday(d, staffWeekdays, setStaffWeekdays)} />
                    <span>{WEEKDAY_FULL[d]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="staff-start">Start Time</Label>
                <Input id="staff-start" type="time" value={staffStartTime} onChange={(e) => setStaffStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-end">End Time</Label>
                <Input id="staff-end" type="time" value={staffEndTime} onChange={(e) => setStaffEndTime(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="staff-from">Effective From</Label>
                <Input id="staff-from" type="date" value={staffEffectiveFrom} onChange={(e) => setStaffEffectiveFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-to">Effective To (optional)</Label>
                <Input id="staff-to" type="date" value={staffEffectiveTo} onChange={(e) => setStaffEffectiveTo(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStaffSchedOpen(false)}>Cancel</Button>
            <Button onClick={handleAddStaffSchedule} disabled={!staffUser}>Create Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shift Template Dialog */}
      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Shift Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tmpl-name">Template Name</Label>
              <Input id="tmpl-name" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Morning Shift, Weekend Shift" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tmpl-desc">Description (optional)</Label>
              <Input id="tmpl-desc" value={templateDesc} onChange={(e) => setTemplateDesc(e.target.value)} placeholder="What is this shift for?" />
            </div>
            <div className="space-y-3">
              <Label>Expected Work Days</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_WEEKDAYS.map((d) => (
                  <label key={d} className={`flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer ${templateWeekdays.includes(d) ? 'border-primary bg-primary/5' : 'border-slate-200'}`}>
                    <Checkbox checked={templateWeekdays.includes(d)} onCheckedChange={() => toggleWeekday(d, templateWeekdays, setTemplateWeekdays)} />
                    <span>{WEEKDAY_FULL[d]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="tmpl-start">Start Time</Label>
                <Input id="tmpl-start" type="time" value={templateStartTime} onChange={(e) => setTemplateStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tmpl-end">End Time</Label>
                <Input id="tmpl-end" type="time" value={templateEndTime} onChange={(e) => setTemplateEndTime(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTemplateOpen(false)}>Cancel</Button>
            <Button onClick={handleAddTemplate} disabled={!templateName.trim()}>Create Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shift Assignment Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Shift Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Shift Template</Label>
              <Select value={assignTemplateId} onValueChange={setAssignTemplateId}>
                <SelectTrigger><SelectValue placeholder="Select a template" /></SelectTrigger>
                <SelectContent>
                  {shiftTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={assignScope} onValueChange={setAssignScope}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual Employee</SelectItem>
                  <SelectItem value="branch">Entire Branch</SelectItem>
                  <SelectItem value="all">All Employees</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {assignScope === 'individual' && (
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={assignUserId} onValueChange={setAssignUserId}>
                  <SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.user_id} value={e.user_id}>
                        {e.full_name || e.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {assignScope === 'branch' && (
              <div className="space-y-2">
                <Label>Branch</Label>
                <Select value={assignBranchId} onValueChange={setAssignBranchId}>
                  <SelectTrigger><SelectValue placeholder="Select a branch" /></SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="assign-from">Effective From</Label>
                <Input id="assign-from" type="date" value={assignEffectiveFrom} onChange={(e) => setAssignEffectiveFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assign-to">Effective To (optional)</Label>
                <Input id="assign-to" type="date" value={assignEffectiveTo} onChange={(e) => setAssignEffectiveTo(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAddAssignment} disabled={!assignTemplateId}>Assign Shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
