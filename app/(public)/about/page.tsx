import Link from "next/link";
import { getSiteSettings } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 60;
export const metadata = pageMetadata({ title: "About", description: "About Lunomi Studio, a creative and digital agency.", path: "/about" });

export default async function AboutPage() {
  const { about, process } = await getSiteSettings();
  return (
    <div className="mx-auto max-w-page px-4 py-16 sm:px-6">
      <h1 className="text-4xl sm:text-5xl">About Lunomi Studio</h1>
      <div className="mt-8 grid gap-10 md:grid-cols-2">
        <h2 className="text-2xl">{about.title}</h2>
        <p className="whitespace-pre-line text-lg leading-relaxed text-muted">{about.body}</p>
      </div>
      <h2 className="mt-16 text-2xl">How we work</h2>
      <ol className="mt-6 divide-y divide-border border-y border-border">
        {process.map((s, i) => (
          <li key={s.title} className="grid gap-1 py-4 sm:grid-cols-[3rem_1fr_2fr]">
            <span className="text-muted">{i + 1}</span><span className="font-display text-lg">{s.title}</span><span className="text-muted">{s.description}</span>
          </li>
        ))}
      </ol>
      <Link href="/contact" className="btn-primary mt-10">Work with us</Link>
    </div>
  );
}
