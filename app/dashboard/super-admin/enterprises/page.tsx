'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, Building2, Pencil, Users, MapPin, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface Enterprise {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  currency: string;
  timezone: string;
  subscription_status: string;
  is_active: boolean;
  created_at: string;
  owner_email: string | null;
  member_count: number;
  branch_count: number;
}

interface EditForm {
  name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  currency: string;
  timezone: string;
  is_active: boolean;
}

export default function SuperAdminEnterprisesPage() {
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editEnt, setEditEnt] = useState<Enterprise | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<EditForm>({
    name: '', contact_email: '', contact_phone: '', address: '',
    currency: 'USD', timezone: 'UTC', is_active: true,
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('enterprises')
      .select('id, name, contact_email, contact_phone, address, currency, timezone, subscription_status, is_active, created_at, owner_id')
      .order('created_at', { ascending: false });

    if (data) {
      const ownerIds = data.map((e) => e.owner_id).filter(Boolean) as string[];
      const memberEntIds = data.map((e) => e.id);
      const branchEntIds = data.map((e) => e.id);

      const [ownerRes, memberRes, branchRes] = await Promise.all([
        ownerIds.length > 0
          ? supabase.from('profiles').select('user_id, email').in('user_id', ownerIds)
          : Promise.resolve({ data: [] as Array<{ user_id: string; email: string }> }),
        memberEntIds.length > 0
          ? supabase.from('memberships').select('enterprise_id').in('enterprise_id', memberEntIds).eq('status', 'active')
          : Promise.resolve({ data: [] as Array<{ enterprise_id: string }> }),
        branchEntIds.length > 0
          ? supabase.from('branches').select('enterprise_id').in('enterprise_id', branchEntIds)
          : Promise.resolve({ data: [] as Array<{ enterprise_id: string }> }),
      ]);

      const ownerMap = new Map((ownerRes.data || []).map((o) => [o.user_id, o.email]));
      const memberCounts = new Map<string, number>();
      for (const m of (memberRes.data || [])) {
        memberCounts.set(m.enterprise_id, (memberCounts.get(m.enterprise_id) || 0) + 1);
      }
      const branchCounts = new Map<string, number>();
      for (const b of (branchRes.data || [])) {
        branchCounts.set(b.enterprise_id, (branchCounts.get(b.enterprise_id) || 0) + 1);
      }

      setEnterprises(data.map((e) => ({
        id: e.id,
        name: e.name,
        contact_email: e.contact_email,
        contact_phone: e.contact_phone,
        address: e.address,
        currency: e.currency,
        timezone: e.timezone,
        subscription_status: e.subscription_status,
        is_active: e.is_active,
        created_at: e.created_at,
        owner_email: e.owner_id ? ownerMap.get(e.owner_id) || null : null,
        member_count: memberCounts.get(e.id) || 0,
        branch_count: branchCounts.get(e.id) || 0,
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = enterprises.filter(
    (e) =>
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      (e.contact_email?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const handleEdit = (ent: Enterprise) => {
    setEditEnt(ent);
    setForm({
      name: ent.name,
      contact_email: ent.contact_email || '',
      contact_phone: ent.contact_phone || '',
      address: ent.address || '',
      currency: ent.currency,
      timezone: ent.timezone,
      is_active: ent.is_active,
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editEnt) return;
    setSaving(true);
    const { error } = await supabase.from('enterprises').update({
      name: form.name,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      address: form.address || null,
      currency: form.currency,
      timezone: form.timezone,
      is_active: form.is_active,
    }).eq('id', editEnt.id);
    if (error) {
      toast.error('Failed to update enterprise.');
    } else {
      toast.success('Enterprise updated.');
      setEditOpen(false);
      setEditEnt(null);
      load();
    }
    setSaving(false);
  };

  const handleToggleActive = async (ent: Enterprise) => {
    const { error } = await supabase.from('enterprises')
      .update({ is_active: !ent.is_active }).eq('id', ent.id);
    if (error) {
      toast.error('Failed to toggle status.');
    } else {
      toast.success(`${ent.name} ${!ent.is_active ? 'activated' : 'deactivated'}.`);
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Enterprises</h1>
        <p className="mt-1 text-sm text-slate-500">Manage all organizations on the platform</p>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search enterprises..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No enterprises found.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Branches</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        {e.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{e.owner_email || '—'}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {e.member_count}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        {e.branch_count}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{e.subscription_status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={e.is_active}
                          onCheckedChange={() => handleToggleActive(e)}
                        />
                        <Badge variant={e.is_active ? 'default' : 'destructive'} className="text-xs">
                          {e.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {new Date(e.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(e)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-slate-400" />
              Edit Enterprise
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ent-name">Name</Label>
              <Input id="ent-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="ent-email">Contact Email</Label>
                <Input id="ent-email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ent-phone">Contact Phone</Label>
                <Input id="ent-phone" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ent-address">Address</Label>
              <Input id="ent-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="ent-active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label htmlFor="ent-active">Enterprise is active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.name}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
