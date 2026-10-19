import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/session";
import { PortalShell, type NavItem } from "@/components/portal/shell";
import { unreadCount } from "@/lib/portal";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

const ITEMS: NavItem[] = [
  { href: "/staff", label: "Dashboard" },
  { href: "/staff/conversations", label: "My conversations", permission: "conversation.read" },
  { href: "/staff/customers", label: "Customers", permission: "customer.read" },
  { href: "/staff/projects", label: "Projects", permission: "project.read" },
  { href: "/staff/tasks", label: "Tasks", permission: "task.read" },
  { href: "/staff/notifications", label: "Notifications" },
  { href: "/staff/profile", label: "Profile" },
];

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("STAFF");
  return <PortalShell user={user} base="/staff" items={ITEMS} unread={await unreadCount(user.id)}>{children}</PortalShell>;
}
