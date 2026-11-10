'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Banknote, Wifi, HeartPulse, GraduationCap, Laptop, Clock, ChevronRight } from 'lucide-react';
import SiteHeader from '@/components/marketing/site-header';
import SiteFooter from '@/components/marketing/site-footer';
import PageHeader from '@/components/marketing/page-header';
import { Reveal, Tilt3D, Magnetic, useSpotlight } from '@/components/marketing/motion';

const BENEFITS = [
  { icon: Banknote, title: 'Naira salary, on time', desc: 'Competitive pay in Naira, paid on the 25th — never a conversion story.' },
  { icon: Laptop, title: 'Remote-first', desc: 'Work from anywhere in Nigeria with a monthly co-working stipend.' },
  { icon: Wifi, title: 'Connectivity budget', desc: 'We pay for the ISP line and the backup hotspot. Stability is the job.' },
  { icon: HeartPulse, title: 'Health cover', desc: 'HMO for you and two dependents from day one.' },
  { icon: GraduationCap, title: 'Learning budget', desc: '₦500,000 a year for courses, conferences, and certifications.' },
  { icon: Clock, title: 'Focused weeks', desc: 'One no-meeting week every quarter to actually build.' },
];

const JOBS = [
  { title: 'Senior Frontend Engineer', dept: 'Engineering', location: 'Lagos / Remote', type: 'Full-time' },
  { title: 'Database Engineer (Postgres/RLS)', dept: 'Engineering', location: 'Remote', type: 'Full-time' },
  { title: 'Product Designer', dept: 'Design', location: 'Lagos', type: 'Full-time' },
  { title: 'Developer Success Engineer', dept: 'Operations', location: 'Remote', type: 'Contract' },
  { title: 'Security Analyst', dept: 'Operations', location: 'Lagos / Remote', type: 'Full-time' },
  { title: 'Technical Writer', dept: 'Operations', location: 'Remote', type: 'Contract' },
];

const QUOTES = [
  {
    quote: 'We ship to teams who run payroll on our permission model. That responsibility keeps the code review culture honest.',
    name: 'Kelechi U.',
    role: 'Security',
  },
  {
    quote: 'The onboarding call usually ends with "wait, that was the whole integration?" — the shell does what it says.',
    name: 'Zainab B.',
    role: 'Product',
  },
];

const DEPTS = ['All', 'Engineering', 'Design', 'Operations'] as const;

export default function CareersPage() {
  const [dept, setDept] = useState<(typeof DEPTS)[number]>('All');
  const visible = JOBS.filter((j) => dept === 'All' || j.dept === dept);
  useSpotlight();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main>
        <PageHeader
          eyebrow="Careers"
          title="Build infrastructure teams trust"
          subtitle="A small, remote-first team shipping the authentication and access-control layer for products across the region."
        />

        {/* Benefits */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <h2 className="mb-10 text-2xl font-semibold tracking-[-0.02em] text-slate-900 md:text-3xl">
            How we take care of the team
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b, i) => (
              <Reveal key={b.title} delay={i * 80}>
                <Tilt3D max={7} glare={false}>
                  <div data-spotlight className="h-full rounded-xl border border-slate-200 bg-white p-6 transition-colors duration-200 hover:border-slate-300">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50">
                      <b.icon className="h-5 w-5 text-indigo-700" aria-hidden="true" />
                    </div>
                    <h3 className="mb-1.5 font-semibold text-slate-900">{b.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-600">{b.desc}</p>
                  </div>
                </Tilt3D>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Openings */}
        <section className="border-y border-slate-200 bg-slate-50 py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-slate-900 md:text-3xl">
                Open roles
              </h2>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Filter roles by department">
                {DEPTS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDept(d)}
                    aria-pressed={dept === d}
                    className={`inline-flex min-h-[44px] sm:min-h-[40px] items-center rounded-md px-4 text-sm font-medium transition-colors duration-150 ${
                      dept === d ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {visible.map((job, i) => (
                <Reveal key={job.title} delay={Math.min(i, 5) * 60}>
                  <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <h3 className="font-semibold text-slate-900">{job.title}</h3>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">{job.dept}</span>
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">{job.location}</span>
                        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">{job.type}</span>
                      </div>
                    </div>
                    <Magnetic strength={0.3}>
                      <Link
                        href="/contact"
                        className="inline-flex h-11 sm:h-10 shrink-0 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-900 transition-colors duration-150 hover:bg-slate-100"
                      >
                        Apply <ChevronRight className="btn-arrow ml-1 h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Magnetic>
                  </div>
                </Reveal>
              ))}
              {visible.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-600">No open roles in this department right now.</p>
              )}
            </div>
          </div>
        </section>

        {/* Employee quotes — fanned card stack (testimonial-fanned-card-stack unit) */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="group relative mx-auto max-w-2xl">
            <figure className="rounded-xl border border-slate-200 bg-white p-8 rotate-[2.2deg] translate-y-3 origin-bottom transition-transform duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:rotate-[4deg] group-hover:translate-y-5 opacity-80" aria-hidden="true">
              <blockquote className="text-lg font-medium leading-relaxed text-slate-900">
                “{QUOTES[1].quote}”
              </blockquote>
              <figcaption className="mt-4 text-sm text-slate-600">{QUOTES[1].name} · {QUOTES[1].role}</figcaption>
            </figure>
            <figure className="relative z-10 -mt-10 rounded-xl border border-slate-200 bg-white p-8 -rotate-[1.5deg] origin-bottom transition-transform duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:rotate-0 group-hover:translate-y-0">
              <blockquote className="mb-4 text-lg font-medium leading-relaxed text-slate-900">
                “{QUOTES[0].quote}”
              </blockquote>
              <figcaption className="text-sm text-slate-600">
                {QUOTES[0].name} · {QUOTES[0].role}
              </figcaption>
            </figure>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 md:pb-20 lg:px-8">
          <Reveal>
            <div className="rounded-xl bg-slate-900 px-6 py-12 text-center md:px-16">
              <h2 className="mb-3 text-2xl font-semibold tracking-[-0.02em] text-white md:text-3xl">
                Don't see your role?
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-slate-300">
                We hire people, not requisitions. Send a general application and tell us what you'd build.
              </p>
              <Magnetic strength={0.35}>
                <Link
                  href="/contact"
                  data-glow
                  style={{ ['--glow-color' as string]: 'rgba(147, 162, 56, 0.4)' }}
                  className="inline-flex h-11 sm:h-12 items-center justify-center rounded-md bg-white px-7 text-base font-medium text-slate-900 transition-colors duration-150 hover:bg-slate-200"
                >
                  Send a General Application <ArrowRight className="btn-arrow ml-2 h-4 w-4" aria-hidden="true" />
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
