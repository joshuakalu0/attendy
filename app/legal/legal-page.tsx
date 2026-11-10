import SiteHeader from '@/components/marketing/site-header';
import SiteFooter from '@/components/marketing/site-footer';

export interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
}

export function LegalContent({ doc }: { doc: LegalDoc }) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
      <div className="mx-auto max-w-[68ch]">
        <h1 className="mb-3 text-3xl font-semibold tracking-[-0.02em] text-slate-900 md:text-4xl">
          {doc.title}
        </h1>
        <p className="mb-10 text-sm text-slate-600">Last updated: {doc.updated}</p>
        <p className="mb-8 text-base leading-relaxed text-slate-700">{doc.intro}</p>
        {doc.sections.map((section) => (
          <div key={section.heading}>
            <h2 className="mb-3 mt-10 text-2xl font-semibold tracking-[-0.02em] text-slate-900">
              {section.heading}
            </h2>
            {section.body.map((p, i) => (
              <p key={i} className="mb-4 text-base leading-relaxed text-slate-700">{p}</p>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}

export function LegalPage({ doc }: { doc: LegalDoc }) {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <LegalContent doc={doc} />
      <SiteFooter />
    </div>
  );
}
