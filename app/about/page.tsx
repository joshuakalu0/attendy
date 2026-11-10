'use client';

import Link from 'next/link';
import { ArrowRight, Banknote, ShieldCheck, MessageCircle, Users } from 'lucide-react';
import SiteHeader from '@/components/marketing/site-header';
import SiteFooter from '@/components/marketing/site-footer';
import PageHeader from '@/components/marketing/page-header';
import { Reveal, RotatingRing, Tilt3D, Magnetic, useSpotlight } from '@/components/marketing/motion';

const TEAM = [
  { name: 'Ada Obi', role: 'Co-founder & CEO', bio: 'Built identity systems for two fintechs before deciding every SaaS deserves one that works on day one.', chip: 'bg-indigo-100 text-indigo-800' },
  { name: 'Emeka Duru', role: 'Co-founder & CTO', bio: 'Database person. Thinks Row Level Security should be the default everywhere, not an optimization.', chip: 'bg-slate-200 text-slate-800' },
  { name: 'Zainab Bello', role: 'Head of Product', bio: 'Turns enterprise IT requirements into features that small teams can actually operate.', chip: 'bg-indigo-100 text-indigo-800' },
  { name: 'Kelechi Umeh', role: 'Head of Security', bio: 'Runs the audit, impersonation, and session-security workstreams. Breaks it before they do.', chip: 'bg-slate-200 text-slate-800' },
];

const VALUES = [
  { icon: ShieldCheck, chip: 'bg-indigo-50 text-indigo-700', title: 'Secure by structure', desc: 'Isolation lives in the database, not in developer discipline. Structure beats vigilance.' },
  { icon: Users, chip: 'bg-slate-100 text-slate-700', title: 'Boring where it counts', desc: 'Auth is infrastructure. We choose proven defaults over novelty, so you never debug your login page.' },
  { icon: MessageCircle, chip: 'bg-indigo-50 text-indigo-700', title: 'Respond like owners', desc: 'One business day maximum on support. Security reports get a same-day acknowledgment.' },
  { icon: Banknote, chip: 'bg-slate-100 text-slate-700', title: 'Priced for the region', desc: 'Naira billing, regional payment rails, and pricing built for African SaaS economics.' },
];

const TIMELINE = [
  { year: '2024', title: 'The same shell, again', desc: 'Two founding engineers count how many times they have rebuilt login, roles, and billing for client projects. The answer is seven.' },
  { year: '2025', title: 'The shell ships', desc: 'Platform launches with the full auth + RBAC core. First twenty teams migrate in the first month.' },
  { year: '2026', title: 'Enterprises arrive', desc: 'Multi-enterprise workspaces, impersonation, and Paystack billing complete the commercial layer.' },
];

export default function AboutPage() {
  useSpotlight();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main>
        <PageHeader
          eyebrow="About"
          title="We build the boring layer on purpose"
          subtitle="Platform is the authentication, authorization, and account-management shell that SaaS teams keep rebuilding — done once, done properly."
        />

        {/* Mission */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="grid items-start gap-10 lg:grid-cols-2">
            <div>
              <h2 className="mb-4 text-2xl font-semibold tracking-[-0.02em] text-slate-900 md:text-3xl">
                Our mission
              </h2>
              <p className="mb-4 text-base leading-relaxed text-slate-700">
                Every SaaS team ships the same first three months: sign-up, login, roles,
                invitations, billing plumbing. It is undifferentiated, high-stakes work — and it
                is where security mistakes are most expensive.
              </p>
              <p className="text-base leading-relaxed text-slate-700">
                Platform makes that layer a product: database-enforced tenant isolation, a single
                permission model, and enterprise management that a two-person team can operate.
                You build the feature only you can build.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="mb-3 text-lg font-semibold text-slate-900">What we believe</h3>
              <ul className="space-y-3">
                {[
                  'Tenant isolation must be enforced by the database, not by code review.',
                  'A permission model lives in one file, or it lives nowhere.',
                  'Auth pages are part of your product — they should look and feel like it.',
                ].map((belief) => (
                  <li key={belief} className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700">
                    <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-indigo-700" aria-hidden="true" />
                    {belief}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Timeline — rotating ring scroll timeline (unit: rotating-ring-scroll-timeline) */}
        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 md:pt-20 lg:px-8">
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900 md:text-3xl">
              How we got here
            </h2>
          </div>
          <RotatingRing entries={TIMELINE} />
        </section>

        {/* Team */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <h2 className="mb-10 text-2xl font-semibold tracking-[-0.02em] text-slate-900 md:text-3xl">
            The team
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM.map((member, i) => (
              <Reveal key={member.name} delay={i * 80}>
                <Tilt3D max={8}>
                  <div data-spotlight className="h-full rounded-xl border border-slate-200 bg-white p-6 transition-colors duration-200 hover:border-slate-300">
                    <div
                      className={`mb-4 flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold ${member.chip}`}
                      role="img"
                      aria-label={`Portrait placeholder for ${member.name}`}
                    >
                      {member.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <h3 className="font-semibold text-slate-900">{member.name}</h3>
                    <p className="mb-2 text-sm font-medium text-indigo-700">{member.role}</p>
                    <p className="text-sm leading-relaxed text-slate-600">{member.bio}</p>
                  </div>
                </Tilt3D>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Values */}
        <section className="border-y border-slate-200 bg-slate-50 py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-10 text-2xl font-semibold tracking-[-0.02em] text-slate-900 md:text-3xl">
              What we optimize for
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {VALUES.map((v, i) => (
                <Reveal key={v.title} delay={i * 80}>
                  <div className="flex h-full items-start gap-4 rounded-xl border border-slate-200 bg-white p-6">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${v.chip}`}>
                      <v.icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="mb-1 font-semibold text-slate-900">{v.title}</h3>
                      <p className="text-sm leading-relaxed text-slate-600">{v.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Careers CTA */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-6 py-12 text-center md:px-16">
            <h2 className="mb-3 text-2xl font-semibold tracking-[-0.02em] text-slate-900 md:text-3xl">
              Come build the boring layer
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-slate-600">
              Small team, high trust, and work that thousands of products quietly depend on.
            </p>
            <Magnetic strength={0.3}>
              <Link
                href="/careers"
                className="inline-flex h-11 sm:h-10 items-center justify-center rounded-md bg-slate-900 px-7 text-base font-medium text-white transition-colors duration-150 hover:bg-slate-700"
              >
                See Open Roles <ArrowRight className="btn-arrow ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Magnetic>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
