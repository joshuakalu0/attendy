import { SplitText } from './motion';

export default function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <section className="border-b border-indigo-100 bg-indigo-50">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <p className="mb-3 text-sm font-medium uppercase tracking-wide text-indigo-700">{eyebrow}</p>
        <h1 className="mb-4 text-4xl font-semibold tracking-[-0.02em] text-slate-900 md:text-5xl">
          <SplitText text={title} mode="words" />
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">{subtitle}</p>
      </div>
    </section>
  );
}
