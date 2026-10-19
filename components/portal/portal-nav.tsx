"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function PortalNav({ items, base }: { items: { href: string; label: string; group?: string }[]; base: string }) {
  const pathname = usePathname();
  const active = (href: string) => (href === base ? pathname === base : pathname === href || pathname.startsWith(href + "/"));
  let lastGroup: string | undefined;
  return (
    <nav aria-label="Portal" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible md:pb-6">
      {items.map((i) => {
        const heading = i.group && i.group !== lastGroup ? i.group : null;
        lastGroup = i.group ?? lastGroup;
        return (
          <div key={i.href} className="shrink-0 md:shrink">
            {heading && <p className="hidden px-3 pb-1 pt-4 text-xs font-medium text-muted md:block">{heading}</p>}
            <Link href={i.href} aria-current={active(i.href) ? "page" : undefined}
              className={cn("block whitespace-nowrap rounded-lg px-3 py-2 text-sm", active(i.href) ? "bg-primary text-primary-fg" : "text-muted hover:bg-primary/5 hover:text-text")}>
              {i.label}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}
