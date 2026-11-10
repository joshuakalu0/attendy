'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import SiteHeader from '@/components/marketing/site-header';
import SiteFooter from '@/components/marketing/site-footer';
import PageHeader from '@/components/marketing/page-header';
import { Reveal, Tilt3D, useSpotlight } from '@/components/marketing/motion';

type Category = 'All' | 'Engineering' | 'Guides' | 'Company';

interface Post {
  title: string;
  category: Exclude<Category, 'All'>;
  excerpt: string;
  date: string;
  readTime: string;
  slug?: string;
  chip: string;
}

const FEATURED: Post = {
  title: 'Row Level Security is not optional: the migration that protects 22 tables',
  category: 'Engineering',
  excerpt: 'Every tenant-scoped table in Platform ships with FORCE RLS. Here is the policy design, and the bug class it eliminates.',
  date: 'Nov 3, 2026',
  readTime: '9 min read',
  slug: 'rls-everywhere',
  chip: 'bg-indigo-50 text-indigo-700',
};

const POSTS: Post[] = [
  { title: 'Row Level Security is not optional: the migration that protects 22 tables', category: 'Engineering', excerpt: 'The policy design behind database-enforced tenant isolation, and the bug class it eliminates.', date: 'Nov 3, 2026', readTime: '9 min read', slug: 'rls-everywhere', chip: 'bg-indigo-50 text-indigo-700' },
  { title: 'Designing a permission model that lives in one file', category: 'Guides', excerpt: 'A single registry file for routes, nav entries, and capabilities — and how it survives enterprise sprawl.', date: 'Oct 26, 2026', readTime: '7 min read', slug: 'permission-registry', chip: 'bg-slate-100 text-slate-700' },
  { title: 'Signed invitation tokens: the whole flow', category: 'Guides', excerpt: 'HMAC signing, expiry windows, and single-use semantics — how accept-invite links resist forgery and replay.', date: 'Oct 15, 2026', readTime: '6 min read', slug: 'rls-everywhere', chip: 'bg-indigo-50 text-indigo-700' },
  { title: 'From auth shell to first enterprise in one afternoon', category: 'Company', excerpt: 'A walkthrough of a real onboarding: migrations, module registry, first invitation, first audit entry.', date: 'Oct 7, 2026', readTime: '5 min read', slug: 'permission-registry', chip: 'bg-slate-100 text-slate-700' },
  { title: 'Why impersonation needs an audit trail by design', category: 'Engineering', excerpt: 'Support access is a compliance liability unless every action is appended and scoped. Our design.', date: 'Sep 29, 2026', readTime: '6 min read', slug: 'rls-everywhere', chip: 'bg-indigo-50 text-indigo-700' },
  { title: 'What we cut from the first version, and why', category: 'Company', excerpt: 'Two features that did not survive contact with real enterprise requirements.', date: 'Sep 18, 2026', readTime: '4 min read', slug: 'permission-registry', chip: 'bg-slate-100 text-slate-700' },
];

const CATEGORIES: Category[] = ['All', 'Engineering', 'Guides', 'Company'];

export default function BlogIndexPage() {
  const [category, setCategory] = useState<Category>('All');
  const [subscribed, setSubscribed] = useState(false);
  const [email, setEmail] = useState('');
  useSpotlight();

  const visible = POSTS.filter((p) => category === 'All' || p.category === category);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main>
        <PageHeader
          eyebrow="Blog"
          title="Engineering notes on identity infrastructure"
          subtitle="How Platform is built — isolation policies, permission design, and the decisions behind an auth shell teams depend on."
        />

        {/* Featured post */}
        <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 md:pt-20 lg:px-8">
          <Link href={`/blog/${FEATURED.slug}`} className="group grid grid-cols-1 overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors duration-200 hover:border-slate-300 lg:grid-cols-2">
            <div className="flex flex-col justify-center p-8 md:p-10">
              <span className={`mb-4 inline-block w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${FEATURED.chip}`}>{FEATURED.category}</span>
              <h2 className="mb-3 text-2xl font-semibold tracking-[-0.02em] text-slate-900 underline-offset-4 group-hover:underline md:text-3xl">
                {FEATURED.title}
              </h2>
              <p className="mb-4 text-base leading-relaxed text-slate-600">{FEATURED.excerpt}</p>
              <p className="text-sm text-slate-600">{FEATURED.date} · {FEATURED.readTime}</p>
            </div>
            <div className="flex items-center justify-center border-t border-slate-200 bg-indigo-50/60 p-10 lg:border-l lg:border-t-0" aria-hidden="true">
              <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-slate-200 bg-white">
                <ShieldCheck className="h-10 w-10 text-indigo-700" />
              </div>
            </div>
          </Link>
        </section>

        {/* Category filter + grid */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 md:py-16 lg:px-8">
          <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Filter posts by category">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                aria-pressed={category === c}
                className={`inline-flex min-h-[44px] sm:min-h-[40px] items-center rounded-md px-4 text-sm font-medium transition-colors duration-150 ${
                  category === c ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-600 hover:border-slate-400'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((post, i) => (
              <Reveal key={`${post.title}-${i}`} delay={Math.min(i, 5) * 80}>
                <Tilt3D max={7} glare={false}>
                  <Link href={`/blog/${post.slug || 'rls-everywhere'}`} data-spotlight className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6 transition-colors duration-200 hover:border-slate-300">
                    <span className={`mb-3 inline-block w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ${post.chip}`}>{post.category}</span>
                    <h3 className="mb-2 text-lg font-semibold text-slate-900 underline-offset-4 group-hover:underline">{post.title}</h3>
                    <p className="mb-4 flex-1 text-sm leading-relaxed text-slate-600">{post.excerpt}</p>
                    <p className="text-xs text-slate-600">{post.date} · {post.readTime}</p>
                  </Link>
                </Tilt3D>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Newsletter */}
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 md:pb-20 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-xl bg-slate-900 px-6 py-12 text-center md:px-16">
            <h2 className="mb-3 text-2xl font-semibold tracking-[-0.02em] text-white md:text-3xl">
              One useful email a month
            </h2>
            <p className="mb-8 text-sm leading-relaxed text-slate-300 md:text-base">
              Engineering deep dives and platform changes. No spam, unsubscribe anytime.
            </p>
            {subscribed ? (
              <p className="text-sm font-medium text-indigo-300" role="status">
                Subscribed — check your inbox for a confirmation.
              </p>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); setSubscribed(true); }}
                className="mx-auto flex max-w-md flex-col gap-3 sm:flex-row"
              >
                <label htmlFor="newsletter-email" className="sr-only">Email address</label>
                <input
                  id="newsletter-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="h-11 flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-slate-900 transition-colors duration-150 hover:bg-slate-200"
                >
                  Subscribe <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
