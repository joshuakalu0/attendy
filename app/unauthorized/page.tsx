'use client';

import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AuthShell } from '@/components/marketing/auth-shell';

export default function UnauthorizedPage() {
  return (
    <AuthShell title="Access denied">
      <div className="flex flex-col items-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="h-8 w-8 text-destructive" aria-hidden="true" />
        </div>
        <p className="mt-4 text-center text-sm text-slate-600">
          You don&apos;t have permission to view this page.
        </p>
        <Link href="/" className="mt-6">
          <Button variant="outline">Go Home</Button>
        </Link>
      </div>
    </AuthShell>
  );
}
