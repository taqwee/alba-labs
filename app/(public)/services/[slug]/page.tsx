import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getActiveServices, getServiceBySlug } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { SafeImage } from "@/components/public/safe-image";

export const revalidate = 60;
export async function generateStaticParams() { return (await getActiveServices()).map((s) => ({ slug: s.slug })); }

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const s = await getServiceBySlug(params.slug);
  if (!s) return { title: "Service not found" };
  return pageMetadata({ title: s.title, description: s.summary || s.description.slice(0, 160), path: `/services/${s.slug}`, image: s.image_url });
}

export default async function ServicePage({ params }: { params: { slug: string } }) {
  const s = await getServiceBySlug(params.slug);
  if (!s) notFound();
  const ctaHref = s.cta_url.startsWith("/") || /^https?:\/\//.test(s.cta_url) ? s.cta_url : "/contact";
  return (
    <article className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <Link href="/services" className="text-sm text-muted hover:text-text">← All services</Link>
      <h1 className="mt-4 text-4xl sm:text-5xl">{s.title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">{s.summary}</p>
      {s.image_url && <div className="relative mt-8 aspect-[16/7] overflow-hidden rounded-xl bg-primary/5"><SafeImage src={s.image_url} alt={`${s.title} illustration`} className="object-cover" sizes="100vw" /></div>}
      <div className="mt-10 grid gap-10 md:grid-cols-[2fr_1fr]">
        <div className="max-w-prose whitespace-pre-line text-lg leading-relaxed">{s.description}</div>
        <aside className="space-y-6">
          {s.service_features && s.service_features.length > 0 && (
            <div>
              <h2 className="text-xl">What is included</h2>
              <ul className="mt-3 space-y-2 text-sm">{s.service_features.map((f) => <li key={f.id} className="border-l-2 border-accent pl-3">{f.label}</li>)}</ul>
            </div>
          )}
          {s.pricing_info && <div><h2 className="text-xl">Pricing</h2><p className="mt-2 text-sm text-muted">{s.pricing_info}</p></div>}
          <Link href={ctaHref} className="btn-primary w-full">{s.cta_label}</Link>
        </aside>
      </div>
    </article>
  );
}
