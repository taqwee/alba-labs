import Link from "next/link";
import { SITE_NAME } from "@/lib/env";
import type { SiteSettings } from "@/types/db";
import { NAV } from "./site-header";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const { contact, social } = settings;
  
  return (
    <footer className="mt-24 border-t border-neutral-800 bg-neutral-900">
      <div className="mx-auto grid max-w-page gap-12 px-4 py-16 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-display text-2xl text-neutral-100">{SITE_NAME}</p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-neutral-400">
            {settings.about.title}
          </p>
        </div>
        
        <nav aria-label="Footer">
          <p className="text-sm font-medium text-neutral-100">Explore</p>
          <ul className="mt-4 space-y-3 text-sm text-neutral-400">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="transition-colors hover:text-primary">
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/login" className="transition-colors hover:text-primary">
                Client login
              </Link>
            </li>
          </ul>
        </nav>
        
        <div>
          <p className="text-sm font-medium text-neutral-100">Contact</p>
          <ul className="mt-4 space-y-3 text-sm text-neutral-400">
            {contact.email && (
              <li>
                <a href={`mailto:${contact.email}`} className="transition-colors hover:text-primary">
                  {contact.email}
                </a>
              </li>
            )}
            {contact.phone && <li>{contact.phone}</li>}
            {contact.address && <li>{contact.address}</li>}
            {!contact.email && !contact.phone && (
              <li>
                <Link href="/contact" className="transition-colors hover:text-primary">
                  Send us a message
                </Link>
              </li>
            )}
            {social.map((s) => (
              <li key={s.url}>
                <a href={s.url} rel="noopener noreferrer" target="_blank" className="transition-colors hover:text-primary">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="border-t border-neutral-800">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs text-neutral-500 sm:px-6">
          <p>© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
          <p className="flex gap-6">
            <Link href="/privacy" className="transition-colors hover:text-primary">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-primary">Terms</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}