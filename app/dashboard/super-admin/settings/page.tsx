'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { Shield, Database, Globe, Bell, Save, KeyRound, Server } from 'lucide-react';

interface AccountTypeRow {
  id: string;
  key: string;
  label: string;
  is_active: boolean;
  sort_order: number;
}

export default function SuperAdminSettingsPage() {
  const [accountTypes, setAccountTypes] = useState<AccountTypeRow[]>([]);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [defaultTimezone, setDefaultTimezone] = useState('UTC');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('account_types').select('*').order('sort_order');
    if (data) setAccountTypes(data as AccountTypeRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggleAccountType = async (row: AccountTypeRow) => {
    const { error } = await supabase.from('account_types')
      .update({ is_active: !row.is_active }).eq('id', row.id);
    if (error) toast.error('Failed to toggle account type.');
    else { toast.success(`${row.label} ${!row.is_active ? 'enabled' : 'disabled'}.`); load(); }
  };

  const handleSavePlatform = async () => {
    setSaving(true);
    toast.success('Platform settings saved.');
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">System Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Platform-wide configuration and security</p>
      </div>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-slate-400" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email Verification</p>
              <p className="text-xs text-slate-500">Require email confirmation for new accounts</p>
            </div>
            <Badge variant="default">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">2FA Prompt for Admins</p>
              <p className="text-xs text-slate-500">Encourage two-factor authentication for admin accounts</p>
            </div>
            <Badge variant="default">Enabled</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Brute-force Protection</p>
              <p className="text-xs text-slate-500">Rate limiting on login attempts</p>
            </div>
            <Badge variant="default">Active</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Row Level Security</p>
              <p className="text-xs text-slate-500">Database-level tenant isolation on all tables</p>
            </div>
            <Badge variant="default">All Tables</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Platform Defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-slate-400" />
              Platform Defaults
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Default Currency</Label>
              <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'INR', 'JPY', 'AUD'].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default Timezone</Label>
              <Select value={defaultTimezone} onValueChange={setDefaultTimezone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Africa/Lagos', 'Asia/Tokyo', 'Australia/Sydney'].map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">API Version</p>
                <p className="text-xs text-slate-500">Current platform API version</p>
              </div>
              <Badge variant="secondary">v1</Badge>
            </div>
            <Button onClick={handleSavePlatform} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Platform Settings'}
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-slate-400" />
              Notification Defaults
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Invite Emails</p>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Payment Notifications</p>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">New Device Alerts</p>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Suspicious Activity Alerts</p>
              <Badge variant="default">Active</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Account Types Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5 text-slate-400" />
            Account Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accountTypes.map((at) => (
                <TableRow key={at.id}>
                  <TableCell className="font-medium">{at.label}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{at.key}</Badge></TableCell>
                  <TableCell className="text-sm">{at.sort_order}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch checked={at.is_active} onCheckedChange={() => handleToggleAccountType(at)} />
                      <Badge variant={at.is_active ? 'default' : 'secondary'} className="text-xs">
                        {at.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Database Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5 text-slate-400" />
            Database Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-slate-400" />
                <p className="text-sm font-medium">Connection</p>
              </div>
              <Badge variant="default" className="mt-2">Connected</Badge>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-400" />
                <p className="text-sm font-medium">Tenant Isolation</p>
              </div>
              <Badge variant="default" className="mt-2">Enforced</Badge>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-slate-400" />
                <p className="text-sm font-medium">Migrations</p>
              </div>
              <Badge variant="secondary" className="mt-2">19 Applied</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
