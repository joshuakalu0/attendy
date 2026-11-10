'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { AuthShell } from '@/components/marketing/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token');

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<{
    email: string;
    enterprise_name: string;
    role_name: string;
    expires_at: string;
  } | null>(null);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link.');
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('invites')
        .select(`
          email, expires_at, status,
          enterprises!inner(name),
          roles!inner(name)
        `)
        .eq('token', token)
        .maybeSingle();

      if (error || !data) {
        setError('Invitation not found or invalid.');
        setLoading(false);
        return;
      }

      const inv = data as unknown as {
        email: string;
        expires_at: string;
        status: string;
        enterprises: { name: string };
        roles: { name: string };
      };

      if (inv.status === 'accepted') {
        setError('This invitation has already been accepted.');
        setLoading(false);
        return;
      }

      if (new Date(inv.expires_at) < new Date()) {
        setError('This invitation has expired.');
        setLoading(false);
        return;
      }

      setInvite({
        email: inv.email,
        enterprise_name: inv.enterprises.name,
        role_name: inv.roles.name,
        expires_at: inv.expires_at,
      });
      setLoading(false);
    })();
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      setError('Password must contain uppercase, lowercase, and a number.');
      return;
    }

    setSubmitting(true);
    try {
      // Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invite!.email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (signUpError) {
        setError(
          signUpError.message === 'User already registered'
            ? 'An account with this email already exists. Please sign in first.'
            : signUpError.message
        );
        setSubmitting(false);
        return;
      }

      if (authData.user) {
        const userId = authData.user.id;

        // Update profile
        await supabase
          .from('profiles')
          .update({ full_name: fullName, account_type_id: null })
          .eq('user_id', userId);

        // Get the invite details to create membership
        const { data: inviteData } = await supabase
          .from('invites')
          .select('enterprise_id, role_id')
          .eq('token', token)
          .maybeSingle();

        if (inviteData) {
          // Create membership
          await supabase.from('memberships').insert({
            user_id: userId,
            enterprise_id: inviteData.enterprise_id,
            role_id: inviteData.role_id,
            status: 'active',
          });

          // Mark invite as accepted
          await supabase
            .from('invites')
            .update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: userId })
            .eq('token', token);
        }

        setSuccess(true);
      }
    } catch {
      setError('An error occurred. Please try again.');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error && !invite) {
    return (
      <AuthShell title="Invitation error">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
            </div>
            <p className="mt-4 text-center text-sm text-slate-600">{error}</p>
            <Button variant="outline" className="mt-6" onClick={() => router.push('/login')}>
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  if (success) {
    return (
      <AuthShell title="Welcome to the team!">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-6 w-6 text-green-700" aria-hidden="true" />
            </div>
            <p className="mt-4 text-center text-sm text-slate-600">
              Your account has been created. Please check your email to verify your account, then sign in.
            </p>
            <Button className="mt-6" onClick={() => router.push('/login')}>
              Continue to Sign In
            </Button>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Accept invitation"
      subtitle={`You've been invited to join ${invite?.enterprise_name} as ${invite?.role_name}`}
    >
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Create Your Account</CardTitle>
            <CardDescription>Set up your password to join the team</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                {error}
              </div>
            )}
            <form onSubmit={handleAccept} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={invite?.email || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="text-xs text-slate-600">Min 8 characters with upper, lower, and number.</p>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                Accept & Create Account
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
