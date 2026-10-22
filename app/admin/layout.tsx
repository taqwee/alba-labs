import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/session";
import { PortalShell, type NavItem } from "@/components/portal/shell";
import { unreadCount } from "@/lib/portal";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

const ITEMS: NavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/leads", label: "Leads", group: "CRM", permission: "lead.read" },
  { href: "/admin/customers", label: "Customers", group: "CRM", permission: "customer.read" },
  { href: "/admin/conversations", label: "Conversations", group: "CRM", permission: "conversation.manage" },
  { href: "/admin/projects", label: "Projects", group: "Projects", permission: "project.manage" },
  { href: "/admin/tasks", label: "Tasks", group: "Projects", permission: "task.manage" },
  { href: "/admin/services", label: "Services", group: "Content", permission: "service.manage" },
  { href: "/admin/portfolio", label: "Portfolio", group: "Content", permission: "portfolio.manage" },
  { href: "/admin/files", label: "Files", group: "Content", permission: "customer.manage" },
  { href: "/admin/whatsapp", label: "WhatsApp", group: "Communication", permission: "whatsapp.manage" },
  { href: "/admin/staff", label: "Staff", group: "Management", permission: "staff.manage" },
  
  // ---> NEW QUOTATIONS LINK ADDED HERE <---
  { href: "/admin/quotation", label: "Billing", group: "Management" },
  
  { href: "/admin/notifications", label: "Notifications", group: "Management" },
  { href: "/admin/activity", label: "Activity log", group: "Management", permission: "audit.read" },
  { href: "/admin/settings", label: "Settings", group: "Settings", permission: "settings.manage" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("ADMIN");
  return <PortalShell user={user} base="/admin" items={ITEMS} unread={await unreadCount(user.id)}>{children}</PortalShell>;
}