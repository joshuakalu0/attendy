import { LegalPage, type LegalDoc } from '../legal-page';

const DOC: LegalDoc = {
  title: 'Privacy Policy',
  updated: 'October 1, 2026',
  intro:
    'This policy explains what Platform collects, why, and how it is protected. It is written to comply with the Nigeria Data Protection Regulation (NDPR) and, where applicable, the GDPR.',
  sections: [
    {
      heading: '1. What we collect',
      body: [
        'Account data: your name, email, and role assignments. Product data: the records the shell manages for you — employees, invitations, attendance, billing, and audit entries stored in your Supabase project.',
        'Usage data: aggregate product analytics — feature adoption, error rates, session counts — with no advertising trackers anywhere in the product.',
      ],
    },
    {
      heading: '2. How tenant data is isolated',
      body: [
        'Every enterprise\'s data is isolated by Postgres Row Level Security policies enforced at the database level. Access controls are not purely application-side, so one tenant\'s staff cannot read another tenant\'s records even through a buggy query.',
        'Your end users\' personal data is processed only to provide authentication and account features, and is never sold or used for advertising.',
      ],
    },
    {
      heading: '3. Where data lives',
      body: [
        'Authentication and application data live in the Supabase project you configure — you choose the region. Platform\'s own operational analytics are stored in-region with encryption in transit and at rest.',
      ],
    },
    {
      heading: '4. Your rights',
      body: [
        'You may export or delete your account data at any time from settings. Enterprise owners may export employee and audit records for compliance purposes.',
        'Individuals whose data is processed through the shell may request access or deletion through the operating enterprise, or directly through the privacy contact below. We respond within 30 days.',
      ],
    },
    {
      heading: '5. Contact',
      body: [
        'Privacy questions: privacy@platform.dev. Data protection complaints may also be escalated to the Nigeria Data Protection Commission.',
      ],
    },
  ],
};

export default function PrivacyPage() {
  return <LegalPage doc={DOC} />;
}
