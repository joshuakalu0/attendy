export type PatternType = 'recurring' | 'specific';
export type ScheduleSource = 'holiday' | 'staff_override' | 'branch_calendar' | 'tenant_calendar' | 'no_calendar';

export interface CalendarEntry {
  pattern_type: PatternType;
  weekdays: number[];
  start_date: string | null;
  end_date: string | null;
  specific_dates: string[];
  is_active: boolean;
}

export interface StaffScheduleEntry {
  pattern_type: PatternType;
  weekdays: number[];
  start_date: string | null;
  end_date: string | null;
  specific_dates: string[];
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
}

export interface HolidayEntry {
  name: string;
  holiday_date: string;
  is_recurring_yearly: boolean;
}

export interface ResolveResult {
  expected: boolean;
  source: ScheduleSource;
  holiday_name?: string;
  day_of_week: number;
}

function dateInRange(date: string, start: string | null, end: string | null): boolean {
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function matchesPattern(
  dateStr: string,
  entry: { pattern_type: PatternType; weekdays: number[]; specific_dates: string[]; start_date: string | null; end_date: string | null }
): boolean {
  const date = new Date(dateStr + 'T00:00:00');
  const dow = date.getDay();

  if (entry.pattern_type === 'recurring') {
    if (!entry.weekdays.includes(dow)) return false;
    return dateInRange(dateStr, entry.start_date, entry.end_date);
  } else {
    return entry.specific_dates.includes(dateStr);
  }
}

export function resolveSchedule(params: {
  date: string;
  holidays: HolidayEntry[];
  staffSchedule: StaffScheduleEntry | null;
  branchCalendar: CalendarEntry | null;
  tenantCalendar: CalendarEntry | null;
}): ResolveResult {
  const { date, holidays, staffSchedule, branchCalendar, tenantCalendar } = params;
  const d = new Date(date + 'T00:00:00');
  const dow = d.getDay();

  // 1. Holiday wins
  for (const h of holidays) {
    if (h.is_recurring_yearly) {
      const hDate = new Date(h.holiday_date + 'T00:00:00');
      if (hDate.getMonth() === d.getMonth() && hDate.getDate() === d.getDate()) {
        return { expected: false, source: 'holiday', holiday_name: h.name, day_of_week: dow };
      }
    } else {
      if (h.holiday_date === date) {
        return { expected: false, source: 'holiday', holiday_name: h.name, day_of_week: dow };
      }
    }
  }

  // 2. Staff override
  if (staffSchedule && staffSchedule.is_active) {
    if (date >= staffSchedule.effective_from && (!staffSchedule.effective_to || date <= staffSchedule.effective_to)) {
      const expected = matchesPattern(date, staffSchedule);
      return { expected, source: 'staff_override', day_of_week: dow };
    }
  }

  // 3. Branch calendar
  if (branchCalendar && branchCalendar.is_active) {
    const expected = matchesPattern(date, branchCalendar);
    return { expected, source: 'branch_calendar', day_of_week: dow };
  }

  // 4. Tenant calendar
  if (tenantCalendar && tenantCalendar.is_active) {
    const expected = matchesPattern(date, tenantCalendar);
    return { expected, source: 'tenant_calendar', day_of_week: dow };
  }

  // No calendar
  return { expected: false, source: 'no_calendar', day_of_week: dow };
}

export function getMonthDays(year: number, month: number): { date: string; day: number; dow: number; isToday: boolean }[] {
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: { date: string; day: number; dow: number; isToday: boolean }[] = [];

  // Add empty days for padding
  const startDow = firstDay.getDay();
  for (let i = 0; i < startDow; i++) {
    days.push({ date: '', day: 0, dow: i, isToday: false });
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    const dateStr = date.toISOString().split('T')[0];
    days.push({ date: dateStr, day: d, dow: date.getDay(), isToday: dateStr === today });
  }

  return days;
}

export const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
