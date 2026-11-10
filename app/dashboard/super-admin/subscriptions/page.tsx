'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, Pencil, Briefcase, Calendar, X } from 'lucide-react';
import { toast } from 'sonner';

interface Subscription {
  id: string;
  status: string;
  current_period_end: string | null;
  created_at: string;
  plan_id: string;
  plan_name: string;
  enterprise_id: string | null;
  enterprise_name: string | null;
}

interface Plan {
  id: string;
  name: string;
}

export default function SuperAdminSubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editPlanId, setEditPlanId] = useState('');
  const [editPeriodEnd, setEditPeriodEnd] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [subRes, planRes] = await Promise.all([
      supabase.from('subscriptions')
        .select('id, status, current_period_end, created_at, plan_id, plans!inner(name), enterprises(name)')
        .order('created_at', { ascending: false }),
      supabase.from('plans').select('id, name').eq('is_active', true).order('sort_order'),
    ]);

    if (planRes.data) setPlans(planRes.data as Plan[]);
    if (subRes.data) {
      setSubs(subRes.data.map((s: Record<string, unknown>) => ({
        id: s.id as string,
        status: s.status as string,
        current_period_end: s.current_period_end as string | null,
        created_at: s.created_at as string,
        plan_id: s.plan_id as string,
        plan_name: (s.plans as { name: string })?.name || '—',
        enterprise_id: s.enterprise_id as string | null,
        enterprise_name: (s.enterprises as { name: string } | null)?.name || null,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = subs.filter((s) => {
    const matchesSearch = !search ||
      (s.enterprise_name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      s.plan_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (sub: Subscription) => {
    setEditSub(sub);
    setEditStatus(sub.status);
    setEditPlanId(sub.plan_id);
    setEditPeriodEnd(sub.current_period_end ? sub.current_period_end.split('T')[0] : '');
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editSub) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      status: editStatus,
      plan_id: editPlanId,
    };
    if (editPeriodEnd) {
      payload.current_period_end = new Date(editPeriodEnd + 'T23:59:59').toISOString();
    }
    const { error } = await supabase.from('subscriptions').update(payload).eq('id', editSub.id);
    if (error) {
      toast.error('Failed to update subscription.');
    } else {
      toast.success('Subscription updated.');
      setEditOpen(false);
      setEditSub(null);
      load();
    }
    setSaving(false);
  };

  const handleCancel = async (sub: Subscription) => {
    const { error } = await supabase.from('subscriptions')
      .update({ status: 'canceled' }).eq('id', sub.id);
    if (error) toast.error('Failed to cancel subscription.');
    else { toast.success('Subscription canceled.'); load(); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <p className="mt-1 text-sm text-slate-500">Manage all platform subscriptions — change plans, extend, or cancel</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by enterprise or plan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trialing">Trial</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No subscriptions found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Enterprise</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Period End</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-slate-400" />
                        {s.enterprise_name || 'Individual'}
                      </div>
                    </TableCell>
                    <TableCell>{s.plan_name}</TableCell>
                    <TableCell>
                      <Badge variant={
                        s.status === 'active' ? 'default' :
                        s.status === 'canceled' ? 'destructive' :
                        s.status === 'past_due' ? 'destructive' : 'secondary'
                      } className="text-xs capitalize">
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(s.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(s)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {s.status !== 'canceled' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleCancel(s)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-sm font-medium">{editSub?.enterprise_name || 'Individual'}</p>
              <p className="text-xs text-slate-500">Current plan: {editSub?.plan_name}</p>
            </div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <Select value={editPlanId} onValueChange={setEditPlanId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trialing">Trial</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="period-end">Period End Date</Label>
              <Input id="period-end" type="date" value={editPeriodEnd} onChange={(e) => setEditPeriodEnd(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !editPlanId}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
