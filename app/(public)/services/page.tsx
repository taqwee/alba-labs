import Link from "next/link";
import { getActiveServices } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { EmptyState } from "@/components/ui/basics";

export const revalidate = 60;
export const metadata = pageMetadata({ title: "Services", description: "The creative and digital services Lunomi Studio offers.", path: "/services" });

export default async function ServicesPage() {
  const services = await getActiveServices();
  return (
    <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">Services</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">What we can build with you.</p>
      {services.length === 0 ? (
        <div className="mt-10"><EmptyState title="Services are coming soon" description="We are preparing this list. Get in touch and tell us what you need." action={<Link href="/contact" className="btn-primary">Contact us</Link>} /></div>
      ) : (
        <ul className="mt-10 divide-y divide-border border-y border-border">
          {services.map((s) => (
            <li key={s.id} className="grid gap-4 py-8 md:grid-cols-[1fr_2fr]">
              <h2 className="text-2xl"><Link href={`/services/${s.slug}`} className="hover:text-secondary">{s.title}</Link></h2>
              <div>
                <p className="text-muted">{s.summary}</p>
                {s.service_features && s.service_features.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {s.service_features.slice(0, 5).map((f) => <li key={f.id} className="rounded-full bg-primary/5 px-3 py-1 text-xs text-muted">{f.label}</li>)}
                  </ul>
                )}
                <Link href={`/services/${s.slug}`} className="mt-4 inline-block text-sm text-secondary underline-offset-4 hover:underline">Learn more</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
