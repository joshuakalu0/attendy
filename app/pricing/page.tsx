'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, X, ArrowRight, Building2 } from 'lucide-react';
import SiteHeader from '@/components/marketing/site-header';
import SiteFooter from '@/components/marketing/site-footer';
import PageHeader from '@/components/marketing/page-header';
import { Reveal, FAQAccordion, Tilt3D, Magnetic, useSpotlight } from '@/components/marketing/motion';

type Billing = 'monthly' | 'annual';

const TIERS = [
  {
    name: 'Core',
    monthly: 0,
    annual: 0,
    blurb: 'The full auth shell for one project.',
    cta: 'Start Free',
    featured: false,
    features: ['Email + password auth', 'System roles (6)', 'Row Level Security setup', 'Audit log', 'Community support'],
  },
  {
    name: 'Team',
    monthly: 25000,
    annual: 20000,
    blurb: 'For products with real enterprise tenants.',
    cta: 'Start 14-day Trial',
    featured: true,
    features: [
      'Everything in Core',
      'Custom roles & permissions',
      'Invitations & impersonation',
      'Paystack billing hooks',
      'Notifications & email verification',
      'Priority support',
    ],
  },
  {
    name: 'Scale',
    monthly: 60000,
    annual: 48000,
    blurb: 'For multi-enterprise deployments at volume.',
    cta: 'Start 14-day Trial',
    featured: false,
    features: [
      'Everything in Team',
      'Multi-enterprise workspaces',
      'Branded auth screens',
      'Custom module registry review',
      'Quarterly security review',
      'Dedicated support line',
    ],
  },
];

const MATRIX: { label: string; core: boolean; team: boolean; scale: boolean }[] = [
  { label: 'Email + password authentication', core: true, team: true, scale: true },
  { label: 'System roles (6 types)', core: true, team: true, scale: true },
  { label: 'Database-enforced tenant isolation', core: true, team: true, scale: true },
  { label: 'Custom enterprise roles', core: false, team: true, scale: true },
  { label: 'Signed employee invitations', core: false, team: true, scale: true },
  { label: 'Impersonation with audit trail', core: false, team: true, scale: true },
  { label: 'Paystack subscription hooks', core: false, team: true, scale: true },
  { label: 'Branded auth screens', core: false, team: false, scale: true },
];

const FAQS = [
  {
    q: 'What exactly is "the shell"?',
    a: 'Everything except your core feature: registration, login, sessions, roles, invitations, billing plumbing, notifications, and audit logs — wired to Supabase and ready to extend.',
  },
  {
    q: 'How does tenant isolation work?',
    a: 'Every tenant-scoped table carries Row Level Security policies enforced by Postgres itself. Application code cannot bypass them, even with a buggy query.',
  },
  {
    q: 'Can we self-host?',
    a: 'Yes. The stack is standard Next.js plus Supabase — run it on your own infrastructure with your own Supabase project, or deploy to Vercel or Netlify.',
  },
  {
    q: 'What happens when the trial ends?',
    a: 'Auth keeps working. Paid features (impersonation, branded screens, custom roles UI) switch off until you choose a plan — nothing is deleted.',
  },
];

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-slate-700">
      <Check className="h-4 w-4 text-indigo-700 shrink-0 mt-0.5" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>('monthly');
  useSpotlight();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main>
        <PageHeader
          eyebrow="Pricing"
          title="Shell pricing that scales with you"
          subtitle="Start on Core for free. Move up when your first enterprise tenant signs — every plan includes the full auth and RBAC engine."
        />

        {/* Billing toggle + tiers */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mb-10 flex justify-center">
            <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Billing frequency">
              {(['monthly', 'annual'] as Billing[]).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBilling(b)}
                  aria-pressed={billing === b}
                  className={`inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-4 text-sm font-medium transition-colors duration-150 ${
                    billing === b ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {b === 'monthly' ? 'Monthly' : 'Annual'}
                  {b === 'annual' && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">Save 20%</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="grid items-stretch gap-4 md:grid-cols-3">
            {TIERS.map((tier, i) => (
              <Reveal key={tier.name} delay={i * 100} className={tier.featured ? 'md:-mt-4' : ''}>
                <Tilt3D max={5} glare={false}>
                  <div
                    data-spotlight
                    className={`relative flex h-full flex-col rounded-xl border bg-white p-6 ${
                      tier.featured ? 'beam-border border-indigo-700 ring-2 ring-indigo-100' : 'border-slate-200'
                    }`}
                  >
                {tier.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-700 px-3 py-1 text-xs font-medium text-white">
                    Most popular
                  </span>
                )}
                <h2 className="text-xl font-semibold text-slate-900">{tier.name}</h2>
                <p className="mb-4 mt-1 text-sm text-slate-600">{tier.blurb}</p>
                <p className="mb-6">
                  <span className="text-3xl font-semibold tracking-[-0.02em] text-slate-900">
                    {tier.monthly === 0 ? '₦0' : `₦${(billing === 'annual' ? tier.annual : tier.monthly).toLocaleString()}`}
                  </span>
                  <span className="text-sm text-slate-600">
                    {tier.monthly === 0 ? ' forever' : billing === 'annual' ? ' /mo, billed yearly' : ' /month'}
                  </span>
                </p>
                <ul className="mb-8 flex-1 space-y-2.5">
                  {tier.features.map((f) => <CheckItem key={f}>{f}</CheckItem>)}
                </ul>
                <Link
                  href="/register"
                  className={`inline-flex h-11 sm:h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors duration-150 ${
                    tier.featured
                      ? 'bg-indigo-700 text-white hover:bg-indigo-800'
                      : 'border border-slate-300 text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tier.cta}
                </Link>
                </div>
                </Tilt3D>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Feature matrix */}
        <section className="border-y border-slate-200 bg-slate-50 py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-8 text-2xl font-semibold tracking-[-0.02em] text-slate-900 md:text-3xl">
              Compare plans feature by feature
            </h2>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th scope="col" className="px-5 py-3 font-medium text-slate-900">Feature</th>
                    <th scope="col" className="px-5 py-3 text-center font-medium text-slate-900">Core</th>
                    <th scope="col" className="px-5 py-3 text-center font-medium text-indigo-700">Team</th>
                    <th scope="col" className="px-5 py-3 text-center font-medium text-slate-900">Scale</th>
                  </tr>
                </thead>
                <tbody>
                  {MATRIX.map((row, i) => (
                    <tr key={row.label} className={i % 2 === 0 ? '' : 'bg-slate-50/60'}>
                      <td className="px-5 py-3 text-slate-700">{row.label}</td>
                      {([row.core, row.team, row.scale] as boolean[]).map((on, j) => (
                        <td key={j} className="px-5 py-3 text-center">
                          {on ? (
                            <Check className="h-4 w-4 text-indigo-700" aria-label="Included" />
                          ) : (
                            <X className="h-4 w-4 text-slate-400" aria-label="Not included" />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-8 text-center text-2xl font-semibold tracking-[-0.02em] text-slate-900 md:text-3xl">
              Frequently asked questions
            </h2>
            <Reveal>
              <FAQAccordion items={FAQS} />
            </Reveal>
          </div>
        </section>

        {/* Enterprise band */}
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 md:pb-20 lg:px-8">
          <Reveal>
            <div className="flex flex-col items-start justify-between gap-6 rounded-xl bg-slate-900 px-6 py-12 text-white md:flex-row md:items-center md:px-16">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-800">
                  <Building2 className="h-5 w-5 text-indigo-300" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="mb-1 text-2xl font-semibold tracking-[-0.02em] md:text-3xl">Deploying at scale?</h2>
                  <p className="max-w-xl text-sm leading-relaxed text-slate-300 md:text-base">
                    Multi-environment setups, procurement paperwork, and security reviews — we work with your team directly.
                  </p>
                </div>
              </div>
              <Magnetic strength={0.3}>
                <Link
                  href="/contact"
                  data-glow
                  style={{ ['--glow-color' as string]: 'rgba(147, 162, 56, 0.4)' }}
                  className="inline-flex h-11 sm:h-10 shrink-0 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-slate-900 transition-colors duration-150 hover:bg-slate-200"
                >
                  Talk to Sales <ArrowRight className="btn-arrow ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Magnetic>
            </div>
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
