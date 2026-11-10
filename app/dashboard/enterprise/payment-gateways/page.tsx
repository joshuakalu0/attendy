'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  CreditCard,
  Wallet,
  Save,
  Landmark,
  Banknote,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';

interface PaymentGateway {
  id: string;
  gateway_key: 'stripe' | 'paystack' | 'flutterwave';
  display_name: string;
  is_enabled: boolean;
  api_key: string | null;
  api_secret: string | null;
  config: Record<string, string>;
}

interface GatewayMeta {
  key: 'stripe' | 'paystack' | 'flutterwave';
  label: string;
  description: string;
  icon: typeof CreditCard;
  keyLabel: string;
  secretLabel: string;
  keyPlaceholder: string;
  secretPlaceholder: string;
  helpUrl: string;
  color: string;
}

const GATEWAY_META: GatewayMeta[] = [
  {
    key: 'stripe',
    label: 'Stripe',
    description: 'Global payments in 135+ currencies. Best for international customers.',
    icon: CreditCard,
    keyLabel: 'Publishable Key',
    secretLabel: 'Secret Key',
    keyPlaceholder: 'pk_live_...',
    secretPlaceholder: 'sk_live_...',
    helpUrl: 'https://dashboard.stripe.com/apikeys',
    color: 'text-indigo-600',
  },
  {
    key: 'paystack',
    label: 'Paystack',
    description: 'Leading payment gateway for Nigeria, Ghana, Kenya, and South Africa.',
    icon: Landmark,
    keyLabel: 'Public Key',
    secretLabel: 'Secret Key',
    keyPlaceholder: 'pk_live_...',
    secretPlaceholder: 'sk_live_...',
    helpUrl: 'https://dashboard.paystack.com/#/settings/developer',
    color: 'text-teal-600',
  },
  {
    key: 'flutterwave',
    label: 'Flutterwave',
    description: 'Pan-African payments across 30+ countries with mobile money support.',
    icon: Banknote,
    keyLabel: 'Public Key',
    secretLabel: 'Secret Key',
    keyPlaceholder: 'FLWPUBK-...',
    secretPlaceholder: 'FLWSECK-...',
    helpUrl: 'https://dashboard.flutterwave.com/dashboard/settings/apis',
    color: 'text-orange-600',
  },
];

type GatewayState = {
  exists: boolean;
  id: string | null;
  is_enabled: boolean;
  api_key: string;
  api_secret: string;
  showSecret: boolean;
  saving: boolean;
};

export default function PaymentGatewaysPage() {
  const { activeWorkspace } = useAuth();
  const { can } = usePermissions();
  const enterpriseId = activeWorkspace?.enterprise_id;

  const [loading, setLoading] = useState(true);
  const [gateways, setGateways] = useState<Record<string, GatewayState>>({});

  const initStates = useCallback((): Record<string, GatewayState> => {
    const map: Record<string, GatewayState> = {};
    for (const meta of GATEWAY_META) {
      map[meta.key] = {
        exists: false,
        id: null,
        is_enabled: false,
        api_key: '',
        api_secret: '',
        showSecret: false,
        saving: false,
      };
    }
    return map;
  }, []);

  const load = useCallback(async () => {
    if (!enterpriseId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('enterprise_id', enterpriseId);

    if (error) {
      toast.error('Failed to load payment gateways.');
      setLoading(false);
      return;
    }

    const states = initStates();
    for (const row of (data || []) as PaymentGateway[]) {
      if (states[row.gateway_key]) {
        states[row.gateway_key] = {
          exists: true,
          id: row.id,
          is_enabled: row.is_enabled,
          api_key: row.api_key || '',
          api_secret: row.api_secret || '',
          showSecret: false,
          saving: false,
        };
      }
    }
    setGateways(states);
    setLoading(false);
  }, [enterpriseId, initStates]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (key: string, enable: boolean) => {
    const gw = gateways[key];
    if (!gw || !enterpriseId) return;

    if (enable && !gw.api_key) {
      toast.error('Enter API credentials before enabling this gateway.');
      return;
    }

    setGateways((prev) => ({
      ...prev,
      [key]: { ...prev[key], is_enabled: enable },
    }));

    if (gw.exists && gw.id) {
      const { error } = await supabase
        .from('payment_gateways')
        .update({ is_enabled: enable })
        .eq('id', gw.id);
      if (error) {
        toast.error('Failed to toggle gateway.');
        setGateways((prev) => ({
          ...prev,
          [key]: { ...prev[key], is_enabled: !enable },
        }));
      } else {
        toast.success(`${GATEWAY_META.find((m) => m.key === key)?.label} ${enable ? 'enabled' : 'disabled'}.`);
      }
    }
  };

  const handleSave = async (key: string) => {
    const gw = gateways[key];
    const meta = GATEWAY_META.find((m) => m.key === key);
    if (!gw || !meta || !enterpriseId) return;

    if (!gw.api_key || !gw.api_secret) {
      toast.error('Both API key and secret are required.');
      return;
    }

    setGateways((prev) => ({
      ...prev,
      [key]: { ...prev[key], saving: true },
    }));

    if (gw.exists && gw.id) {
      const { error } = await supabase
        .from('payment_gateways')
        .update({
          api_key: gw.api_key,
          api_secret: gw.api_secret,
          is_enabled: gw.is_enabled,
        })
        .eq('id', gw.id);
      if (error) {
        toast.error('Failed to save gateway settings.');
      } else {
        toast.success(`${meta.label} credentials updated.`);
      }
    } else {
      const { error } = await supabase
        .from('payment_gateways')
        .insert({
          enterprise_id: enterpriseId,
          gateway_key: key,
          display_name: meta.label,
          is_enabled: gw.is_enabled,
          api_key: gw.api_key,
          api_secret: gw.api_secret,
        });
      if (error) {
        toast.error(error.code === '23505' ? 'This gateway is already configured.' : 'Failed to add gateway.');
      } else {
        toast.success(`${meta.label} configured successfully.`);
        load();
      }
    }

    setGateways((prev) => ({
      ...prev,
      [key]: { ...prev[key], saving: false },
    }));
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

  const enabledCount = Object.values(gateways).filter((g) => g.is_enabled).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Wallet className="h-6 w-6 text-slate-400" />
          Payment Gateways
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure payment providers for subscription billing. Add API keys for any gateway and toggle them on or off.
        </p>
      </div>

      <Card className="border-slate-200 bg-slate-50/50">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">
              {enabledCount} gateway{enabledCount !== 1 ? 's' : ''} active
            </p>
            <p className="text-xs text-slate-500">
              At least one gateway must be enabled to accept subscription payments.
            </p>
          </div>
          {enabledCount === 0 && (
            <Badge variant="destructive" className="text-xs">No gateway enabled</Badge>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {GATEWAY_META.map((meta) => {
          const gw = gateways[meta.key];
          if (!gw) return null;
          const Icon = meta.icon;

          return (
            <Card key={meta.key} className={gw.is_enabled ? 'border-primary/30' : ''}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100`}>
                      <Icon className={`h-5 w-5 ${meta.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{meta.label}</CardTitle>
                      {gw.is_enabled ? (
                        <Badge variant="default" className="mt-0.5 text-xs">Enabled</Badge>
                      ) : (
                        <Badge variant="outline" className="mt-0.5 text-xs">Disabled</Badge>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={gw.is_enabled}
                    onCheckedChange={(v) => handleToggle(meta.key, v)}
                  />
                </div>
                <CardDescription className="mt-2 text-xs">{meta.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`${meta.key}-pk`} className="text-xs">{meta.keyLabel}</Label>
                  <Input
                    id={`${meta.key}-pk`}
                    value={gw.api_key}
                    onChange={(e) =>
                      setGateways((prev) => ({
                        ...prev,
                        [meta.key]: { ...prev[meta.key], api_key: e.target.value },
                      }))
                    }
                    placeholder={meta.keyPlaceholder}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${meta.key}-sk`} className="text-xs">{meta.secretLabel}</Label>
                  <div className="relative">
                    <Input
                      id={`${meta.key}-sk`}
                      type={gw.showSecret ? 'text' : 'password'}
                      value={gw.api_secret}
                      onChange={(e) =>
                        setGateways((prev) => ({
                          ...prev,
                          [meta.key]: { ...prev[meta.key], api_secret: e.target.value },
                        }))
                      }
                      placeholder={meta.secretPlaceholder}
                      className="pr-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setGateways((prev) => ({
                          ...prev,
                          [meta.key]: { ...prev[meta.key], showSecret: !prev[meta.key].showSecret },
                        }))
                      }
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {gw.showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <a
                    href={meta.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    Get API keys
                  </a>
                  <Button
                    size="sm"
                    onClick={() => handleSave(meta.key)}
                    disabled={gw.saving || (!gw.api_key && !gw.api_secret)}
                  >
                    {gw.saving ? (
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-3.5 w-3.5" />
                    )}
                    {gw.exists ? 'Update' : 'Save'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
