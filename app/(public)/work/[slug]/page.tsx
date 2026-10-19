import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPortfolioBySlug, getPublishedPortfolio } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { SafeImage } from "@/components/public/safe-image";

export const revalidate = 60;
export async function generateStaticParams() { return (await getPublishedPortfolio()).map((p) => ({ slug: p.slug })); }

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getPortfolioBySlug(params.slug);
  if (!p) return { title: "Project not found" };
  return pageMetadata({ title: p.title, description: p.description.slice(0, 160) || p.title, path: `/work/${p.slug}`, image: p.cover_url });
}

export default async function WorkItemPage({ params }: { params: { slug: string } }) {
  const p = await getPortfolioBySlug(params.slug);
  if (!p) notFound();
  const images = [p.cover_url, ...p.image_urls].filter((u): u is string => Boolean(u));
  return (
    <article className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <Link href="/work" className="text-sm text-muted hover:text-text">← All work</Link>
      <h1 className="mt-4 text-4xl sm:text-5xl">{p.title}</h1>
      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted">
        {p.category && <div><dt className="inline">Category: </dt><dd className="inline text-text">{p.category}</dd></div>}
        {p.client_name && <div><dt className="inline">Client: </dt><dd className="inline text-text">{p.client_name}</dd></div>}
        {p.technologies.length > 0 && <div><dt className="inline">Built with: </dt><dd className="inline text-text">{p.technologies.join(", ")}</dd></div>}
      </dl>
      <p className="mt-6 max-w-prose whitespace-pre-line text-lg leading-relaxed">{p.description}</p>
      {p.external_url && <a href={p.external_url} rel="noopener noreferrer" target="_blank" className="btn-outline mt-6">Visit project</a>}
      {images.length > 0 && (
        <ul className="mt-10 grid gap-6 md:grid-cols-2">
          {images.map((src, i) => (
            <li key={src} className="relative aspect-[4/3] overflow-hidden rounded-xl bg-primary/5">
              <SafeImage src={src} alt={`${p.title} — image ${i + 1}`} className="object-cover" sizes="(min-width: 768px) 50vw, 100vw" />
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
