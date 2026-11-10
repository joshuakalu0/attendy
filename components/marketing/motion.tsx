'use client';

import { useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react';

/**
 * Motion units from prompt_lib/motion_units — applied per unit spec:
 * - letter-blur-fade-slide-up / masked-word-slide-up (text reveals)
 * - cta-slide-in-blur-entrance + staggered list reveals (entrances)
 * - stacking-cards-scroll (features page)
 * - rolling-counter (metric count-ups)
 * - scroll-linked-svg-line-draw (timeline progress)
 * - pointer-follow-glow (CTA glow)
 * All respect prefers-reduced-motion (fallback per unit spec) and the
 * Phase 3 rubric (micro-interactions <= 250ms, standard easings,
 * <= 1 ambient loop per viewport).
 */

export function useInView<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold, rootMargin: '0px 0px -40px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}

/* Entrance reveal — fade + rise + unblur (cta-slide-in-blur-entrance family) */
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`reveal-up ${inView ? 'in-view' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

/* Text reveal — letter-blur-fade-slide-up or masked-word-slide-up.
   Full text kept for screen readers via sr-only; split spans aria-hidden. */
export function SplitText({
  text,
  mode = 'words',
  className = '',
  staggerMs = 80,
}: {
  text: string;
  mode?: 'letters' | 'words';
  className?: string;
  staggerMs?: number;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.3);
  const state = inView ? 'in-view' : '';

  if (mode === 'letters') {
    return (
      <span ref={ref} className={className}>
        <span className="sr-only">{text}</span>
        <span aria-hidden="true">
          {text.split('').map((ch, i) => (
            <span
              key={i}
              className={`letter-in ${state}`}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              {ch === ' ' ? '\u00A0' : ch}
            </span>
          ))}
        </span>
      </span>
    );
  }

  const words = text.split(' ');
  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <span key={i} className="word-mask">
            <span
              className={`word-inner ${state}`}
              style={{ animationDelay: `${i * staggerMs}ms` }}
            >
              {w}
            </span>
            {i < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    </span>
  );
}

/* Rolling counter — counts up from 0 when scrolled into view */
export function Counter({
  to,
  prefix = '',
  suffix = '',
  locale = true,
  durationMs = 1200,
  className = '',
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  locale?: boolean;
  durationMs?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.4);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, durationMs]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {locale ? display.toLocaleString() : display}
      {suffix}
    </span>
  );
}

/* Scroll-linked line draw — timeline rail fills with scroll progress */
export function ScrollProgressLine() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const bar = barRef.current;
    if (!wrap || !bar) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      bar.style.transform = 'scaleY(1)';
      return;
    }
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = wrap.getBoundingClientRect();
        const vh = window.innerHeight;
        const total = r.height - vh;
        const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 1;
        bar.style.transform = `scaleY(${p})`;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-y-0 left-0 w-0.5" aria-hidden="true">
      <div className="absolute inset-0 bg-indigo-200" />
      <div
        ref={barRef}
        className="absolute inset-0 origin-top bg-indigo-600"
        style={{ transform: 'scaleY(0)' }}
      />
    </div>
  );
}

/* Animated FAQ accordion — grid-rows transition, 250ms state transition */
export function FAQAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="rounded-xl border border-slate-200 bg-white p-5">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 text-left font-medium text-slate-900"
            >
              {item.q}
              <span
                className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-transform duration-200  ${isOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m4 6 4 4 4-4" /></svg>
              </span>
            </button>
            <div className={`acc-panel ${isOpen ? 'open' : ''}`}>
              <div>
                <p className="pt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* pointer-follow-glow — one delegated listener drives every [data-glow] element */
export function usePointerGlow() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const target = (e.target as HTMLElement).closest?.('[data-glow]') as HTMLElement | null;
      if (!target) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = target.getBoundingClientRect();
        target.style.setProperty('--x', `${e.clientX - r.left}px`);
        target.style.setProperty('--y', `${e.clientY - r.top}px`);
      });
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* Spotlight (magic-bento) — delegated --mx/--my for every [data-spotlight] card */
export function useSpotlight() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const target = (e.target as HTMLElement).closest?.('[data-spotlight]') as HTMLElement | null;
      if (!target) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = target.getBoundingClientRect();
        target.style.setProperty('--mx', `${e.clientX - r.left}px`);
        target.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    };
    document.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
}

/* Tilt3D — pointer-driven perspective tilt with glare (parallax-tilt-grid family) */
export function Tilt3D({
  children,
  className = '',
  max = 10,
  glare = true,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  glare?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1000px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg)`;
    el.style.setProperty('--gx', `${((px + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty('--gy', `${((py + 0.5) * 100).toFixed(1)}%`);
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
  };

  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={`tilt-3d ${className}`}>
      {children}
      {glare && <span className="tilt-glare" aria-hidden="true" />}
    </div>
  );
}

/* SlotText — slot-machine-word-flip: 3D Rolodex word ticker (preserve-3d) */
export function SlotText({
  words,
  intervalMs = 2500,
  className = '',
}: {
  words: string[];
  intervalMs?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'in' | 'out'>('in');

  useEffect(() => {
    if (prefersReducedMotion() || words.length < 2) return;
    let swapTimer: ReturnType<typeof setTimeout>;
    const id = setInterval(() => {
      setPhase('out');
      swapTimer = setTimeout(() => {
        setIndex((v) => (v + 1) % words.length);
        setPhase('in');
      }, 600);
    }, intervalMs);
    return () => {
      clearInterval(id);
      clearTimeout(swapTimer);
    };
  }, [words.length, intervalMs]);

  return (
    <span className={`slot ${className}`} aria-live="polite">
      <span className="sr-only">{words[index]}</span>
      <span aria-hidden="true" className={`slot-word ${phase}`}>
        {words[index]}
      </span>
    </span>
  );
}

/* Magnetic — element eases toward the pointer and springs back on leave */
export function Magnetic({
  children,
  strength = 0.25,
  className = '',
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  const onMove = (e: ReactPointerEvent<HTMLSpanElement>) => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${(dx * strength).toFixed(1)}px, ${(dy * strength).toFixed(1)}px)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = 'translate(0px, 0px)';
  };

  return (
    <span ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={`magnetic inline-block ${className}`}>
      {children}
    </span>
  );
}

/* useScrollLean — scroll-linked 3D lean (rotateX) for [data-lean] elements */
export function useScrollLean(maxLeanDeg = 6) {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const vh = window.innerHeight;
        document.querySelectorAll<HTMLElement>('[data-lean]').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.bottom < -100 || r.top > vh + 100) return;
          const center = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
          const lean = Math.max(-1, Math.min(1, center)) * maxLeanDeg;
          el.style.transform = `perspective(1000px) rotateX(${(-lean).toFixed(2)}deg)`;
        });
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [maxLeanDeg]);
}

/* AuroraCanvas — waves-shader-field ported to 2D canvas (six drifting crests,
   pointer-intensity boost, DPR cap 1.5, paused off-screen, single frame under
   reduced motion). The one ambient element for its viewport. */
export function AuroraCanvas({
  palette = 'light',
  className = '',
}: {
  palette?: 'light' | 'dark';
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let t = Math.random() * 100;
    let intensity = 0;
    let targetIntensity = 0;
    let visible = true;
    let raf = 0;

    const P =
      palette === 'dark'
        ? { ground: [9, 9, 11], accent: [172, 186, 80], alpha: 0.5 }
        : { ground: [250, 250, 250], accent: [116, 131, 43], alpha: 0.14 };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, r.width * dpr);
      canvas.height = Math.max(1, r.height * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(canvas);

    const BANDS = [
      { f: 1.6, s: 0.9, a: 26, o: 0.32 },
      { f: 2.4, s: -1.3, a: 18, o: 0.26 },
      { f: 3.5, s: 0.7, a: 13, o: 0.2 },
      { f: 5.2, s: -1.8, a: 9, o: 0.14 },
      { f: 7.1, s: 1.2, a: 6, o: 0.09 },
      { f: 9.3, s: -0.6, a: 4, o: 0.05 },
    ];

    const draw = () => {
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      intensity += (targetIntensity - intensity) * 0.06;

      BANDS.forEach((b, bi) => {
        ctx.beginPath();
        const baseY = h * (0.42 + bi * 0.09);
        const warp = Math.sin(t * 0.35) * 10;
        for (let x = 0; x <= w; x += 8) {
          const y =
            baseY +
            Math.sin((x / w) * Math.PI * b.f + t * b.s + warp * (bi % 2 ? 1 : -1)) * b.a;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        const [r, g, bl] = P.accent;
        ctx.fillStyle = `rgba(${r},${g},${bl},${(b.o * P.alpha * 4 * (0.6 + intensity * 0.4)).toFixed(3)})`;
        ctx.fill();
      });
    };

    const loop = () => {
      if (visible && !document.hidden) {
        t += 0.016;
        draw();
      }
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      targetIntensity =
        e.clientY > r.top && e.clientY < r.bottom && e.clientX > r.left && e.clientX < r.right ? 1 : 0;
    };
    document.addEventListener('pointermove', onMove, { passive: true });

    if (reduced) {
      draw();
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('pointermove', onMove);
    };
  }, [palette]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

/* DockMagnify — dock-magnify-tick-rail: items magnify toward the pointer with a
   gaussian falloff (~3 items each side), easing toward target every frame. */
export function DockMagnify({
  items,
  className = '',
  itemClassName = '',
}: {
  items: string[];
  className?: string;
  itemClassName?: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    if (prefersReducedMotion()) return;

    let pointerX: number | null = null;
    let visible = true;
    let raf = 0;
    const scales = items.map(() => 1);

    const onMove = (e: PointerEvent) => {
      const r = rail.getBoundingClientRect();
      pointerX = e.clientX - r.left;
    };
    const onLeave = () => {
      pointerX = null;
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(rail);

    const loop = () => {
      if (visible && !document.hidden) {
        const railRect = rail.getBoundingClientRect();
        const children = Array.from(rail.children) as HTMLElement[];
        children.forEach((el, i) => {
          const r = el.getBoundingClientRect();
          const center = r.left + r.width / 2 - railRect.left;
          let target = 1;
          if (pointerX != null) {
            const d = Math.abs(pointerX - center);
            const sigma = 3 * (r.width + 48);
            target = 1 + Math.exp(-((d / sigma) ** 2)) * 1.0;
          }
          scales[i] += (target - scales[i]) * 0.18;
          el.style.transform = `scale(${scales[i].toFixed(3)}) translateY(${(((1 - scales[i]) * 10)).toFixed(2)}px)`;
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    rail.addEventListener('pointermove', onMove);
    rail.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      rail.removeEventListener('pointermove', onMove);
      rail.removeEventListener('pointerleave', onLeave);
    };
  }, [items]);

  return (
    <div ref={railRef} className={className}>
      {items.map((label) => (
        <div key={label} className={itemClassName}>
          {label}
        </div>
      ))}
    </div>
  );
}

/* RotatingRing — rotating-ring-scroll-timeline (indigo register).
   Ring of nodes rotates with scroll; nodes counter-rotate; conic arc tracks
   progress; hub shows the active entry. Reduced motion: plain vertical list. */
export function RotatingRing({
  entries,
}: {
  entries: { year: string; title: string; desc: string }[];
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const arcRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current;
    const ring = ringRef.current;
    const arc = arcRef.current;
    if (!section || !ring || !arc) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = section.getBoundingClientRect();
        const vh = window.innerHeight;
        const total = r.height - vh;
        const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
        const n = entries.length;
        const totalAngle = 360 - 360 / n;
        const rot = p * totalAngle;
        ring.style.transform = `rotate(${rot}deg)`;
        ring.querySelectorAll<HTMLElement>('[data-node-inner]').forEach((inner) => {
          inner.style.transform = `rotate(${-rot}deg)`;
        });
        arc.style.background = `conic-gradient(#5a671f ${p * 360}deg, rgba(0,0,0,0.08) 0deg)`;
        setActive(Math.min(n - 1, Math.round(p * (n - 1))));
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [reduced, entries.length]);

  if (reduced) {
    return (
      <div className="border-l-2 border-indigo-200 pl-6 space-y-8">
        {entries.map((item) => (
          <div key={item.year}>
            <span className="mb-2 inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">{item.year}</span>
            <h3 className="mb-1 text-lg font-semibold text-slate-900">{item.title}</h3>
            <p className="text-sm leading-relaxed text-slate-600">{item.desc}</p>
          </div>
        ))}
      </div>
    );
  }

  const n = entries.length;
  const radius = 130;
  const entry = entries[active];

  return (
    <div ref={sectionRef} className="relative h-[260vh]">
      <div className="sticky top-0 flex h-screen items-center">
        <div className="mx-auto grid w-full max-w-4xl grid-cols-1 items-center gap-10 px-6 md:grid-cols-2">
          <div className="relative mx-auto" style={{ width: radius * 2 + 80, height: radius * 2 + 80 }}>
            <div
              ref={arcRef}
              className="absolute inset-0 rounded-full"
              style={{
                background: 'conic-gradient(#5a671f 0deg, rgba(0,0,0,0.08) 0deg)',
                WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
                mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
              }}
              aria-hidden="true"
            />
            <div ref={ringRef} className="absolute inset-0" aria-hidden="true">
              {entries.map((e, i) => {
                const angle = (360 / n) * i - 90;
                return (
                  <div
                    key={e.year}
                    className="absolute left-1/2 top-1/2"
                    style={{
                      transform: `rotate(${angle}deg) translate(${radius}px) rotate(${-angle}deg)`,
                    }}
                  >
                    <div data-node-inner className="-ml-6 -mt-6">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-200 ${
                          i === active
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        {e.year.slice(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <span className="mb-3 inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">{entry.year}</span>
            <h3 className="mb-2 text-2xl font-semibold tracking-[-0.02em] text-slate-900 md:text-3xl">
              {entry.title}
            </h3>
            <p className="text-base leading-relaxed text-slate-600">{entry.desc}</p>
            <p className="mt-6 text-xs text-slate-600">
              Scroll to move the ring · step {active + 1} of {n}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
