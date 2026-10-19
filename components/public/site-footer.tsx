import Link from "next/link";
import { SITE_NAME } from "@/lib/env";
import type { SiteSettings } from "@/types/db";
import { NAV } from "./site-header";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const { contact, social } = settings;
  return (
    <footer className="mt-24 bg-primary text-primary-fg">
      <div className="mx-auto grid max-w-page gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-display text-2xl">{SITE_NAME}</p>
          <p className="mt-3 max-w-sm text-sm text-primary-fg/70">{settings.about.title}</p>
        </div>
        <nav aria-label="Footer">
          <p className="text-sm font-medium">Explore</p>
          <ul className="mt-3 space-y-2 text-sm text-primary-fg/70">
            {NAV.map((n) => <li key={n.href}><Link href={n.href} className="hover:text-primary-fg">{n.label}</Link></li>)}
            <li><Link href="/login" className="hover:text-primary-fg">Client login</Link></li>
          </ul>
        </nav>
        <div>
          <p className="text-sm font-medium">Contact</p>
          <ul className="mt-3 space-y-2 text-sm text-primary-fg/70">
            {contact.email && <li><a href={`mailto:${contact.email}`} className="hover:text-primary-fg">{contact.email}</a></li>}
            {contact.phone && <li>{contact.phone}</li>}
            {contact.address && <li>{contact.address}</li>}
            {!contact.email && !contact.phone && <li><Link href="/contact" className="hover:text-primary-fg">Send us a message</Link></li>}
            {social.map((s) => <li key={s.url}><a href={s.url} rel="noopener noreferrer" target="_blank" className="hover:text-primary-fg">{s.label}</a></li>)}
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-fg/15">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-primary-fg/60 sm:px-6">
          <p>© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
          <p className="flex gap-4"><Link href="/privacy" className="hover:text-primary-fg">Privacy</Link><Link href="/terms" className="hover:text-primary-fg">Terms</Link></p>
        </div>
      </div>
    </footer>
  );
}
