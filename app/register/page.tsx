'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { AuthShell } from '@/components/marketing/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle, Building2, User } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [individualForm, setIndividualForm] = useState({
    fullName: '',
    email: '',
    password: '',
  });

  const [enterpriseForm, setEnterpriseForm] = useState({
    fullName: '',
    email: '',
    password: '',
    enterpriseName: '',
  });

  const passwordStrength = (pw: string): string | null => {
    if (pw.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(pw)) return 'Password must contain an uppercase letter.';
    if (!/[a-z]/.test(pw)) return 'Password must contain a lowercase letter.';
    if (!/[0-9]/.test(pw)) return 'Password must contain a number.';
    return null;
  };

  const registerIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const pwError = passwordStrength(individualForm.password);
    if (pwError) {
      setError(pwError);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: individualForm.email,
        password: individualForm.password,
        options: {
          data: { full_name: individualForm.fullName },
        },
      });

      if (error) {
        setError(error.message === 'User already registered'
          ? 'An account with this email already exists.'
          : error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Update profile with full name
        await supabase
          .from('profiles')
          .update({ full_name: individualForm.fullName })
          .eq('user_id', data.user.id);

        setSuccess('Account created! Please check your email to verify your account.');
        setLoading(false);
      }
    } catch {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  const registerEnterprise = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const pwError = passwordStrength(enterpriseForm.password);
    if (pwError) {
      setError(pwError);
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create auth user
      const { data, error } = await supabase.auth.signUp({
        email: enterpriseForm.email,
        password: enterpriseForm.password,
        options: {
          data: { full_name: enterpriseForm.fullName },
        },
      });

      if (error) {
        setError(error.message === 'User already registered'
          ? 'An account with this email already exists.'
          : error.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        const userId = data.user.id;

        // Step 2: Create enterprise, membership, and update profile atomically
        const { data: regResult, error: regError } = await supabase.rpc('register_enterprise', {
          p_user_id: userId,
          p_full_name: enterpriseForm.fullName,
          p_email: enterpriseForm.email,
          p_enterprise_name: enterpriseForm.enterpriseName,
        });

        if (regError || !(regResult as { success?: boolean })?.success) {
          setError(`Failed to create enterprise: ${regError?.message || 'Unknown error'}`);
          setLoading(false);
          return;
        }

        setSuccess('Enterprise account created! Please check your email to verify your account.');
        setLoading(false);
      }
    } catch {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Choose your account type to get started"
    >
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>Create a new account</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {success ? (
              <div className="space-y-4">
                <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
                  {success}
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => router.push('/login')}
                >
                  Go to Sign In
                </Button>
              </div>
            ) : (
              <Tabs defaultValue="individual">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="individual" className="gap-2">
                    <User className="h-4 w-4" />
                    Individual
                  </TabsTrigger>
                  <TabsTrigger value="enterprise" className="gap-2">
                    <Building2 className="h-4 w-4" />
                    Enterprise
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="individual">
                  <form onSubmit={registerIndividual} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ind-name">Full Name</Label>
                      <Input
                        id="ind-name"
                        value={individualForm.fullName}
                        onChange={(e) =>
                          setIndividualForm({ ...individualForm, fullName: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ind-email">Email</Label>
                      <Input
                        id="ind-email"
                        type="email"
                        value={individualForm.email}
                        onChange={(e) =>
                          setIndividualForm({ ...individualForm, email: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ind-password">Password</Label>
                      <Input
                        id="ind-password"
                        type="password"
                        value={individualForm.password}
                        onChange={(e) =>
                          setIndividualForm({ ...individualForm, password: e.target.value })
                        }
                        required
                      />
                      <p className="text-xs text-slate-600">
                        Min 8 characters with upper, lower, and number.
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Account
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="enterprise">
                  <form onSubmit={registerEnterprise} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ent-name">Your Name</Label>
                      <Input
                        id="ent-name"
                        value={enterpriseForm.fullName}
                        onChange={(e) =>
                          setEnterpriseForm({ ...enterpriseForm, fullName: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ent-company">Enterprise Name</Label>
                      <Input
                        id="ent-company"
                        value={enterpriseForm.enterpriseName}
                        onChange={(e) =>
                          setEnterpriseForm({
                            ...enterpriseForm,
                            enterpriseName: e.target.value,
                          })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ent-email">Email</Label>
                      <Input
                        id="ent-email"
                        type="email"
                        value={enterpriseForm.email}
                        onChange={(e) =>
                          setEnterpriseForm({ ...enterpriseForm, email: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ent-password">Password</Label>
                      <Input
                        id="ent-password"
                        type="password"
                        value={enterpriseForm.password}
                        onChange={(e) =>
                          setEnterpriseForm({ ...enterpriseForm, password: e.target.value })
                        }
                        required
                      />
                      <p className="text-xs text-slate-600">
                        Min 8 characters with upper, lower, and number.
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Enterprise Account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}

            <div className="mt-6 text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-indigo-700 underline-offset-4 hover:underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthShell>
  );
}
