'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ShieldCheck, FileCheck2 } from 'lucide-react';
import SiteHeader from '@/components/marketing/site-header';
import SiteFooter from '@/components/marketing/site-footer';

interface Block {
  heading?: string;
  paragraphs?: string[];
  quote?: string;
}

interface Post {
  title: string;
  category: string;
  chip: string;
  date: string;
  readTime: string;
  author: string;
  authorRole: string;
  intro: string;
  body: Block[];
}

const POSTS: Record<string, Post> = {
  'rls-everywhere': {
    title: 'Row Level Security is not optional: the migration that protects 22 tables',
    category: 'Engineering',
    chip: 'bg-indigo-50 text-indigo-700',
    date: 'Nov 3, 2026',
    readTime: '9 min read',
    author: 'Emeka Duru',
    authorRole: 'Co-founder & CTO',
    intro:
      'Most multi-tenant SaaS leaks happen one way: an application query forgets a WHERE clause on the tenant id. Code review catches it sometimes. A database that refuses to answer cross-tenant queries catches it every time.',
    body: [
      {
        heading: 'The default failure mode',
        paragraphs: [
          'Row-level tenancy (a tenantId column on every table) is the standard pattern for Next.js SaaS — and it is weaker than schema separation by design. The mitigation is to make the database enforce the boundary: enable FORCE ROW LEVEL SECURITY on every tenant-scoped table, keyed to a tenant context set at request time.',
          'With FORCE RLS enabled, even the table owner\'s queries are filtered. A missing tenant filter stops returning other tenants\' rows; it returns none.',
        ],
      },
      {
        quote: 'Isolation enforced by the database is a guarantee. Isolation enforced by code review is a hope.',
      },
      {
        heading: 'How Platform applies it',
        paragraphs: [
          'All 22 tenant-scoped tables — profiles, employees, roles, invites, attendance records, meetings, billing, audit entries — carry the same policy shape: the row\'s tenant must equal the tenant bound to the session. Platform-scoped tables (plans, system audit) use dedicated policies.',
          'The migration ships with the product. New tables added by your core module inherit a helper that scaffolds the policy, so the pattern survives your own development.',
        ],
      },
      {
        heading: 'What this means for your SOC 2 review',
        paragraphs: [
          'Auditors ask how tenant data is isolated. The answer is a policy file and a test suite that proves a cross-tenant read returns nothing. That conversation takes minutes, not weeks.',
        ],
      },
    ],
  },
  'permission-registry': {
    title: 'Designing a permission model that lives in one file',
    category: 'Guides',
    chip: 'bg-slate-100 text-slate-700',
    date: 'Oct 26, 2026',
    readTime: '7 min read',
    author: 'Ada Obi',
    authorRole: 'Co-founder & CEO',
    intro:
      'When permission checks are scattered across components, routes, and actions, enterprise requests turn into archaeology. The fix is a single registry that every layer reads.',
    body: [
      {
        heading: 'One registry, three consumers',
        paragraphs: [
          'The module registry declares each feature with its route, navigation entry, and required capability. The sidebar reads it to render navigation. The router reads it to guard pages. Server actions read it to authorize mutations. One declaration, three consistent behaviors.',
        ],
      },
      {
        quote: 'A permission model lives in one file, or it lives nowhere.',
      },
      {
        heading: 'Adding a core feature',
        paragraphs: [
          'Your product registers once: route, nav label, icon, permission, empty state. From then on, enterprise admins control visibility by assigning roles — no code changes for every tenant\'s preference.',
        ],
      },
      {
        heading: 'Why this survives enterprise sprawl',
        paragraphs: [
          'Custom roles map to capabilities, not to screens. When a customer asks for "a role that sees reports but not billing", it is one capability assignment — not a fork of your navigation code.',
        ],
      },
    ],
  },
};

export default function BlogArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? POSTS[slug] : undefined;
  const otherSlug = slug === 'rls-everywhere' ? 'permission-registry' : 'rls-everywhere';
  const other = POSTS[otherSlug];

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader />
        <main className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <h1 className="mb-4 text-3xl font-semibold tracking-[-0.02em] text-slate-900">Article not found</h1>
          <p className="mb-8 text-slate-600">The article you're looking for may have moved.</p>
          <Link
            href="/blog"
            className="inline-flex h-11 sm:h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-slate-700"
          >
            Back to the Blog
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <article className="mx-auto max-w-[68ch]">
          <span className={`mb-4 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${post.chip}`}>{post.category}</span>
          <h1 className="mb-4 text-3xl font-semibold tracking-[-0.02em] text-slate-900 md:text-4xl">
            {post.title}
          </h1>
          <p className="mb-10 text-sm text-slate-600">
            {post.author} · {post.authorRole} · {post.date} · {post.readTime}
          </p>

          <p className="mb-8 text-lg leading-relaxed text-slate-700">{post.intro}</p>

          {post.body.map((block, i) => (
            <div key={i}>
              {block.heading && (
                <h2 className="mb-3 mt-10 text-2xl font-semibold tracking-[-0.02em] text-slate-900">{block.heading}</h2>
              )}
              {block.paragraphs?.map((p, j) => (
                <p key={j} className="mb-4 text-base leading-relaxed text-slate-700">{p}</p>
              ))}
              {block.quote && (
                <blockquote className="my-8 border-l-4 border-indigo-600 pl-4 text-lg font-medium leading-relaxed text-slate-900">
                  “{block.quote}”
                </blockquote>
              )}
              {i === 0 && (
                <figure className="my-8">
                  <div className="flex aspect-video items-center justify-center rounded-xl border border-slate-200 bg-slate-50" aria-hidden="true">
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-200 bg-white">
                      {slug === 'rls-everywhere' ? (
                        <ShieldCheck className="h-7 w-7 text-slate-500" />
                      ) : (
                        <FileCheck2 className="h-7 w-7 text-slate-500" />
                      )}
                    </div>
                  </div>
                  <figcaption className="mt-2 text-center text-xs text-slate-600">
                    Illustration: {slug === 'rls-everywhere'
                      ? 'FORCE RLS policy applied across the 22 tenant-scoped tables.'
                      : 'The module registry mapping routes, nav entries, and capabilities.'}
                  </figcaption>
                </figure>
              )}
            </div>
          ))}

          {/* Author box */}
          <div className="mt-12 flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-6">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-800"
              role="img"
              aria-label={`Portrait placeholder for ${post.author}`}
            >
              {post.author.split(' ').map((n) => n[0]).join('')}
            </div>
            <div>
              <p className="font-semibold text-slate-900">{post.author}</p>
              <p className="mb-1 text-sm font-medium text-indigo-700">{post.authorRole}</p>
              <p className="text-sm leading-relaxed text-slate-600">
                Writes from the front line of building identity infrastructure teams can depend on.
              </p>
            </div>
          </div>

          {/* Related */}
          <div className="mt-12 border-t border-slate-200 pt-8">
            <p className="mb-4 text-sm font-medium uppercase tracking-wide text-indigo-700">Related reading</p>
            <Link href={`/blog/${otherSlug}`} className="group flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 transition-colors duration-200 hover:border-slate-300">
              <div>
                <span className={`mb-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${other.chip}`}>{other.category}</span>
                <h3 className="mb-1 text-lg font-semibold text-slate-900 underline-offset-4 group-hover:underline">{other.title}</h3>
                <p className="text-sm text-slate-600">{other.date} · {other.readTime}</p>
              </div>
              <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-indigo-700" aria-hidden="true" />
            </Link>
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
