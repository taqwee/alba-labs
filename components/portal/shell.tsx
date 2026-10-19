import Link from "next/link";
import type { ReactNode } from "react";
import { Bell } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";
import { SITE_NAME } from "@/lib/env";
import type { Permission } from "@/lib/permissions";
import { initials } from "@/lib/utils";
import { RealtimeRefresh } from "@/components/ui/realtime-refresh";
import { PortalNav } from "./portal-nav";

export interface NavItem { href: string; label: string; permission?: Permission; group?: string }

export function PortalShell({ user, base, items, unread, children }: {
  user: SessionUser; base: string; items: NavItem[]; unread: number; children: ReactNode;
}) {
  const visible = items.filter((i) => !i.permission || user.permissions.has(i.permission));
  const roleLabel = user.role === "ADMIN" ? "Admin" : user.role === "STAFF" ? "Staff" : "Customer";
  return (
    <div className="min-h-screen md:grid md:grid-cols-[15rem_1fr]">
      <RealtimeRefresh table="notifications" filter={`recipient_id=eq.${user.id}`} />
      <aside className="border-b border-border bg-surface md:sticky md:top-0 md:h-screen md:overflow-y-auto md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-3 md:block md:py-5">
          <Link href={base} className="font-display text-xl">{SITE_NAME}</Link>
          <p className="hidden text-xs text-muted md:block">{roleLabel} portal</p>
        </div>
        <PortalNav items={visible} base={base} />
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-end gap-3 border-b border-border bg-surface px-4 py-3 sm:px-6">
          <Link href={`${base}/notifications`} className="btn-ghost relative p-2" aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}>
            <Bell className="h-5 w-5" aria-hidden />
            {unread > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[1.1rem] rounded-full bg-error px-1 text-center text-[10px] font-semibold leading-[1.1rem] text-white">{unread > 99 ? "99+" : unread}</span>}
          </Link>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-fg" aria-hidden>{initials(user.fullName)}</span>
          <span className="hidden text-sm sm:block">{user.fullName || user.email}</span>
          <form action="/auth/signout" method="post"><button className="btn-ghost btn-sm" type="submit">Sign out</button></form>
        </header>
        <main id="main" className="mx-auto max-w-6xl p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
