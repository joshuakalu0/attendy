'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Department {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
}

export default function DepartmentsPage() {
  const { activeWorkspace } = useAuth();
  const enterpriseId = activeWorkspace?.enterprise_id;
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    if (!enterpriseId) return;
    setLoading(true);
    const { data } = await supabase
      .from('departments')
      .select('id, name, description')
      .eq('enterprise_id', enterpriseId)
      .order('name');

    if (data) {
      const withCounts = await Promise.all(
        data.map(async (d) => {
          const { count } = await supabase
            .from('department_members')
            .select('id', { count: 'exact' })
            .eq('department_id', d.id);
          return { ...d, member_count: count || 0 };
        })
      );
      setDepartments(withCounts);
    }
    setLoading(false);
  }, [enterpriseId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!enterpriseId || !name) return;
    const { error } = await supabase.from('departments').insert({
      enterprise_id: enterpriseId,
      name,
      description,
    });
    if (error) {
      toast.error(error.code === '23505' ? 'A department with this name already exists.' : 'Failed to create department.');
    } else {
      toast.success(`Department "${name}" created.`);
      setName('');
      setDescription('');
      setCreateOpen(false);
      load();
    }
  };

  const handleDelete = async (id: string, deptName: string) => {
    const { error } = await supabase.from('departments').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete department.');
    } else {
      toast.success(`Department "${deptName}" deleted.`);
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Departments</h1>
          <p className="mt-1 text-sm text-slate-500">Organize your team into departments</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Department</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="dept-name">Name</Label>
                <Input id="dept-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dept-desc">Description</Label>
                <Input id="dept-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreate} disabled={!name}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : departments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="h-12 w-12 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">No departments yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <Card key={dept.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-slate-400" />
                    <CardTitle className="text-base">{dept.name}</CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDelete(dept.id, dept.name)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {dept.description && (
                  <p className="mb-3 text-sm text-slate-500">{dept.description}</p>
                )}
                <Badge variant="secondary">
                  <Users className="mr-1 h-3 w-3" />
                  {dept.member_count} member{dept.member_count !== 1 ? 's' : ''}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
