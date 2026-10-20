import Link from "next/link";
import { getActiveServices, getPublishedPortfolio, getSiteSettings } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { MoonPhase } from "@/components/public/moon"; 
import { ScrollMoon } from "./scroll-moon";
import { SafeImage } from "@/components/public/safe-image";
import { SITE_NAME } from "@/lib/env";

export const revalidate = 60;
export const metadata = pageMetadata({
  title: `${SITE_NAME} — creative and digital agency`,
  description: "Alba Labs Studio is a creative and digital agency for brand identity, design and digital services.",
  path: "/",
});

export default async function HomePage() {
  const [settings, services, work] = await Promise.all([getSiteSettings(), getActiveServices(), getPublishedPortfolio()]);
  const { hero, about, process } = settings;
  const featured = work.slice(0, 3);

  return (
    <>
      <section className="relative overflow-hidden bg-background pt-24 pb-16 sm:pt-32 sm:pb-24 lg:pb-32">
        
        {/* Animated Background Graphics */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* Subtle Tech Grid Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#414141_1px,transparent_1px),linear-gradient(to_bottom,#414141_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30"></div>
        </div>

        {/* Hero Content (Side-by-side layout) */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 flex flex-col lg:flex-row items-center justify-between gap-12">
          
          {/* Left: Text Content */}
          <div className="text-left lg:max-w-xl">
            <h1 className="text-4xl font-bold tracking-tight text-text sm:text-6xl">
              {hero.headline}
            </h1>
            
            <p className="mt-6 text-lg leading-8 text-muted">
              {hero.subheadline}
            </p>
            
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/contact"
                className="rounded-md bg-primary px-7 py-3.5 text-sm font-semibold text-primary-fg shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all duration-300 hover:-translate-y-1"
              >
                {hero.primaryCta}
              </Link>
              <Link
                href="/work"
                className="rounded-md px-7 py-3.5 text-sm font-semibold text-text ring-1 ring-border hover:ring-primary hover:text-primary transition-all duration-300"
              >
                {hero.secondaryCta} <span aria-hidden="true" className="ml-1 opacity-70">→</span>
              </Link>
            </div>
          </div>

          {/* Right: The Animated Moon */}
          <div className="w-full max-w-[350px] lg:max-w-[450px] aspect-square relative drop-shadow-[0_0_60px_rgba(164,234,46,0.15)]">
            <ScrollMoon className="w-full h-full" />
          </div>

        </div>
      </section>

      <section className="mx-auto max-w-page px-4 py-20 sm:px-6" aria-labelledby="services-h">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="services-h" className="text-3xl">What we do</h2>
          <Link href="/services" className="text-sm text-secondary underline-offset-4 hover:underline">All services</Link>
        </div>
        {services.length === 0 ? (
          <p className="mt-6 text-muted">Our services will be listed here soon.</p>
        ) : (
          <ul className="mt-8 divide-y divide-border border-y border-border">
            {services.slice(0, 6).map((s) => (
              <li key={s.id}>
                <Link href={`/services/${s.slug}`} className="grid gap-1 py-5 transition-colors hover:bg-primary/[0.03] sm:grid-cols-[1fr_2fr] sm:gap-8 sm:px-2">
                  <span className="font-display text-xl">{s.title}</span>
                  <span className="text-muted">{s.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="bg-surface" aria-labelledby="about-h">
        <div className="mx-auto grid max-w-page gap-8 px-4 py-20 sm:px-6 md:grid-cols-2">
          <h2 id="about-h" className="text-3xl">{about.title}</h2>
          <div>
            <p className="text-lg text-muted">{about.body}</p>
            <Link href="/about" className="mt-5 inline-block text-sm text-secondary underline-offset-4 hover:underline">More about the studio</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-page px-4 py-20 sm:px-6" aria-labelledby="process-h">
        <h2 id="process-h" className="text-3xl">How a project moves</h2>
        <ol className="mt-10 grid gap-8 text-primary sm:grid-cols-2 lg:grid-cols-5">
  {process.map((step, i) => (
    <li key={step.title}>
      <MoonPhase id={`p${i}`} lit={process.length > 1 ? 1 - (i / (process.length - 1)) : 1} />
      <h3 className="mt-4 text-xl text-text">{i + 1}. {step.title}</h3>
      <p className="mt-1 text-sm text-muted">{step.description}</p>
    </li>
  ))}
</ol>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-page px-4 pb-20 sm:px-6" aria-labelledby="work-h">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="work-h" className="text-3xl">Selected work</h2>
            <Link href="/work" className="text-sm text-secondary underline-offset-4 hover:underline">All work</Link>
          </div>
          <ul className="mt-8 grid gap-6 md:grid-cols-3">
            {featured.map((w) => (
              <li key={w.id}>
                <Link href={`/work/${w.slug}`} className="group block">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-primary/5">
                    {w.cover_url && <SafeImage src={w.cover_url} alt={`${w.title} cover`} className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />}
                  </div>
                  <p className="mt-3 font-display text-lg">{w.title}</p>
                  {w.category && <p className="text-sm text-muted">{w.category}</p>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

{/* --- Option 5 (Reversed & Bold): Dot Matrix Geometrics CTA --- */}
<section className="mx-auto max-w-page px-4 sm:px-6 pb-24">
  <div className="relative overflow-hidden rounded-[2rem] bg-[#a3e635] px-6 py-24 text-center mx-auto w-full shadow-[0_0_40px_rgba(163,230,53,0.15)] border border-[#a3e635]/50">
    
    {/* Black Dot Matrix Quarter-Circle (Top Left) */}
    <div 
      className="absolute top-0 left-0 w-64 h-64 opacity-50 pointer-events-none rounded-br-[100%]"
      style={{
        backgroundImage: 'radial-gradient(#171717 3px, transparent 3px)',
        backgroundSize: '24px 24px'
      }}
    />

    {/* Black Dot Matrix Triangle (Bottom Right) */}
    <div 
      className="absolute bottom-0 right-0 w-64 h-64 opacity-50 pointer-events-none"
      style={{
        backgroundImage: 'radial-gradient(#171717 3px, transparent 3px)',
        backgroundSize: '24px 24px',
        clipPath: 'polygon(100% 100%, 0% 100%, 100% 0%)' 
      }}
    />
    
    {/* Dark accent line at the top to anchor the design */}
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1.5 bg-[#171717] rounded-b-md opacity-90" />

    {/* Content */}
    <div className="relative z-10 flex flex-col items-center">
      <h2 className="text-4xl md:text-5xl font-display font-bold text-[#171717] tracking-tight">
        Have something in mind?
      </h2>
      <p className="mx-auto mt-4 max-w-lg text-lg font-medium text-[#171717]/80">
        Send us a few lines about your project and we will reply with next steps.
      </p>
      
      {/* Dark button with neon text */}
      <Link 
        href="/contact" 
        className="mt-10 inline-flex items-center justify-center rounded-full bg-[#171717] px-8 py-4 text-sm font-bold text-[#a3e635] transition-all hover:scale-105 hover:bg-[#262626] shadow-xl"
      >
        Contact Alba Labs
      </Link>
    </div>
  </div>
</section>
    </>
  );
}