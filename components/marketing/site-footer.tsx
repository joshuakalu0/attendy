import Link from 'next/link';
import { Logo } from './site-header';

const FOOTER_COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Access Control', href: '/features' },
      { label: 'Billing', href: '/pricing' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Help Center', href: '/help' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/help' },
      { label: 'System Status', href: '/help' },
      { label: 'Blog', href: '/blog' },
      { label: 'Support', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms of Service', href: '/legal/terms' },
      { label: 'Privacy Policy', href: '/legal/privacy' },
      { label: 'Security', href: '/features' },
      { label: 'Compliance', href: '/legal/privacy' },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <div className="mb-3">
              <Logo />
            </div>
            <p className="text-sm leading-relaxed text-slate-600">
              Multi-tenant authentication, RBAC, and account management for SaaS products.
            </p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 text-sm font-semibold text-slate-900">{col.title}</h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="underline-hover text-sm text-slate-600 transition-colors duration-150 hover:text-slate-900"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-8 sm:flex-row">
          <p className="text-sm text-slate-600">© 2026 Platform. All rights reserved.</p>
          <p className="text-sm text-slate-600">Multi-tenant authentication &amp; account management</p>
        </div>
      </div>
    </footer>
  );
}
