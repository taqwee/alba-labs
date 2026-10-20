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
      <Link href="/" className="flex items-center h-12" aria-label={`${SITE_NAME} home`}>
  <img 
    src="/alba-logo_6.svg" 
    alt="Alba Labs" 
    className="h-10 w-auto scale-[4] origin-left" 
  />
</Link>
<nav aria-label="Main" className="hidden items-center gap-6 md:flex">
  {NAV.map((n) => (
    <Link key={n.href} href={n.href} className="text-sm text-muted hover:text-text">{n.label}</Link>
  ))}
</nav>
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login" className="btn-ghost btn-sm">login</Link>
          <Link href="/contact" className="btn-primary btn-sm">Start a project</Link>
        </div>
        <MobileNav items={NAV} />
      </div>
    </header>
  );
}
