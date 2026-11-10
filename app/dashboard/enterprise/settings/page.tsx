'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Save, Building2 } from 'lucide-react';

export default function EnterpriseSettingsPage() {
  const { activeWorkspace } = useAuth();
  const { can } = usePermissions();
  const enterpriseId = activeWorkspace?.enterprise_id;
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!enterpriseId) return;
    (async () => {
      const { data } = await supabase
        .from('enterprises')
        .select('*')
        .eq('id', enterpriseId)
        .maybeSingle();
      if (data) {
        setName(data.name);
        setLogoUrl(data.logo_url || '');
        setContactEmail(data.contact_email || '');
        setContactPhone(data.contact_phone || '');
        setAddress(data.address || '');
        setTimezone(data.timezone);
        setCurrency(data.currency);
      }
      setLoading(false);
    })();
  }, [enterpriseId]);

  const handleSave = async () => {
    if (!enterpriseId) return;
    setSaving(true);
    const { error } = await supabase
      .from('enterprises')
      .update({
        name,
        logo_url: logoUrl || null,
        contact_email: contactEmail,
        contact_phone: contactPhone,
        address,
        timezone,
        currency,
      })
      .eq('id', enterpriseId);
    if (error) {
      toast.error('Failed to save settings.');
    } else {
      toast.success('Enterprise settings updated.');
    }
    setSaving(false);
  };

  if (!can('settings.edit')) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-500">You don&apos;t have permission to view this page.</p>
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Enterprise Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your organization profile</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-slate-400" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Enterprise Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">Logo URL</Label>
              <Input id="logo" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Contact Email</Label>
              <Input id="email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Contact Phone</Label>
              <Input id="phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Africa/Lagos', 'Asia/Tokyo', 'Australia/Sydney'].map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'INR', 'JPY', 'AUD'].map((cur) => (
                    <SelectItem key={cur} value={cur}>{cur}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
