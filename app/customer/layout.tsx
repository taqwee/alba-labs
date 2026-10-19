import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/session";
import { PortalShell, type NavItem } from "@/components/portal/shell";
import { unreadCount } from "@/lib/portal";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

const ITEMS: NavItem[] = [
  { href: "/customer", label: "Dashboard" },
  { href: "/customer/projects", label: "Projects" },
  { href: "/customer/messages", label: "Messages" },
  { href: "/customer/files", label: "Files" },
  { href: "/customer/profile", label: "Profile" },
  { href: "/customer/notifications", label: "Notifications" },
];

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("CUSTOMER");
  return <PortalShell user={user} base="/customer" items={ITEMS} unread={await unreadCount(user.id)}>{children}</PortalShell>;
}
