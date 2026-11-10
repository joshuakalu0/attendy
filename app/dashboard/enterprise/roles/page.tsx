'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { toast } from 'sonner';
import { Plus, ShieldCheck, Trash2, Lock } from 'lucide-react';
import { usePermissions } from '@/lib/hooks/use-permissions';

interface Role {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
}

interface Permission {
  id: string;
  key: string;
  label: string;
  category: string;
}

export default function RolesPage() {
  const { activeWorkspace } = useAuth();
  const { can } = usePermissions();
  const enterpriseId = activeWorkspace?.enterprise_id;
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [userPermissionKeys, setUserPermissionKeys] = useState<string[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!enterpriseId) return;
    setLoading(true);
    const [rolesRes, permsRes, userPermsRes] = await Promise.all([
      supabase
        .from('roles')
        .select('id, name, description, is_system')
        .or(`is_system.eq.true,and(is_system.eq.false,enterprise_id.eq.${enterpriseId})`)
        .order('is_system', { ascending: false }),
      supabase.from('permissions').select('id, key, label, category').order('category'),
      supabase.rpc('get_user_permissions'),
    ]);

    if (rolesRes.data) setRoles(rolesRes.data);
    if (permsRes.data) setAllPermissions(permsRes.data);
    if (userPermsRes.data) setUserPermissionKeys(userPermsRes.data as string[]);
    setLoading(false);
  }, [enterpriseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateRole = async () => {
    if (!enterpriseId || !newRoleName) return;
    if (selectedPermissions.some((p) => !userPermissionKeys.includes(p))) {
      toast.error('You cannot grant permissions you do not have.');
      return;
    }

    const { data: role, error: roleError } = await supabase
      .from('roles')
      .insert({
        name: newRoleName,
        description: newRoleDesc,
        is_system: false,
        enterprise_id: enterpriseId,
      })
      .select()
      .single();

    if (roleError || !role) {
      toast.error('Failed to create role.');
      return;
    }

    const permRows = allPermissions
      .filter((p) => selectedPermissions.includes(p.key))
      .map((p) => ({ role_id: role.id, permission_id: p.id }));

    if (permRows.length > 0) {
      const { error: rpError } = await supabase.from('role_permissions').insert(permRows);
      if (rpError) {
        toast.error('Role created but failed to assign permissions.');
      }
    }

    toast.success(`Role "${newRoleName}" created.`);
    setNewRoleName('');
    setNewRoleDesc('');
    setSelectedPermissions([]);
    setCreateOpen(false);
    loadData();
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    const { error } = await supabase.from('roles').delete().eq('id', roleId);
    if (error) {
      toast.error('Failed to delete role. It may be assigned to employees.');
    } else {
      toast.success(`Role "${roleName}" deleted.`);
      loadData();
    }
  };

  if (!can('roles.manage')) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-500">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  const permissionsByCategory = allPermissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-slate-500">Manage roles and their permissions</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Custom Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="role-name">Role Name</Label>
                <Input
                  id="role-name"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g. Sales Manager"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role-desc">Description</Label>
                <Input
                  id="role-desc"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Brief description of this role"
                />
              </div>
              <div className="space-y-2">
                <Label>Permissions</Label>
                <p className="text-xs text-slate-500">
                  Only permissions you have can be assigned.
                </p>
                <div className="space-y-4 rounded-md border p-4">
                  {Object.entries(permissionsByCategory).map(([category, perms]) => (
                    <div key={category}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                        {category}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {perms.map((p) => {
                          const canAssign = userPermissionKeys.includes(p.key);
                          const isChecked = selectedPermissions.includes(p.key);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-center gap-2 rounded-md p-2 text-sm ${
                                canAssign ? 'cursor-pointer hover:bg-slate-50' : 'opacity-50'
                              }`}
                            >
                              <Checkbox
                                checked={isChecked}
                                disabled={!canAssign}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedPermissions([...selectedPermissions, p.key]);
                                  } else {
                                    setSelectedPermissions(selectedPermissions.filter((k) => k !== p.key));
                                  }
                                }}
                              />
                              <span>{p.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateRole} disabled={!newRoleName}>
                Create Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">All Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell className="flex items-center gap-2 font-medium">
                      <ShieldCheck className="h-4 w-4 text-slate-400" />
                      {role.name}
                    </TableCell>
                    <TableCell>
                      {role.is_system ? (
                        <Badge variant="secondary">
                          <Lock className="mr-1 h-3 w-3" />
                          System
                        </Badge>
                      ) : (
                        <Badge variant="outline">Custom</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {role.description || '—'}
                    </TableCell>
                    <TableCell>
                      {!role.is_system && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteRole(role.id, role.name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
