import { LegalPage, type LegalDoc } from '../legal-page';

const DOC: LegalDoc = {
  title: 'Terms of Service',
  updated: 'October 1, 2026',
  intro:
    'These terms govern your use of Platform — the multi-tenant authentication, authorization, and account-management shell. By creating an account or deploying the shell, you agree to them.',
  sections: [
    {
      heading: '1. Accounts and eligibility',
      body: [
        'You must be at least 18 years old, or have the consent of a parent or guardian, to create an account. You are responsible for activity under your login and for keeping your credentials secure.',
        'Enterprise accounts may invite team members. Enterprise owners are responsible for the roles they grant and may revoke access at any time.',
      ],
    },
    {
      heading: '2. Your data and your tenants',
      body: [
        'You retain all rights to data stored in your Supabase project. Platform processes it only to provide the service — authentication, role resolution, invitations, billing records, and audit logs.',
        'You are responsible for the lawful basis on which you process your own end users\' personal data through the shell.',
      ],
    },
    {
      heading: '3. Billing and payment',
      body: [
        'Paid plans are billed in Naira through Paystack. Subscription fees are billed monthly or annually in advance and are non-refundable except where required by law.',
        'Plan limits (seats, enterprises, audit retention) are enforced server-side. Exceeding them requires an upgrade, not a workaround.',
      ],
    },
    {
      heading: '4. Acceptable use',
      body: [
        'Do not use Platform to build products that harass, defraud, or unlawfully process personal data, or to attempt to breach tenant isolation or other tenants\' data.',
        'We may suspend accounts that create legal exposure for the platform or its users, with notice where practicable.',
      ],
    },
    {
      heading: '5. Availability and changes',
      body: [
        'We aim for continuous availability but do not guarantee uninterrupted service. Scheduled maintenance is announced in-app at least 48 hours in advance.',
        'We may update these terms; material changes are notified by email 14 days before they take effect.',
      ],
    },
  ],
};

export default function TermsPage() {
  return <LegalPage doc={DOC} />;
}
