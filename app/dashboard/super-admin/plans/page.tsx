'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, CreditCard, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  interval: string;
  max_employees: number | null;
  max_meetings: number | null;
  features: Record<string, boolean> | null;
  is_active: boolean;
  sort_order: number;
  subscriber_count: number;
}

interface PlanForm {
  name: string;
  description: string;
  price_cents: string;
  currency: string;
  interval: string;
  max_employees: string;
  max_meetings: string;
  is_active: boolean;
}

const DEFAULT_FORM: PlanForm = {
  name: '', description: '', price_cents: '0', currency: 'USD',
  interval: 'monthly', max_employees: '', max_meetings: '5', is_active: true,
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'INR', 'JPY', 'AUD'];
const INTERVALS = ['monthly', 'quarterly', 'yearly', 'lifetime'];

export default function SuperAdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<PlanForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('plans').select('*').order('sort_order');
    if (data) {
      const planIds = data.map((p) => p.id);
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('plan_id')
        .in('plan_id', planIds);

      const subCounts = new Map<string, number>();
      for (const s of (subData || [])) {
        if (s.plan_id) subCounts.set(s.plan_id, (subCounts.get(s.plan_id) || 0) + 1);
      }

      setPlans(data.map((p) => ({
        ...p,
        subscriber_count: subCounts.get(p.id) || 0,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setEditPlan(null);
  };

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      price_cents: parseInt(form.price_cents) || 0,
      currency: form.currency,
      interval: form.interval,
      max_employees: form.max_employees ? parseInt(form.max_employees) : null,
      max_meetings: form.max_meetings ? parseInt(form.max_meetings) : null,
      is_active: form.is_active,
    };

    if (editPlan) {
      const { error } = await supabase.from('plans').update(payload).eq('id', editPlan.id);
      if (error) toast.error('Failed to update plan.');
      else { toast.success('Plan updated.'); setCreateOpen(false); resetForm(); load(); }
    } else {
      const { error } = await supabase.from('plans').insert({ ...payload, sort_order: plans.length + 1 });
      if (error) toast.error('Failed to create plan.');
      else { toast.success('Plan created.'); setCreateOpen(false); resetForm(); load(); }
    }
    setSaving(false);
  };

  const handleEdit = (plan: Plan) => {
    setEditPlan(plan);
    setForm({
      name: plan.name,
      description: plan.description || '',
      price_cents: String(plan.price_cents),
      currency: plan.currency,
      interval: plan.interval,
      max_employees: plan.max_employees ? String(plan.max_employees) : '',
      max_meetings: plan.max_meetings != null ? String(plan.max_meetings) : '5',
      is_active: plan.is_active,
    });
    setCreateOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('plans').delete().eq('id', deleteTarget.id);
    if (error) {
      toast.error('Cannot delete plan — it may have active subscriptions.');
    } else {
      toast.success('Plan deleted.');
      setDeleteTarget(null);
      load();
    }
  };

  const handleToggleActive = async (plan: Plan) => {
    const { error } = await supabase.from('plans')
      .update({ is_active: !plan.is_active }).eq('id', plan.id);
    if (error) toast.error('Failed to toggle plan.');
    else { toast.success(`${plan.name} ${!plan.is_active ? 'activated' : 'deactivated'}.`); load(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plans</h1>
          <p className="mt-1 text-sm text-slate-500">Manage subscription plans available to users and enterprises</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editPlan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="plan-name">Plan Name</Label>
                <Input id="plan-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Pro, Enterprise, Free" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-desc">Description</Label>
                <Input id="plan-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Short description shown to users" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="plan-price">Price (in cents)</Label>
                  <Input id="plan-price" type="number" value={form.price_cents} onChange={(e) => setForm({ ...form, price_cents: e.target.value })} />
                  <p className="text-xs text-slate-400">${(parseInt(form.price_cents) / 100).toFixed(2)}</p>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Billing Interval</Label>
                  <Select value={form.interval} onValueChange={(v) => setForm({ ...form, interval: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INTERVALS.map((i) => <SelectItem key={i} value={i} className="capitalize">{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plan-max-emp">Max Employees (blank = unlimited)</Label>
                  <Input id="plan-max-emp" type="number" value={form.max_employees} onChange={(e) => setForm({ ...form, max_employees: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plan-max-meet">Max Meetings (lite users, blank = unlimited)</Label>
                <Input id="plan-max-meet" type="number" value={form.max_meetings} onChange={(e) => setForm({ ...form, max_meetings: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch id="plan-active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label htmlFor="plan-active">Plan is available for subscription</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving || !form.name}>
                {saving ? 'Saving...' : editPlan ? 'Update Plan' : 'Create Plan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          New Plan
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : plans.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No plans configured yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead>Limits</TableHead>
                  <TableHead>Subscribers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="font-medium">{plan.name}</p>
                          {plan.description && <p className="text-xs text-slate-400">{plan.description}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {(plan.price_cents / 100).toFixed(2)} {plan.currency}
                    </TableCell>
                    <TableCell className="capitalize">{plan.interval}</TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {plan.max_employees ? `${plan.max_employees} emp` : 'Unlimited emp'}
                      {' · '}
                      {plan.max_meetings != null ? `${plan.max_meetings} meetings` : 'Unlimited meetings'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{plan.subscriber_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={plan.is_active} onCheckedChange={() => handleToggleActive(plan)} />
                        <Badge variant={plan.is_active ? 'default' : 'secondary'} className="text-xs">
                          {plan.is_active ? 'Active' : 'Hidden'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(plan)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteTarget(plan)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Plan</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600 py-2">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
            {deleteTarget && deleteTarget.subscriber_count > 0 && (
              <span className="block mt-2 text-destructive">
                This plan has {deleteTarget.subscriber_count} active subscriber(s). They will lose their subscription.
              </span>
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
