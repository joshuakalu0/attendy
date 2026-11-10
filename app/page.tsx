'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import SiteHeader from '@/components/marketing/site-header';
import SiteFooter from '@/components/marketing/site-footer';
import {
  Reveal,
  SplitText,
  Counter,
  AuroraCanvas,
  Tilt3D,
  SlotText,
  Magnetic,
  DockMagnify,
  useScrollLean,
  useSpotlight,
} from '@/components/marketing/motion';
import {
  Shield,
  Building2,
  Users,
  Lock,
  CheckCircle2,
  ArrowRight,
  Layers,
  ChevronRight,
  KeyRound,
} from 'lucide-react';

const MARQUEE_TEAMS = [
  'Northwind Labs',
  'Lagos Fintech Co',
  'Helios Health',
  'Kaduna Logistics',
  'Bluepeak Systems',
  'Abeokuta Retail',
  'Vector Studio',
  'Cedar & Co',
];

const FEATURES = [
  {
    icon: Shield,
    title: 'Role-Based Access Control',
    desc: 'Granular permissions, system and custom roles, and a single permission check used on both frontend and backend. Every route and action resolves against one source of truth.',
    featured: true,
  },
  {
    icon: Building2,
    title: 'Enterprise Management',
    desc: 'Invite employees, assign roles, create departments, and isolate tenant data at the database level with Row Level Security.',
  },
  {
    icon: Users,
    title: 'Extensible User Types',
    desc: 'Account types live in a registry, not hardcoded conditionals. Add Partner or Reseller types without touching core code.',
  },
  {
    icon: Lock,
    title: 'Security First',
    desc: 'Email verification, optional 2FA, session management, audit logging, and tenant isolation enforced in the database.',
  },
  {
    icon: Layers,
    title: 'Module Registry',
    desc: 'One registration point for your core feature. Declare its route, nav item, and required permission — it just works.',
  },
  {
    icon: CheckCircle2,
    title: 'Production Ready',
    desc: 'Billing with Paystack, audit logs, notifications, and impersonation — working end to end from day one.',
  },
];

export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  useScrollLean();
  useSpotlight();

  useEffect(() => {
    if (!loading && user && profile?.dashboard_route) {
      router.push(profile.dashboard_route);
    }
  }, [user, profile, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <main>
        {/* 1 — Hero with interface preview */}
        <section className="relative overflow-hidden border-b border-slate-200 bg-slate-50">
          <AuroraCanvas palette="light" className="absolute inset-0 h-full w-full" />
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                <KeyRound className="h-3 w-3" aria-hidden="true" />
                <SlotText words={['Multi-tenant', 'Production-ready', 'Self-hostable']} className="font-semibold" />
                SaaS foundation
              </div>
              <h1 className="text-4xl font-semibold tracking-[-0.02em] text-slate-900 sm:text-5xl md:text-6xl">
                <SplitText text="The authentication layer your SaaS ships with" mode="letters" />
              </h1>
              <Reveal delay={150}>
                <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
                  Multi-tenant architecture, role-based access control, enterprise management, and
                  billing — production-ready on day one. Plug in your core feature and launch.
                </p>
              </Reveal>
              <Reveal delay={280}>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Magnetic strength={0.3}>
                    <Link
                      href="/register"
                      className="inline-flex h-11 sm:h-12 items-center justify-center rounded-md bg-slate-900 px-7 text-base font-medium text-white transition-colors duration-150 hover:bg-slate-700"
                    >
                      Create an Account
                      <ArrowRight className="btn-arrow ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Magnetic>
                  <Link
                    href="/login"
                    className="inline-flex h-11 sm:h-12 items-center justify-center rounded-md border border-slate-300 bg-white px-7 text-base font-medium text-slate-900 transition-colors duration-150 hover:bg-slate-100"
                  >
                    Sign In
                  </Link>
                </div>
              </Reveal>
              <Reveal delay={400}>
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-indigo-700" aria-hidden="true" />
                    Database-level tenant isolation
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-indigo-700" aria-hidden="true" />
                    Brute-force protected auth
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-indigo-700" aria-hidden="true" />
                    Audit logging built in
                  </span>
                </div>
              </Reveal>
            </div>

            {/* Interface preview — roles dashboard mock, 3D lean + tilt */}
            <Reveal delay={500}>
              <div data-lean className="mt-14">
                <Tilt3D max={5}>
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-hidden="true">
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
                        i === 2
                          ? 'border border-slate-200 bg-white font-medium text-slate-900'
                          : 'text-slate-600'
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
                  <div className="space-y-2">
                    {[
                      ['Super Admin', 'Full platform control', 'text-slate-900'],
                      ['Enterprise Owner', 'Owns tenant, billing, roles', 'text-slate-900'],
                      ['Manager', 'Team-level attendance and reports', 'text-slate-600'],
                      ['Staff', 'Check-in, schedules, own records', 'text-slate-600'],
                    ].map(([role, scope, tone]) => (
                      <div
                        key={role}
                        className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
                      >
                        <div>
                          <p className={`text-sm font-medium ${tone}`}>{role}</p>
                          <p className="text-xs text-slate-600">{scope}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                      </div>
                    ))}
                  </div>
                  </div>
                </div>
              </div>
                </Tilt3D>
              </div>
            </Reveal>
            </div>
        </section>

        {/* 2 — Team logo dock (dock-magnify-tick-rail: gaussian magnification) */}
        <section className="border-b border-slate-200 py-14" aria-label="Teams running on Platform">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="mb-8 text-center text-sm text-slate-600">
              Powering authentication for teams from Lagos to Berlin
            </p>
          </div>
          <div className="overflow-hidden">
            <DockMagnify
              items={MARQUEE_TEAMS}
              className="dock-rail px-8"
              itemClassName="text-lg font-semibold tracking-tight text-slate-400 whitespace-nowrap transition-transform"
            />
          </div>
        </section>

        {/* 3 — Bento feature grid */}
        <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-24 lg:px-8">
          <div className="max-w-2xl">
            <p className="mb-2 text-sm font-medium text-indigo-700">FEATURES</p>
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 md:text-4xl">
              Everything you need to launch
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              A complete platform shell with authentication, authorization, and billing built in —
              so your team ships the product, not the plumbing.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 80} className={f.featured ? 'sm:col-span-2 lg:col-span-2' : ''}>
                <Tilt3D max={5}>
                  <div data-spotlight className="h-full rounded-xl border border-slate-200 bg-white p-6 transition-colors duration-200 hover:border-slate-300">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50">
                      <f.icon className="h-5 w-5 text-indigo-700" aria-hidden="true" />
                    </div>
                    <h3 className={`mt-4 font-semibold text-slate-900 ${f.featured ? 'text-xl' : 'text-lg'}`}>
                      {f.title}
                    </h3>
                    <p className={`mt-2 text-sm leading-relaxed text-slate-600 ${f.featured ? 'max-w-xl' : ''}`}>
                      {f.desc}
                    </p>
                  </div>
                </Tilt3D>
              </Reveal>
            ))}
          </div>
        </section>

        {/* 4 — How it works */}
        <section id="how-it-works" className="border-y border-slate-200 bg-slate-50 py-20 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="mb-2 text-sm font-medium text-indigo-700">HOW IT WORKS</p>
              <h2 className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 md:text-4xl">
                From clone to first login in one afternoon
              </h2>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {[
                { n: '01', title: 'Deploy the shell', desc: 'Run the migrations, set your Supabase keys, and the auth, RBAC, and billing layers come up together.' },
                { n: '02', title: 'Register your module', desc: 'Declare your core feature route, nav item, and required permission in the module registry.' },
                { n: '03', title: 'Invite your enterprise', desc: 'Owners sign up, invite employees by email, and every session is scoped by tenant from the database up.' },
              ].map((step, i) => (
                <Reveal key={step.n} delay={i * 100}>
                  <div data-lean className="h-full rounded-xl border border-slate-200 bg-white p-6">
                    <span className="text-sm font-semibold text-indigo-700">{step.n}</span>
                    <h3 className="mt-3 text-lg font-semibold text-slate-900">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 5 — Metrics + testimonial */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-24 lg:px-8">
          <div className="mb-16 grid gap-4 sm:grid-cols-3">
            <Reveal>
              <div className="h-full rounded-xl border border-slate-200 p-6">
                <p className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 md:text-4xl">
                  <Counter to={6} suffix=" roles" />
                </p>
                <p className="mt-2 text-sm text-slate-600">system roles covered out of the box</p>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="h-full rounded-xl border border-slate-200 p-6">
                <p className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 md:text-4xl">
                  <Counter to={40} suffix="+" />
                </p>
                <p className="mt-2 text-sm text-slate-600">permission gates across routes and actions</p>
              </div>
            </Reveal>
            <Reveal delay={200}>
              <div className="h-full rounded-xl border border-slate-200 p-6">
                <p className="text-3xl font-semibold tracking-[-0.02em] text-slate-900 md:text-4xl">
                  <Counter to={100} suffix="%" />
                </p>
                <p className="mt-2 text-sm text-slate-600">of tenant tables isolated by Row Level Security</p>
              </div>
            </Reveal>
          </div>
          <Reveal delay={150}>
            <figure className="mx-auto max-w-3xl text-center">
              <blockquote className="text-xl font-medium leading-snug text-slate-900 md:text-2xl">
                “We stopped rebuilding auth for every client project. Roles, invitations, and audit
                logs were working before lunch.”
              </blockquote>
              <figcaption className="mt-4 text-sm text-slate-600">
                Amara Okafor · Founding engineer, Helios Health
              </figcaption>
            </figure>
          </Reveal>
        </section>

        {/* 6 — Security (single saturated dark section) */}
        <section id="security" className="bg-slate-900 py-20 text-white md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-2">
              <Reveal>
                <div>
                  <p
                    className="mb-2 text-sm font-medium text-indigo-300 glow-keyword"
                    style={{ ['--glow-color' as string]: 'rgba(172, 186, 80, 0.55)' }}
                  >
                    SECURITY
                  </p>
                  <h2 className="mb-6 text-3xl font-semibold tracking-[-0.02em] md:text-4xl">
                    Isolation you can prove, not promise
                  </h2>
                  <p className="mb-8 leading-relaxed text-slate-300">
                    Tenant boundaries live in Postgres Row Level Security, not application discipline.
                    Sessions rotate, invitations carry signed tokens, and every sensitive action is
                    appended to an audit log.
                  </p>
                  <Link
                    href="/register"
                    className="inline-flex h-11 sm:h-12 items-center justify-center rounded-md bg-white px-7 text-base font-medium text-slate-900 transition-colors duration-150 hover:bg-slate-200"
                  >
                    Start Building <ArrowRight className="btn-arrow ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </Reveal>
              <div className="flex flex-col gap-4">
                {[
                  { title: 'Row Level Security everywhere', desc: 'Every tenant-scoped table carries enforced RLS policies — a missing WHERE clause cannot leak data.' },
                  { title: 'Signed invitation tokens', desc: 'Employee invites expire and carry HMAC signatures; accept-invite links cannot be forged or reused.' },
                  { title: 'Append-only audit trail', desc: 'Role changes, impersonation, and billing events are recorded per enterprise and platform-wide.' },
                ].map((item, i) => (
                  <Reveal key={item.title} delay={i * 100}>
                    <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
                      <h3 className="mb-2 text-lg font-semibold text-white">{item.title}</h3>
                      <p className="text-sm leading-relaxed text-slate-300">{item.desc}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 7 — Final conversion banner */}
        <section id="pricing" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 md:py-24 lg:px-8">
          <Reveal>
            <div className="rounded-xl bg-slate-900 px-6 py-12 text-center md:px-16 md:py-16">
              <h2 className="mb-4 text-3xl font-semibold tracking-[-0.02em] text-white md:text-4xl">
                Ship your product, not your login page
              </h2>
              <p className="mx-auto mb-8 max-w-xl leading-relaxed text-slate-300">
                Create an account, register your core module, and invite your first enterprise —
                the shell is already production-grade.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Magnetic strength={0.35}>
                  <Link
                    href="/register"
                    data-glow
                    style={{ ['--glow-color' as string]: 'rgba(147, 162, 56, 0.4)' }}
                    className="inline-flex h-11 sm:h-12 items-center justify-center rounded-md bg-white px-7 text-base font-medium text-slate-900 transition-colors duration-150 hover:bg-slate-200"
                  >
                    Create an Account <ArrowRight className="btn-arrow ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Magnetic>
                <Link
                  href="/login"
                  className="inline-flex h-11 sm:h-12 items-center justify-center rounded-md border border-slate-600 px-7 text-base font-medium text-white transition-colors duration-150 hover:bg-slate-800"
                >
                  Sign In
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
