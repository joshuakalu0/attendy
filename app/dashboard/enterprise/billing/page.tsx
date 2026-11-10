'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { supabase } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CreditCard, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  interval: string;
  max_employees: number | null;
  features: Record<string, boolean>;
  is_active: boolean;
}

interface Payment {
  id: string;
  amount_cents: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

export default function EnterpriseBillingPage() {
  const { activeWorkspace } = useAuth();
  const { can } = usePermissions();
  const enterpriseId = activeWorkspace?.enterprise_id;
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState('none');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!enterpriseId) return;
    setLoading(true);
    const [plansRes, entRes, paymentsRes] = await Promise.all([
      supabase.from('plans').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('enterprises').select('plan_id, subscription_status').eq('id', enterpriseId).maybeSingle(),
      supabase
        .from('payments')
        .select('id, amount_cents, currency, status, paid_at, created_at')
        .eq('enterprise_id', enterpriseId)
        .order('created_at', { ascending: false }),
    ]);

    if (plansRes.data) setPlans(plansRes.data);
    if (entRes.data) {
      setCurrentPlanId(entRes.data.plan_id);
      setSubscriptionStatus(entRes.data.subscription_status);
    }
    if (paymentsRes.data) setPayments(paymentsRes.data);
    setLoading(false);
  }, [enterpriseId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSelectPlan = async (planId: string) => {
    if (!enterpriseId) return;
    toast.info('Payment integration coming soon. The plan will be activated once Paystack is configured.');
  };

  if (!can('billing.view')) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-slate-500">You don&apos;t have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your subscription and payment history</p>
      </div>

      {/* Current Status */}
      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50">
              <CreditCard className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Current Status</p>
              <p className="text-lg font-bold capitalize">{subscriptionStatus}</p>
            </div>
          </div>
          <Badge variant={subscriptionStatus === 'active' ? 'default' : 'secondary'}>
            {subscriptionStatus}
          </Badge>
        </CardContent>
      </Card>

      {/* Plans */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Available Plans</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlanId;
              return (
                <Card
                  key={plan.id}
                  className={isCurrent ? 'border-primary ring-2 ring-primary/20' : ''}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      {isCurrent && <Badge>Current</Badge>}
                    </div>
                    <div className="mt-2">
                      <span className="text-2xl font-bold">
                        ${(plan.price_cents / 100).toFixed(2)}
                      </span>
                      <span className="text-sm text-slate-500">/{plan.interval}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-500">{plan.description}</p>
                    <ul className="mt-4 space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        {plan.max_employees === null ? 'Unlimited' : `Up to ${plan.max_employees}`} employees
                      </li>
                      {Object.entries(plan.features).map(([key, value]) =>
                        value ? (
                          <li key={key} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                          </li>
                        ) : null
                      )}
                    </ul>
                    {!isCurrent && can('billing.manage') && (
                      <Button
                        className="mt-4 w-full"
                        variant="outline"
                        onClick={() => handleSelectPlan(plan.id)}
                      >
                        Select Plan
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              No payments yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-sm">
                      {new Date(payment.paid_at || payment.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      ${(payment.amount_cents / 100).toFixed(2)} {payment.currency}
                    </TableCell>
                    <TableCell>
                      <Badge variant={payment.status === 'success' ? 'default' : 'secondary'}>
                        {payment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
