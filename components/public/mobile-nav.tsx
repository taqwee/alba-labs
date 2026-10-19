"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button type="button" className="btn-ghost p-2" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((o) => !o)}>
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open && (
        <nav id="mobile-menu" aria-label="Mobile" className="absolute inset-x-0 top-16 border-b border-border bg-background px-4 pb-4 pt-2 shadow-md">
          <ul className="space-y-1">
            {items.map((i) => (
              <li key={i.href}><Link href={i.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 hover:bg-primary/5">{i.label}</Link></li>
            ))}
            <li><Link href="/login" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 hover:bg-primary/5">Client login</Link></li>
            <li><Link href="/contact" onClick={() => setOpen(false)} className="btn-primary mt-2 w-full">Start a project</Link></li>
          </ul>
        </nav>
      )}
    </div>
  );
}
