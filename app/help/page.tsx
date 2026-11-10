'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, ChevronRight, ShieldCheck, Users, Building2, KeyRound, ArrowRight } from 'lucide-react';
import SiteHeader from '@/components/marketing/site-header';
import SiteFooter from '@/components/marketing/site-footer';
import PageHeader from '@/components/marketing/page-header';
import { Reveal, Tilt3D, useSpotlight } from '@/components/marketing/motion';

const CATEGORIES = [
  {
    icon: KeyRound,
    title: 'Authentication',
    chip: 'bg-indigo-50 text-indigo-700',
    articles: ['Configure session lifetimes', 'Enable email verification', 'Reset a locked account'],
  },
  {
    icon: Users,
    title: 'Roles & Access',
    chip: 'bg-slate-100 text-slate-700',
    articles: ['Create a custom role', 'Assign capabilities', 'Understand permission resolution'],
  },
  {
    icon: Building2,
    title: 'Enterprises',
    chip: 'bg-indigo-50 text-indigo-700',
    articles: ['Invite employees in bulk', 'Set up departments', 'Transfer enterprise ownership'],
  },
  {
    icon: ShieldCheck,
    title: 'Security & Audit',
    chip: 'bg-slate-100 text-slate-700',
    articles: ['Read the audit log', 'Revoke all sessions', 'Respond to a security report'],
  },
];

const POPULAR = [
  'Create a custom role',
  'Configure session lifetimes',
  'Invite employees in bulk',
  'Understand permission resolution',
  'Read the audit log',
  'Enable email verification',
  'Revoke all sessions',
  'Set up departments',
];

export default function HelpPage() {
  const [query, setQuery] = useState('');
  const results = POPULAR.filter((a) => a.toLowerCase().includes(query.trim().toLowerCase()));
  useSpotlight();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main>
        <PageHeader
          eyebrow="Help Center"
          title="Find answers fast"
          subtitle="Search the guides, browse by category, or reach the support line — most integration questions are answered in under two minutes."
        />

        {/* Search */}
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 md:pt-20 lg:px-8">
          <div className="relative mx-auto max-w-2xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input
              type="search"
              className="h-12 w-full rounded-md border border-slate-300 bg-white pl-12 pr-4 text-sm text-slate-900 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Search help articles…"
              aria-label="Search help articles"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </section>

        {/* Category directory */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <h2 className="mb-6 text-2xl font-semibold tracking-[-0.02em] text-slate-900">Browse by category</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((cat, i) => (
              <Reveal key={cat.title} delay={i * 80}>
                <Tilt3D max={7} glare={false}>
                  <div data-spotlight className="h-full rounded-xl border border-slate-200 bg-white p-6 transition-colors duration-200 hover:border-slate-300">
                    <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg ${cat.chip}`}>
                      <cat.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h3 className="mb-3 font-semibold text-slate-900">{cat.title}</h3>
                    <ul className="space-y-2">
                      {cat.articles.map((a) => (
                        <li key={a}>
                          <Link
                            href="/blog/rls-everywhere"
                            className="text-sm text-slate-600 underline-offset-4 transition-colors duration-150 hover:text-slate-900 hover:underline"
                          >
                            {a}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Tilt3D>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Popular / search results */}
        <section className="border-y border-slate-200 bg-slate-50 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
              <h2 className="mb-6 text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                {query.trim() ? 'Search results' : 'Frequently viewed'}
              </h2>
              <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                {results.map((a) => (
                  <Link key={a} href="/blog/rls-everywhere" className="group flex items-center justify-between px-5 py-4">
                    <span className="text-sm text-slate-700 underline-offset-4 group-hover:text-slate-900 group-hover:underline">{a}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                  </Link>
                ))}
                {results.length === 0 && (
                  <p className="px-5 py-6 text-center text-sm text-slate-600">
                    No articles match “{query}”. Try a different term or contact support below.
                  </p>
                )}
              </div>
              <div className="mt-6 flex items-center gap-2">
                <span className="status-pulse h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                <p className="text-sm text-slate-600">All systems operational · updated 2 minutes ago</p>
              </div>
            </div>
          </div>
        </section>

        {/* Escalation */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mx-auto flex max-w-3xl flex-col items-start justify-between gap-6 rounded-xl border border-slate-200 bg-white p-8 md:flex-row md:items-center md:p-10">
            <div>
              <h2 className="mb-1 text-xl font-semibold tracking-[-0.02em] text-slate-900 md:text-2xl">
                Still stuck?
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-slate-600">
                Support is staffed by engineers who deploy the shell themselves. One business day, guaranteed.
              </p>
            </div>
            <Link
              href="/contact"
              className="inline-flex h-11 sm:h-10 shrink-0 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-700"
            >
              Contact Support <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
