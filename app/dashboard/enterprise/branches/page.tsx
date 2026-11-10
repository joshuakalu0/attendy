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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { MapPin, Plus, MoreHorizontal, Users, Pencil, Power, Trash2, Navigation } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  address: string | null;
  geofence_lat: number;
  geofence_lng: number;
  geofence_radius_m: number;
  timezone: string;
  is_active: boolean;
  manager_count: number;
  staff_count: number;
}

interface Employee {
  user_id: string;
  full_name: string | null;
  email: string;
  assignment_type: string | null;
}

const TIMEZONES = [
  'UTC', 'Africa/Lagos', 'Africa/Nairobi', 'Africa/Cairo', 'Africa/Johannesburg',
  'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'America/Denver',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid',
  'Asia/Dubai', 'Asia/Tokyo', 'Asia/Singapore', 'Asia/Kolkata',
  'Australia/Sydney', 'Pacific/Auckland',
];

export default function BranchesPage() {
  const { activeWorkspace } = useAuth();
  const { can } = usePermissions();
  const enterpriseId = activeWorkspace?.enterprise_id;
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [assignBranch, setAssignBranch] = useState<Branch | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [radius, setRadius] = useState(100);
  const [timezone, setTimezone] = useState('UTC');
  const [lateGrace, setLateGrace] = useState(0);
  const [earlyLeave, setEarlyLeave] = useState(0);
  const [minAccuracy, setMinAccuracy] = useState(50);
  const [saving, setSaving] = useState(false);

  const loadBranches = useCallback(async () => {
    if (!enterpriseId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('branches')
      .select('id, name, address, geofence_lat, geofence_lng, geofence_radius_m, timezone, is_active')
      .eq('enterprise_id', enterpriseId)
      .order('name');

    if (error) {
      toast.error('Failed to load branches');
      setLoading(false);
      return;
    }

    if (data) {
      const withCounts = await Promise.all(
        data.map(async (b) => {
          const { count: mgrCount } = await supabase
            .from('branch_assignments')
            .select('id', { count: 'exact' })
            .eq('branch_id', b.id)
            .eq('assignment_type', 'manager');
          const { count: staffCount } = await supabase
            .from('branch_assignments')
            .select('id', { count: 'exact' })
            .eq('branch_id', b.id)
            .eq('assignment_type', 'staff');
          return {
            ...b,
            manager_count: mgrCount || 0,
            staff_count: staffCount || 0,
          };
        })
      );
      setBranches(withCounts);
    }
    setLoading(false);
  }, [enterpriseId]);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  const resetForm = () => {
    setName('');
    setAddress('');
    setLat(0);
    setLng(0);
    setRadius(100);
    setTimezone('UTC');
    setLateGrace(0);
    setEarlyLeave(0);
    setMinAccuracy(50);
  };

  const useMyLocation = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          if (pos.coords.accuracy) {
            setMinAccuracy(Math.ceil(pos.coords.accuracy));
          }
          toast.success('Location captured');
        },
        () => {
          toast.error('Could not get your location. Please enter coordinates manually.');
        }
      );
    } else {
      toast.error('Geolocation not supported on this device.');
    }
  };

  const handleCreate = async () => {
    if (!enterpriseId || !name) return;
    setSaving(true);

    const { data: limitOk } = await supabase.rpc('check_branch_limit', {
      p_enterprise_id: enterpriseId,
    });
    if (limitOk === false) {
      toast.error('Branch limit reached. Upgrade your plan to add more branches.');
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('branches').insert({
      enterprise_id: enterpriseId,
      name,
      address: address || null,
      geofence_lat: lat,
      geofence_lng: lng,
      geofence_radius_m: radius,
      timezone,
      late_grace_minutes: lateGrace,
      early_leave_minutes: earlyLeave,
      min_gps_accuracy_m: minAccuracy,
    });

    if (error) {
      toast.error(error.code === '23505' ? 'A branch with this name already exists.' : 'Failed to create branch.');
    } else {
      await supabase.rpc('log_audit_event', {
        p_action: 'branch.created',
        p_resource_type: 'branch',
        p_details: { name } as unknown as never,
        p_enterprise_id: enterpriseId,
      });
      toast.success(`Branch "${name}" created.`);
      resetForm();
      setCreateOpen(false);
      loadBranches();
    }
    setSaving(false);
  };

  const handleEdit = async () => {
    if (!editBranch || !enterpriseId) return;
    setSaving(true);
    const { error } = await supabase
      .from('branches')
      .update({
        name,
        address: address || null,
        geofence_lat: lat,
        geofence_lng: lng,
        geofence_radius_m: radius,
        timezone,
        late_grace_minutes: lateGrace,
        early_leave_minutes: earlyLeave,
        min_gps_accuracy_m: minAccuracy,
      })
      .eq('id', editBranch.id);

    if (error) {
      toast.error('Failed to update branch.');
    } else {
      await supabase.rpc('log_audit_event', {
        p_action: 'branch.updated',
        p_resource_type: 'branch',
        p_resource_id: editBranch.id,
        p_details: { name } as unknown as never,
        p_enterprise_id: enterpriseId,
      });
      toast.success('Branch updated.');
      setEditBranch(null);
      resetForm();
      loadBranches();
    }
    setSaving(false);
  };

  const handleToggleActive = async (branch: Branch) => {
    if (!enterpriseId) return;
    const { error } = await supabase
      .from('branches')
      .update({ is_active: !branch.is_active })
      .eq('id', branch.id);
    if (error) {
      toast.error('Failed to update branch status.');
    } else {
      await supabase.rpc('log_audit_event', {
        p_action: branch.is_active ? 'branch.deactivated' : 'branch.activated',
        p_resource_type: 'branch',
        p_resource_id: branch.id,
        p_details: { name: branch.name } as unknown as never,
        p_enterprise_id: enterpriseId,
      });
      toast.success(`Branch ${branch.is_active ? 'deactivated' : 'activated'}.`);
      loadBranches();
    }
  };

  const handleDelete = async (branch: Branch) => {
    if (!enterpriseId) return;
    const { error } = await supabase.from('branches').delete().eq('id', branch.id);
    if (error) {
      toast.error('Cannot delete branch with existing assignments. Remove assignments first.');
    } else {
      await supabase.rpc('log_audit_event', {
        p_action: 'branch.deleted',
        p_resource_type: 'branch',
        p_resource_id: branch.id,
        p_details: { name: branch.name } as unknown as never,
        p_enterprise_id: enterpriseId,
      });
      toast.success(`Branch "${branch.name}" deleted.`);
      loadBranches();
    }
  };

  const openEdit = (branch: Branch) => {
    setEditBranch(branch);
    setName(branch.name);
    setAddress(branch.address || '');
    setLat(branch.geofence_lat);
    setLng(branch.geofence_lng);
    setRadius(branch.geofence_radius_m);
    setTimezone(branch.timezone);
  };

  const openAssign = async (branch: Branch) => {
    setAssignBranch(branch);
    if (!enterpriseId) return;
    const { data: members } = await supabase
      .from('memberships')
      .select('user_id, status, profiles!inner(email, full_name)')
      .eq('enterprise_id', enterpriseId)
      .eq('status', 'active')
      .order('joined_at');

    const { data: assigns } = await supabase
      .from('branch_assignments')
      .select('user_id, assignment_type')
      .eq('branch_id', branch.id);

    const assignMap: Record<string, string> = {};
    if (assigns) {
      assigns.forEach((a) => {
        assignMap[a.user_id] = a.assignment_type;
      });
    }

    if (members) {
      setEmployees(
        members.map((m) => {
          const p = m.profiles as unknown as { email: string; full_name: string | null };
          return {
            user_id: m.user_id as string,
            full_name: p.full_name,
            email: p.email,
            assignment_type: assignMap[m.user_id as string] || null,
          };
        })
      );
      setAssignments(assignMap);
    }
  };

  const handleAssignmentChange = async (userId: string, type: string | null) => {
    if (!assignBranch || !enterpriseId) return;
    const current = assignments[userId];

    if (type === null && current) {
      await supabase
        .from('branch_assignments')
        .delete()
        .eq('branch_id', assignBranch.id)
        .eq('user_id', userId);
    } else if (type && !current) {
      await supabase.from('branch_assignments').insert({
        branch_id: assignBranch.id,
        user_id: userId,
        enterprise_id: enterpriseId,
        assignment_type: type,
      });
    } else if (type && current && type !== current) {
      await supabase
        .from('branch_assignments')
        .delete()
        .eq('branch_id', assignBranch.id)
        .eq('user_id', userId);
      await supabase.from('branch_assignments').insert({
        branch_id: assignBranch.id,
        user_id: userId,
        enterprise_id: enterpriseId,
        assignment_type: type,
      });
    }

    setAssignments((prev) => {
      const next = { ...prev };
      if (type === null) {
        delete next[userId];
      } else {
        next[userId] = type;
      }
      return next;
    });
  };

  if (!can('branches.view')) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-500">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  const formDialog = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="branch-name">Branch Name</Label>
        <Input id="branch-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Headquarters" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="branch-address">Address</Label>
        <Input id="branch-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City" />
      </div>
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label>Geofence Location</Label>
          <Button type="button" variant="outline" size="sm" onClick={useMyLocation}>
            <Navigation className="mr-2 h-3 w-3" />
            Use My Location
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Latitude</Label>
            <Input type="number" step="any" value={lat} onChange={(e) => setLat(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Longitude</Label>
            <Input type="number" step="any" value={lng} onChange={(e) => setLng(parseFloat(e.target.value) || 0)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Geofence Radius (meters)</Label>
          <Input type="number" value={radius} onChange={(e) => setRadius(parseInt(e.target.value) || 100)} />
        </div>
        <p className="text-xs text-slate-400">
          Staff must be within {radius}m of ({lat.toFixed(4)}, {lng.toFixed(4)}) to check in.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Timezone</Label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>{tz}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Min GPS Accuracy (m)</Label>
          <Input type="number" value={minAccuracy} onChange={(e) => setMinAccuracy(parseInt(e.target.value) || 50)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Late Grace (minutes)</Label>
          <Input type="number" value={lateGrace} onChange={(e) => setLateGrace(parseInt(e.target.value) || 0)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Early Leave Allowance (minutes)</Label>
          <Input type="number" value={earlyLeave} onChange={(e) => setEarlyLeave(parseInt(e.target.value) || 0)} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Branches</h1>
          <p className="mt-1 text-sm text-slate-500">Manage locations with geofenced attendance</p>
        </div>
        {can('branches.manage') && (
          <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Branch
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : branches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MapPin className="h-12 w-12 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">No branches yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Status</TableHead>
                  {can('branches.manage') && <TableHead className="w-12" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {branch.address || `${branch.geofence_lat.toFixed(4)}, ${branch.geofence_lng.toFixed(4)}`}
                      <span className="ml-2 text-xs text-slate-400">{branch.geofence_radius_m}m radius</span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">{branch.timezone}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {branch.manager_count > 0 && (
                          <Badge variant="secondary">{branch.manager_count} mgr</Badge>
                        )}
                        {branch.staff_count > 0 && (
                          <Badge variant="outline">{branch.staff_count} staff</Badge>
                        )}
                        {branch.manager_count === 0 && branch.staff_count === 0 && (
                          <span className="text-xs text-slate-400">No assignments</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={branch.is_active ? 'default' : 'secondary'}>
                        {branch.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    {can('branches.manage') && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(branch)}>
                              <Pencil className="mr-2 h-3 w-3" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openAssign(branch)}>
                              <Users className="mr-2 h-3 w-3" />
                              Assign Staff
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleActive(branch)}>
                              <Power className="mr-2 h-3 w-3" />
                              {branch.is_active ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(branch)}
                            >
                              <Trash2 className="mr-2 h-3 w-3" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Branch</DialogTitle>
          </DialogHeader>
          {formDialog}
          <DialogFooter>
            <Button onClick={handleCreate} disabled={saving || !name}>
              {saving ? 'Creating...' : 'Create Branch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editBranch} onOpenChange={(open) => { if (!open) { setEditBranch(null); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
          </DialogHeader>
          {formDialog}
          <DialogFooter>
            <Button onClick={handleEdit} disabled={saving || !name}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment Dialog */}
      <Dialog open={!!assignBranch} onOpenChange={(open) => { if (!open) setAssignBranch(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Staff — {assignBranch?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {employees.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No active employees in this enterprise.</p>
            ) : (
              employees.map((emp) => (
                <div key={emp.user_id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{emp.full_name || emp.email}</p>
                    {emp.full_name && <p className="text-xs text-slate-500">{emp.email}</p>}
                  </div>
                  <Select
                    value={assignments[emp.user_id] || 'none'}
                    onValueChange={(val) => handleAssignmentChange(emp.user_id, val === 'none' ? null : val)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not assigned</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
