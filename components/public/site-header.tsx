import Link from "next/link";
import { SITE_NAME } from "@/lib/env";
import { MobileNav } from "./mobile-nav";

export const NAV = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-page items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-xl" aria-label={`${SITE_NAME} home`}>
          <span aria-hidden className="inline-block h-5 w-5 rounded-full bg-accent shadow-[inset_-6px_0_0_0_rgb(var(--color-primary))]" />
          {SITE_NAME}
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
          {NAV.slice(1).map((n) => (
            <Link key={n.href} href={n.href} className="text-sm text-muted hover:text-text">{n.label}</Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login" className="btn-ghost btn-sm">Client login</Link>
          <Link href="/contact" className="btn-primary btn-sm">Start a project</Link>
        </div>
        <MobileNav items={NAV} />
      </div>
    </header>
  );
}
