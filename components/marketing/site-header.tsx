'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Layers, Menu, X } from 'lucide-react';
import { usePointerGlow } from './motion';

export const MARKETING_NAV = [
  { label: 'Features', href: '/features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Blog', href: '/blog' },
  { label: 'Help', href: '/help' },
];

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Platform home">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${light ? 'bg-white' : 'bg-slate-900'}`}>
        <Layers className={`h-5 w-5 ${light ? 'text-slate-900' : 'text-white'}`} aria-hidden="true" />
      </div>
      <span className={`text-lg font-semibold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
        Platform
      </span>
    </Link>
  );
}

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  usePointerGlow();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav aria-label="Main navigation" className="hidden md:flex items-center gap-6">
          {MARKETING_NAV.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="underline-hover text-sm text-slate-600 transition-colors duration-150 hover:text-slate-900"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden sm:block">
            <span className="inline-flex h-11 sm:h-10 items-center rounded-md px-4 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900">
              Sign in
            </span>
          </Link>
          <Link href="/register">
            <span className="inline-flex h-11 sm:h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-700">
              Get Started
            </span>
          </Link>
          <button
            type="button"
            className="inline-flex h-11 sm:h-10 w-11 sm:w-10 items-center justify-center rounded-md text-slate-600 transition-colors duration-150 hover:bg-slate-100 md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Mobile navigation"
          className="border-t border-slate-200 bg-white px-4 py-3 md:hidden"
        >
          {MARKETING_NAV.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="block py-2 text-sm text-slate-600 hover:text-slate-900"
            >
              {l.label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setMenuOpen(false)} className="block py-2 text-sm font-medium text-slate-900">
            Sign in
          </Link>
        </nav>
      )}
    </header>
  );
}
