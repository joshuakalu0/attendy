'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, MessageCircle, MapPin, CheckCircle2, Shield, Lock, FileCheck, ArrowRight } from 'lucide-react';
import SiteHeader from '@/components/marketing/site-header';
import SiteFooter from '@/components/marketing/site-footer';
import PageHeader from '@/components/marketing/page-header';
import { Reveal, Magnetic, Tilt3D, useSpotlight } from '@/components/marketing/motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const CHANNELS = [
  { icon: Mail, label: 'Email', value: 'hello@platform.dev' },
  { icon: MessageCircle, label: 'WhatsApp', value: '+234 800 000 0000' },
  { icon: MapPin, label: 'HQ', value: '18A Akin Adesola St, Victoria Island, Lagos' },
];

const TRUST = [
  { icon: Lock, label: 'Encrypted in transit and at rest' },
  { icon: Shield, label: 'Database-enforced tenant isolation' },
  { icon: FileCheck, label: 'NDPR-compliant data handling' },
];

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [topic, setTopic] = useState('Sales');
  const [message, setMessage] = useState('');
  useSpotlight();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main>
        <PageHeader
          eyebrow="Contact"
          title="Talk to the team"
          subtitle="Sales, support, or security — we read everything and reply within one business day."
        />

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
            {/* Form */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 md:p-8">
              {sent ? (
                <div className="py-8 text-center" role="status">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
                    <CheckCircle2 className="h-7 w-7 text-indigo-700" aria-hidden="true" />
                  </div>
                  <h2 className="mb-2 text-xl font-semibold text-slate-900">Message received</h2>
                  <p className="mx-auto max-w-sm text-sm text-slate-600">
                    Thanks {name.split(' ')[0] || 'there'} — we'll reply to {email || 'your email'} within one business day.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => { e.preventDefault(); setSent(true); }}
                  className="space-y-4"
                >
                  <h2 className="mb-1 text-xl font-semibold text-slate-900">Send a message</h2>
                  <p className="mb-2 text-sm text-slate-600">Six fields, no phone tree.</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Obi" autoComplete="name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Work Email *</Label>
                      <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="company">Company <span className="font-normal text-slate-600">(optional)</span></Label>
                      <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Northwind Labs" autoComplete="organization" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="topic">Topic *</Label>
                      <Select value={topic} onValueChange={setTopic} required>
                        <SelectTrigger id="topic" aria-label="Topic">
                          <SelectValue placeholder="Choose a topic" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sales">Sales</SelectItem>
                          <SelectItem value="Support">Support</SelectItem>
                          <SelectItem value="Security">Security</SelectItem>
                          <SelectItem value="Press">Press</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea id="message" className="min-h-[120px] resize-y" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us about your product and what you need." required />
                  </div>
                  <Magnetic strength={0.2} className="w-full">
                    <Button type="submit" className="w-full">
                      Send Message <ArrowRight className="btn-arrow ml-2 h-4 w-4" aria-hidden="true" />
                    </Button>
                  </Magnetic>
                </form>
              )}
            </div>

            {/* Direct channels */}
            <div className="space-y-4">
              {CHANNELS.map((c, i) => (
                <Reveal key={c.label} delay={i * 80}>
                  <Tilt3D max={6} glare={false}>
                    <div data-spotlight className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                        <c.icon className="h-5 w-5 text-indigo-700" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{c.label}</p>
                        <p className="text-sm leading-relaxed text-slate-600">{c.value}</p>
                      </div>
                    </div>
                  </Tilt3D>
                </Reveal>
              ))}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="mb-3 text-sm font-medium text-slate-900">Trusted &amp; compliant</p>
                <ul className="space-y-2">
                  {TRUST.map((t) => (
                    <li key={t.label} className="flex items-center gap-2.5 text-sm text-slate-700">
                      <t.icon className="h-4 w-4 shrink-0 text-indigo-700" aria-hidden="true" />
                      {t.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ teaser */}
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 md:pb-20 lg:px-8">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-6 py-10 text-center">
            <h2 className="mb-2 text-xl font-semibold tracking-[-0.02em] text-slate-900 md:text-2xl">
              Looking for a quick answer?
            </h2>
            <p className="mx-auto mb-6 max-w-lg text-sm text-slate-600">
              Most integration, billing, and RBAC questions are answered in the help center.
            </p>
            <Link
              href="/help"
              className="inline-flex h-11 sm:h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-700"
            >
              Visit the Help Center
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
