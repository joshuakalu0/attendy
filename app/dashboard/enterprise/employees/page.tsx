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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { UserPlus, Search, MoreHorizontal, Mail, Ban, CheckCircle2, Trash2, Users, Copy } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Employee {
  membership_id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role_name: string;
  role_id: string;
  status: string;
  joined_at: string;
}

interface Role {
  id: string;
  name: string;
  is_system: boolean;
}

export default function EmployeesPage() {
  const { activeWorkspace } = useAuth();
  const { can } = usePermissions();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRoleId, setInviteRoleId] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkRoleId, setBulkRoleId] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const enterpriseId = activeWorkspace?.enterprise_id;

  const loadEmployees = useCallback(async () => {
    if (!enterpriseId) return;
    setLoading(true);
    const { data } = await supabase
      .from('memberships')
      .select(`
        id,
        user_id,
        role_id,
        status,
        joined_at,
        roles!inner(name, id, is_system),
        profiles!inner(email, full_name, avatar_url)
      `)
      .eq('enterprise_id', enterpriseId)
      .order('joined_at', { ascending: false });

    if (data) {
      const mapped = data.map((m: Record<string, unknown>) => ({
        membership_id: m.id as string,
        user_id: m.user_id as string,
        email: (m.profiles as { email: string }).email,
        full_name: (m.profiles as { full_name: string | null }).full_name,
        avatar_url: (m.profiles as { avatar_url: string | null }).avatar_url,
        role_name: (m.roles as { name: string }).name,
        role_id: (m.roles as { id: string }).id,
        status: m.status as string,
        joined_at: m.joined_at as string,
      }));
      setEmployees(mapped);
    }
    setLoading(false);
  }, [enterpriseId]);

  const loadRoles = useCallback(async () => {
    if (!enterpriseId) return;
    const { data } = await supabase
      .from('roles')
      .select('id, name, is_system, enterprise_id')
      .or(`is_system.eq.true,and(is_system.eq.false,enterprise_id.eq.${enterpriseId})`)
      .order('is_system', { ascending: false });
    if (data) setRoles(data);
  }, [enterpriseId]);

  useEffect(() => {
    loadEmployees();
    loadRoles();
  }, [loadEmployees, loadRoles]);

  const handleInvite = async () => {
    if (!enterpriseId || !inviteEmail || !inviteRoleId) return;
    setInviteLoading(true);
    try {
      const { data: existing } = await supabase
        .from('memberships')
        .select('id')
        .eq('enterprise_id', enterpriseId)
        .eq('user_id', '(select user_id from profiles where email = $1)')
        .maybeSingle();

      // Check seat limit
      const { data: seatOk } = await supabase.rpc('check_seat_limit', {
        p_enterprise_id: enterpriseId,
      });
      if (seatOk === false) {
        toast.error('Seat limit reached. Upgrade your plan to invite more employees.');
        setInviteLoading(false);
        return;
      }

      const { error } = await supabase.from('invites').insert({
        enterprise_id: enterpriseId,
        email: inviteEmail,
        role_id: inviteRoleId,
        invited_by: (await supabase.auth.getUser()).data.user?.id,
      });

      if (error) {
        if (error.code === '23505') {
          toast.error('An invitation has already been sent to this email.');
        } else {
          toast.error('Failed to send invitation.');
        }
      } else {
        await supabase.rpc('log_audit_event', {
          p_action: 'employee.invited',
          p_resource_type: 'invite',
          p_details: { email: inviteEmail } as unknown as never,
          p_enterprise_id: enterpriseId,
        });
        toast.success(`Invitation sent to ${inviteEmail}`);
        setInviteEmail('');
        setInviteRoleId('');
        setInviteOpen(false);
      }
    } catch {
      toast.error('An error occurred.');
    }
    setInviteLoading(false);
  };

  const handleBulkInvite = async () => {
    if (!enterpriseId || !bulkEmails || !bulkRoleId) return;
    const emails = bulkEmails
      .split(/[\n,]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && /\S+@\S+\.\S+/.test(e));
    if (emails.length === 0) {
      toast.error('No valid email addresses found.');
      return;
    }

    setBulkLoading(true);
    let successCount = 0;
    let failCount = 0;

    const { data: seatOk } = await supabase.rpc('check_seat_limit', {
      p_enterprise_id: enterpriseId,
    });
    if (seatOk === false) {
      toast.error('Seat limit reached. Upgrade your plan to invite more employees.');
      setBulkLoading(false);
      return;
    }

    const userId = (await supabase.auth.getUser()).data.user?.id;

    for (const email of emails) {
      const { error } = await supabase.from('invites').insert({
        enterprise_id: enterpriseId,
        email,
        role_id: bulkRoleId,
        invited_by: userId,
      });
      if (error) {
        if (error.code === '23505') {
          failCount++;
        } else {
          failCount++;
        }
      } else {
        successCount++;
      }
    }

    if (successCount > 0) {
      await supabase.rpc('log_audit_event', {
        p_action: 'employee.bulk_invited',
        p_resource_type: 'invite',
        p_details: { count: successCount, failed: failCount } as unknown as never,
        p_enterprise_id: enterpriseId,
      });
      toast.success(`${successCount} invitation${successCount !== 1 ? 's' : ''} sent${failCount > 0 ? `, ${failCount} already existed` : ''}.`);
      setBulkEmails('');
      setBulkRoleId('');
      setBulkOpen(false);
      loadEmployees();
    } else {
      toast.error('All emails already have pending invitations.');
    }
    setBulkLoading(false);
  };

  const handleChangeRole = async (membershipId: string, newRoleId: string) => {
    const { error } = await supabase
      .from('memberships')
      .update({ role_id: newRoleId })
      .eq('id', membershipId);
    if (error) {
      toast.error('Failed to change role.');
    } else {
      toast.success('Role updated.');
      loadEmployees();
    }
  };

  const handleToggleStatus = async (membershipId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'deactivated' : 'active';
    const { error } = await supabase
      .from('memberships')
      .update({ status: newStatus })
      .eq('id', membershipId);
    if (error) {
      toast.error('Failed to update status.');
    } else {
      toast.success(`Employee ${newStatus === 'active' ? 'reactivated' : 'deactivated'}.`);
      loadEmployees();
    }
  };

  const handleRemove = async (membershipId: string, email: string) => {
    const { error } = await supabase.from('memberships').delete().eq('id', membershipId);
    if (error) {
      toast.error('Failed to remove employee.');
    } else {
      toast.success(`Removed ${email}.`);
      loadEmployees();
    }
  };

  const filtered = employees.filter((e) => {
    const matchesSearch =
      !search ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.full_name?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!can('members.view') && !can('employees.invite')) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-500">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your team members</p>
        </div>
        {can('employees.invite') && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setBulkEmails(''); setBulkRoleId(''); setBulkOpen(true); }}>
              <Users className="mr-2 h-4 w-4" />
              Bulk Invite
            </Button>
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Employee
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a new employee</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRoleId} onValueChange={setInviteRoleId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} {r.is_system && '(System)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleInvite} disabled={inviteLoading}>
                  {inviteLoading ? 'Sending...' : 'Send Invitation'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="deactivated">Deactivated</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No employees found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((emp) => {
                  const initials = (emp.full_name || emp.email)
                    .split(' ')
                    .map((s) => s[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                  return (
                    <TableRow key={emp.membership_id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={emp.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{emp.full_name || 'Unnamed'}</p>
                            <p className="text-xs text-slate-500">{emp.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {can('roles.manage') && emp.status === 'active' ? (
                          <Select
                            value={emp.role_id}
                            onValueChange={(v) => handleChangeRole(emp.membership_id, v)}
                          >
                            <SelectTrigger className="h-8 w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {roles.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  {r.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="secondary">{emp.role_name}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            emp.status === 'active'
                              ? 'default'
                              : emp.status === 'deactivated'
                                ? 'destructive'
                                : 'outline'
                          }
                        >
                          {emp.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(emp.joined_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {(can('employees.manage') || can('employees.remove')) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {can('employees.manage') && emp.status !== 'invited' && (
                                <DropdownMenuItem
                                  onClick={() => handleToggleStatus(emp.membership_id, emp.status)}
                                >
                                  {emp.status === 'active' ? (
                                    <>
                                      <Ban className="mr-2 h-4 w-4" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
                                      Reactivate
                                    </>
                                  )}
                                </DropdownMenuItem>
                              )}
                              {can('employees.remove') && (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleRemove(emp.membership_id, emp.email)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Remove
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Bulk Invite Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Invite Employees</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="bulk-emails">Email Addresses</Label>
              <Textarea
                id="bulk-emails"
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                placeholder="one@example.com&#10;two@example.com&#10;three@example.com"
                rows={6}
              />
              <p className="text-xs text-slate-500">Enter one email per line or separate with commas.</p>
            </div>
            <div className="space-y-2">
              <Label>Role for all invitees</Label>
              <Select value={bulkRoleId} onValueChange={setBulkRoleId}>
                <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} {r.is_system && '(System)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleBulkInvite} disabled={bulkLoading || !bulkEmails || !bulkRoleId}>
              {bulkLoading ? 'Sending...' : 'Send Invitations'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pending Invites */}
      <PendingInvites enterpriseId={enterpriseId} onReload={loadEmployees} />
    </div>
  );
}

function PendingInvites({
  enterpriseId,
  onReload,
}: {
  enterpriseId: string | undefined;
  onReload: () => void;
}) {
  const [invites, setInvites] = useState<Array<{
    id: string;
    email: string;
    status: string;
    token: string;
    created_at: string;
    roles: { name: string };
  }>>([]);

  const loadInvites = useCallback(async () => {
    if (!enterpriseId) return;
    const { data } = await supabase
      .from('invites')
      .select('id, email, status, token, created_at, roles!inner(name)')
      .eq('enterprise_id', enterpriseId)
      .order('created_at', { ascending: false });
    if (data) {
      setInvites(data.map((i: Record<string, unknown>) => ({
        id: i.id as string,
        email: i.email as string,
        status: i.status as string,
        token: i.token as string,
        created_at: i.created_at as string,
        roles: i.roles as { name: string },
      })));
    }
  }, [enterpriseId]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const handleResend = async (id: string) => {
    const { error } = await supabase
      .from('invites')
      .update({ expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
      .eq('id', id);
    if (error) {
      toast.error('Failed to resend invite.');
    } else {
      toast.success('Invitation resent.');
      loadInvites();
    }
  };

  const handleCancel = async (id: string) => {
    const { error } = await supabase.from('invites').delete().eq('id', id);
    if (error) {
      toast.error('Failed to cancel invite.');
    } else {
      toast.success('Invitation cancelled.');
      loadInvites();
      onReload();
    }
  };

  const handleCopyLink = async (token: string) => {
    const url = `${window.location.origin}/accept-invite?token=${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Invite link copied to clipboard.');    
    } catch {
      toast.error('Could not copy link.');
    }
  };

  if (invites.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pending Invitations</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  {inv.email}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{inv.roles.name}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={inv.status === 'pending' ? 'secondary' : 'outline'}>
                    {inv.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {new Date(inv.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {inv.status === 'pending' && (
                        <>
                          <DropdownMenuItem onClick={() => handleCopyLink(inv.token)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Invite Link
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResend(inv.id)}>
                            <Mail className="mr-2 h-4 w-4" />
                            Resend
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleCancel(inv.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Cancel
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
