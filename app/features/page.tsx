'use client';

import Link from 'next/link';
import { ArrowRight, Shield, KeyRound, FileCheck, Star, Check } from 'lucide-react';
import SiteHeader from '@/components/marketing/site-header';
import SiteFooter from '@/components/marketing/site-footer';
import PageHeader from '@/components/marketing/page-header';
import { Reveal, Tilt3D, Magnetic, useSpotlight, useScrollLean } from '@/components/marketing/motion';

const FEATURE_ROWS = [
  {
    icon: KeyRound,
    chip: 'bg-indigo-50 text-indigo-700',
    title: 'One permission check, everywhere',
    desc: 'A single permission resolver gates routes, server actions, and UI elements. Add a capability once and every layer honors it.',
    bullets: ['System and custom roles', 'Frontend + backend from one source', 'Change a role, see it propagate'],
    mock: (
      <div className="rounded-xl border border-slate-200 bg-white p-5" aria-hidden="true">
        <p className="mb-3 text-sm font-medium text-slate-900">Permission: attendance.reports.view</p>
        <div className="space-y-2">
          {[
            ['Super Admin', 'Allowed'],
            ['Enterprise Admin', 'Allowed'],
            ['Manager', 'Allowed'],
            ['Staff', 'Denied'],
          ].map(([role, verdict]) => (
            <div key={role} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5">
              <span className="text-sm text-slate-700">{role}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${verdict === 'Allowed' ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                {verdict}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Shield,
    chip: 'bg-slate-100 text-slate-700',
    title: 'Isolation enforced by the database',
    desc: 'Row Level Security policies ship with every migration. A forgotten WHERE clause in application code cannot leak another tenant\'s data.',
    bullets: ['FORCE RLS on tenant tables', 'Postgres-enforced, not app-enforced', 'Safe-by-default query layer'],
    mock: (
      <div className="rounded-xl border border-slate-200 bg-white p-5" aria-hidden="true">
        <div className="rounded-lg bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-300">
          <p><span className="text-indigo-300">ALTER TABLE</span> employees</p>
          <p className="pl-4"><span className="text-indigo-300">ENABLE FORCE ROW LEVEL SECURITY</span>;</p>
          <p className="mt-2">-- enterprise_id must match the session tenant</p>
          <p className="text-slate-500">→ 22 tables protected</p>
        </div>
      </div>
    ),
  },
  {
    icon: FileCheck,
    chip: 'bg-indigo-50 text-indigo-700',
    title: 'Invitations, verified end to end',
    desc: 'Employee invites carry signed, expiring tokens. Acceptance sets the password, joins the tenant, and writes the audit entry.',
    bullets: ['HMAC-signed invite tokens', 'Expiry and single-use semantics', 'Full audit trail on acceptance'],
    mock: (
      <div className="rounded-xl border border-slate-200 bg-white p-5" aria-hidden="true">
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-indigo-700" />
          <span className="text-sm font-medium text-slate-900">Invite: ada@northwindlabs.com</span>
        </div>
        <div className="space-y-2">
          {['Token verified', 'Role assigned: Manager', 'Audit entry written'].map((row) => (
            <div key={row} className="flex items-center gap-2 text-sm text-slate-700">
              <Check2 />
              {row}
            </div>
          ))}
        </div>
      </div>
    ),
  },
];

function Check2() {
  return <Check className="h-4 w-4 text-indigo-700 shrink-0" aria-hidden="true" />;
}

export default function FeaturesPage() {
  useSpotlight();
  useScrollLean();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main>
        <PageHeader
          eyebrow="Features"
          title="Access control your auditors can read"
          subtitle="A deep dive into the RBAC and multi-tenancy engine at the core of Platform — from role resolution to database-enforced isolation."
        />

        {/* Architecture demo */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-hidden="true">
            <div className="flex h-10 items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-4">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              <span className="ml-3 text-xs text-slate-500">platform.app/dashboard/enterprise/roles</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr]">
              <div className="hidden flex-col gap-1 border-r border-slate-200 bg-slate-50 p-4 md:flex">
                {['Dashboard', 'Employees', 'Roles', 'Departments', 'Billing', 'Settings'].map((item, i) => (
                  <div
                    key={item}
                    className={`rounded-md px-3 py-2 text-sm ${
                      i === 2 ? 'border border-slate-200 bg-white font-medium text-slate-900' : 'text-slate-600'
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className="p-4 md:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">Roles &amp; Permissions</p>
                    <p className="text-sm text-slate-600">6 system roles · 3 custom roles</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    RLS enforced
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    ['Super Admin', 'Full platform control'],
                    ['Enterprise Owner', 'Owns tenant, billing, roles'],
                    ['Enterprise Admin', 'Employees, departments, invites'],
                    ['Manager', 'Team schedules and reports'],
                    ['Staff', 'Own attendance and profile'],
                    ['Normal User', 'Personal account only'],
                  ].map(([role, scope]) => (
                    <div key={role} className="rounded-lg border border-slate-200 px-4 py-3">
                      <p className="text-sm font-medium text-slate-900">{role}</p>
                      <p className="text-xs text-slate-600">{scope}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stacking cards on scroll (stacking-cards-scroll unit — max 1 per page) */}
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 md:pb-20 lg:px-8">
          <div className="relative">
            {FEATURE_ROWS.map((row, i) => (
              <div
                key={row.title}
                className="stack-card mb-8"
                style={{ ['--stack-i' as string]: i }}
              >
                <Tilt3D max={4} glare={false}>
                  <div data-spotlight className="flex min-h-[60vh] items-center rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
                    <div className="grid w-full grid-cols-1 items-center gap-8 md:grid-cols-2 md:gap-12">
                      <div>
                        <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg ${row.chip}`}>
                          <row.icon className="h-5 w-5" aria-hidden="true" />
                        </div>
                        <h2 className="mb-3 text-2xl font-semibold tracking-[-0.02em] text-slate-900 md:text-3xl">{row.title}</h2>
                        <p className="mb-4 text-base leading-relaxed text-slate-600">{row.desc}</p>
                        <ul className="space-y-2">
                          {row.bullets.map((b) => (
                            <li key={b} className="flex items-start gap-2.5 text-sm text-slate-700">
                              <Check className="h-4 w-4 text-indigo-700 shrink-0 mt-0.5" aria-hidden="true" />
                              {b}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>{row.mock}</div>
                    </div>
                  </div>
                </Tilt3D>
              </div>
            ))}
          </div>
        </section>

        {/* Module registry band */}
        <section className="border-y border-slate-200 bg-slate-50 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <Reveal>
                <div>
                  <h2 className="mb-3 text-2xl font-semibold tracking-[-0.02em] text-slate-900">
                    Plug your product in through the module registry
                  </h2>
                  <p className="mb-6 text-base leading-relaxed text-slate-600">
                    Declare your feature's route, nav entry, and required permission in one place —
                    the shell renders it inside every dashboard that has the permission.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {['Route', 'Nav item', 'Permission', 'Empty state'].map((chip) => (
                      <span key={chip} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
                        <span className="h-2 w-2 rounded-full bg-indigo-600" aria-hidden="true" />
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Case callout */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <div>
                <div className="mb-4 flex justify-center gap-1" aria-label="Rated 5 out of 5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-5 w-5 fill-indigo-600 text-indigo-600" aria-hidden="true" />
                  ))}
                </div>
                <blockquote className="mb-4 text-center text-xl font-medium leading-snug text-slate-900 md:text-2xl">
                  “Our SOC 2 reviewer asked to see the permission model. We showed them the registry
                  file and the RLS policies. Interview over in ten minutes.”
                </blockquote>
                <p className="text-center text-sm text-slate-600">David Mensah · CTO, Northwind Labs</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* CTA banner */}
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 md:pb-20 lg:px-8">
          <Reveal>
            <div className="rounded-xl bg-slate-900 px-6 py-12 text-center md:px-16 md:py-16">
              <h2 className="mb-4 text-3xl font-semibold tracking-[-0.02em] text-white md:text-4xl">
                Put the shell under your product
              </h2>
              <p className="mx-auto mb-8 max-w-xl leading-relaxed text-slate-300">
                Register your module, invite your first enterprise, and ship — the access control
                layer is already battle-tested.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Magnetic strength={0.35}>
                  <Link
                    href="/register"
                    data-glow
                    style={{ ['--glow-color' as string]: 'rgba(147, 162, 56, 0.4)' }}
                    className="inline-flex h-11 sm:h-12 items-center justify-center rounded-md bg-white px-7 text-base font-medium text-slate-900 transition-colors duration-150 hover:bg-slate-200"
                  >
                    Start Free <ArrowRight className="btn-arrow ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Magnetic>
                <Link
                  href="/contact"
                  className="inline-flex h-11 sm:h-12 items-center justify-center rounded-md border border-slate-600 px-7 text-base font-medium text-white transition-colors duration-150 hover:bg-slate-800"
                >
                  Talk to Sales
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
