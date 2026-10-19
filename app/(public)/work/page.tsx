import Link from "next/link";
import { getPublishedPortfolio } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { SafeImage } from "@/components/public/safe-image";
import { EmptyState } from "@/components/ui/basics";

export const revalidate = 60;
export const metadata = pageMetadata({ title: "Work", description: "Selected projects from Lunomi Studio.", path: "/work" });

export default async function WorkPage() {
  const items = await getPublishedPortfolio();
  return (
    <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">Work</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">Projects we have published.</p>
      {items.length === 0 ? (
        <div className="mt-10"><EmptyState title="No projects published yet" description="Our portfolio will appear here once projects are added." action={<Link href="/contact" className="btn-primary">Start a project</Link>} /></div>
      ) : (
        <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((w) => (
            <li key={w.id}>
              <Link href={`/work/${w.slug}`} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-primary/5">
                  {w.cover_url && <SafeImage src={w.cover_url} alt={`${w.title} cover`} className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />}
                </div>
                <p className="mt-3 font-display text-xl">{w.title}</p>
                {w.category && <p className="text-sm text-muted">{w.category}</p>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
