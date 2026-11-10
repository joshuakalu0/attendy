'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, Pencil, Users, Mail, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface UserRow {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  account_type_id: string;
  account_type_key: string;
  account_type_label: string;
  status: string;
  created_at: string;
  enterprise_count: number;
}

interface AccountType {
  id: string;
  key: string;
  label: string;
}

interface EditForm {
  full_name: string;
  phone: string;
  account_type_id: string;
  status: string;
}

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<EditForm>({
    full_name: '', phone: '', account_type_id: '', status: 'active',
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [userRes, typeRes] = await Promise.all([
      supabase.from('profiles')
        .select('id, user_id, email, full_name, phone, status, created_at, account_type_id, account_types!inner(id, key, label)')
        .order('created_at', { ascending: false }),
      supabase.from('account_types').select('id, key, label').order('sort_order'),
    ]);

    if (typeRes.data) setAccountTypes(typeRes.data as AccountType[]);

    if (userRes.data) {
      const userIds = userRes.data.map((u) => u.user_id);
      const { data: memberData } = await supabase
        .from('memberships')
        .select('user_id')
        .in('user_id', userIds)
        .eq('status', 'active');

      const entCounts = new Map<string, number>();
      for (const m of (memberData || [])) {
        entCounts.set(m.user_id, (entCounts.get(m.user_id) || 0) + 1);
      }

      setUsers(userRes.data.map((u) => {
        const at = u.account_types as unknown as { id: string; key: string; label: string };
        return {
          id: u.id,
          user_id: u.user_id,
          email: u.email,
          full_name: u.full_name,
          phone: u.phone,
          account_type_id: at.id,
          account_type_key: at.key,
          account_type_label: at.label,
          status: u.status,
          created_at: u.created_at,
          enterprise_count: entCounts.get(u.user_id) || 0,
        };
      }));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter((u) => {
    const matchesSearch = !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (user: UserRow) => {
    setEditUser(user);
    setForm({
      full_name: user.full_name || '',
      phone: user.phone || '',
      account_type_id: user.account_type_id,
      status: user.status,
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({
      full_name: form.full_name || null,
      phone: form.phone || null,
      account_type_id: form.account_type_id,
      status: form.status,
    }).eq('id', editUser.id);
    if (error) {
      toast.error('Failed to update user.');
    } else {
      toast.success('User updated.');
      setEditOpen(false);
      setEditUser(null);
      load();
    }
    setSaving(false);
  };

  const handleToggleStatus = async (user: UserRow) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    const { error } = await supabase.from('profiles')
      .update({ status: newStatus }).eq('id', user.id);
    if (error) {
      toast.error('Failed to update user status.');
    } else {
      toast.success(`${user.email} ${newStatus === 'active' ? 'activated' : 'suspended'}.`);
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="mt-1 text-sm text-slate-500">Manage all registered users on the platform</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search users..."
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
                <SelectItem value="suspended">Suspended</SelectItem>
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
            <div className="py-8 text-center text-sm text-slate-500">No users found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Account Type</TableHead>
                  <TableHead>Enterprises</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const initials = (u.full_name || u.email)
                    .split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{u.full_name || 'Unnamed'}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.account_type_key === 'super_admin' ? 'default' : 'secondary'} className="text-xs">
                          {u.account_type_label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1 text-sm">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          {u.enterprise_count}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={u.status === 'active'}
                            onCheckedChange={() => handleToggleStatus(u)}
                          />
                          <Badge variant={u.status === 'active' ? 'default' : 'destructive'} className="text-xs">
                            {u.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(u)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="text-sm">
                  {(form.full_name || editUser?.email || 'U').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{editUser?.email}</p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Joined {editUser && new Date(editUser.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-name">Full Name</Label>
              <Input id="u-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-phone">Phone</Label>
              <Input id="u-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Account Type</Label>
              <Select value={form.account_type_id} onValueChange={(v) => setForm({ ...form, account_type_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {accountTypes.map((at) => (
                    <SelectItem key={at.id} value={at.id}>{at.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
