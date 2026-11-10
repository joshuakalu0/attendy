'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MapPin, Clock, LogIn, LogOut, Navigation, CheckCircle2, AlertCircle } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  geofence_lat: number;
  geofence_lng: number;
  geofence_radius_m: number;
  is_active: boolean;
}

interface TodayRecord {
  id: string;
  check_in_time: string;
  check_out_time: string | null;
  status: string;
  late_minutes: number;
  branch_id: string;
}

export default function CheckInPage() {
  const { activeWorkspace } = useAuth();
  const { can } = usePermissions();
  const enterpriseId = activeWorkspace?.enterprise_id;
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [todayRecord, setTodayRecord] = useState<TodayRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const load = useCallback(async () => {
    if (!enterpriseId) return;
    setLoading(true);

    // Get branches the user is assigned to
    const { data: assignments } = await supabase
      .from('branch_assignments')
      .select('branch_id, assignment_type, branches!inner(id, name, geofence_lat, geofence_lng, geofence_radius_m, is_active)')
      .eq('enterprise_id', enterpriseId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

    const userBranches: Branch[] = [];
    if (assignments) {
      assignments.forEach((a) => {
        const b = a.branches as unknown as Branch;
        if (b && b.is_active) {
          userBranches.push(b);
        }
      });
    }
    setBranches(userBranches);
    if (userBranches.length === 1) {
      setSelectedBranch(userBranches[0]);
    }

    // Get today's attendance record
    const today = new Date().toISOString().split('T')[0];
    const { data: records } = await supabase
      .from('attendance_records')
      .select('id, check_in_time, check_out_time, status, late_minutes, branch_id')
      .eq('enterprise_id', enterpriseId)
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .eq('check_in_date', today)
      .order('check_in_time', { ascending: false });

    if (records && records.length > 0) {
      setTodayRecord(records[0] as TodayRecord);
      const branch = userBranches.find((b) => b.id === (records[0] as TodayRecord).branch_id);
      if (branch) setSelectedBranch(branch);
    }

    setLoading(false);
  }, [enterpriseId]);

  useEffect(() => {
    load();
  }, [load]);

  const getLocation = (): Promise<{ lat: number; lng: number; accuracy: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  };

  const handleCheckIn = async () => {
    if (!enterpriseId || !selectedBranch) return;
    setSubmitting(true);
    setGettingLocation(true);

    try {
      const loc = await getLocation();
      setLocation(loc);
      setGettingLocation(false);

      const { data, error } = await supabase.rpc('submit_check_in', {
        p_enterprise_id: enterpriseId,
        p_branch_id: selectedBranch.id,
        p_lat: loc.lat,
        p_lng: loc.lng,
        p_accuracy: loc.accuracy,
      });

      if (error) {
        toast.error('Check-in failed: ' + error.message);
      } else if (data) {
        const result = data as { success: boolean; error?: string; message?: string; status?: string; late_minutes?: number };
        if (result.success) {
          toast.success(`Checked in as ${result.status || 'present'}` + (result.late_minutes ? ` (${result.late_minutes} min late)` : ''));
          load();
        } else {
          toast.error(result.message || 'Check-in failed');
        }
      }
    } catch {
      setGettingLocation(false);
      toast.error('Could not get your location. Please enable location permissions.');
    }
    setSubmitting(false);
  };

  const handleCheckOut = async () => {
    if (!todayRecord) return;
    setSubmitting(true);
    setGettingLocation(true);

    try {
      const loc = await getLocation();
      setLocation(loc);
      setGettingLocation(false);

      const { data, error } = await supabase.rpc('submit_check_out', {
        p_record_id: todayRecord.id,
        p_lat: loc.lat,
        p_lng: loc.lng,
        p_accuracy: loc.accuracy,
      });

      if (error) {
        toast.error('Check-out failed: ' + error.message);
      } else if (data) {
        const result = data as { success: boolean; error?: string; message?: string; status?: string };
        if (result.success) {
          toast.success(`Checked out${result.status === 'early_leave' ? ' (early leave)' : ''}`);
          load();
        } else {
          toast.error(result.message || 'Check-out failed');
        }
      }
    } catch {
      setGettingLocation(false);
      toast.error('Could not get your location.');
    }
    setSubmitting(false);
  };

  if (!can('attendance.submit')) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-500">You don&apos;t have permission to check in.</p>
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

  const hasCheckedIn = !!todayRecord;
  const hasCheckedOut = !!todayRecord?.check_out_time;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Check In</h1>
        <p className="mt-1 text-sm text-slate-500">Record your attendance with GPS verification</p>
      </div>

      {/* Branch Selection */}
      {branches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MapPin className="h-12 w-12 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">You are not assigned to any active branch.</p>
            <p className="mt-1 text-xs text-slate-400">Contact your administrator to be assigned to a branch.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {branches.length > 1 && !hasCheckedIn && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Select Branch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBranch(b)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                      selectedBranch?.id === b.id ? 'border-primary bg-primary/5' : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <MapPin className="h-5 w-5 text-slate-400" />
                    <span className="text-sm font-medium">{b.name}</span>
                    {selectedBranch?.id === b.id && <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />}
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Status Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                {hasCheckedOut ? (
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                      <CheckCircle2 className="h-8 w-8 text-green-600" />
                    </div>
                    <p className="mt-3 text-lg font-semibold">Day Complete</p>
                    <p className="mt-1 text-sm text-slate-500">
                      You checked in at {new Date(todayRecord!.check_in_time).toLocaleTimeString()} and checked out at{' '}
                      {new Date(todayRecord!.check_out_time!).toLocaleTimeString()}
                    </p>
                    <Badge
                      className="mt-3"
                      variant={todayRecord!.status === 'late' ? 'destructive' : todayRecord!.status === 'early_leave' ? 'secondary' : 'default'}
                    >
                      {todayRecord!.status.replace('_', ' ')}
                    </Badge>
                  </>
                ) : hasCheckedIn ? (
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                      <Clock className="h-8 w-8 text-blue-600" />
                    </div>
                    <p className="mt-3 text-lg font-semibold">Checked In</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Since {new Date(todayRecord!.check_in_time).toLocaleTimeString()}
                    </p>
                    <Badge
                      className="mt-3"
                      variant={todayRecord!.status === 'late' ? 'destructive' : 'default'}
                    >
                      {todayRecord!.status === 'late' ? `${todayRecord!.late_minutes} min late` : 'On time'}
                    </Badge>
                    <Button
                      className="mt-6"
                      size="lg"
                      onClick={handleCheckOut}
                      disabled={submitting || !selectedBranch}
                    >
                      {gettingLocation ? (
                        <><Navigation className="mr-2 h-4 w-4 animate-spin" /> Getting location...</>
                      ) : submitting ? (
                        'Checking out...'
                      ) : (
                        <><LogOut className="mr-2 h-4 w-4" /> Check Out</>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
                      <LogIn className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="mt-3 text-lg font-semibold">Ready to Check In</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedBranch ? `Checking into ${selectedBranch.name}` : 'Select a branch above'}
                    </p>
                    <Button
                      className="mt-6"
                      size="lg"
                      onClick={handleCheckIn}
                      disabled={submitting || !selectedBranch}
                    >
                      {gettingLocation ? (
                        <><Navigation className="mr-2 h-4 w-4 animate-spin" /> Getting location...</>
                      ) : submitting ? (
                        'Checking in...'
                      ) : (
                        <><LogIn className="mr-2 h-4 w-4" /> Check In Now</>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Location Info */}
          {location && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-500" />
                  <div className="text-sm">
                    <p className="font-medium">Your Location</p>
                    <p className="text-slate-500">
                      {location.lat.toFixed(5)}, {location.lng.toFixed(5)} (accuracy: {Math.round(location.accuracy)}m)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Geofence Info */}
          {selectedBranch && !hasCheckedIn && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-slate-400" />
                  <div className="text-sm">
                    <p className="font-medium">{selectedBranch.name}</p>
                    <p className="text-slate-500">
                      Geofence: {selectedBranch.geofence_radius_m}m radius from {selectedBranch.geofence_lat.toFixed(4)}, {selectedBranch.geofence_lng.toFixed(4)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
