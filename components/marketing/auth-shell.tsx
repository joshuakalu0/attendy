import Link from 'next/link';
import { Layers } from 'lucide-react';
import { Reveal } from './motion';

export function AuthShell({
  children,
  title,
  subtitle,
  width = 'md',
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  width?: 'md' | 'lg';
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2" aria-label="Platform home">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
              <Layers className="h-5 w-5 text-white" aria-hidden="true" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-slate-900">Platform</span>
          </Link>
          <Link href="/" className="text-sm text-slate-600 transition-colors duration-150 hover:text-slate-900">
            Back to home
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Reveal className={`w-full ${width === 'lg' ? 'max-w-lg' : 'max-w-md'}`}>
          <div className="mb-8 flex flex-col items-center text-center">
            <h1 className="text-2xl font-semibold tracking-[-0.01em] text-slate-900">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
          </div>
          {children}
        </Reveal>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4">
        <p className="text-center text-xs text-slate-600">
          © 2026 Platform · Terms of Service · Privacy Policy
        </p>
      </footer>
    </div>
  );
}
