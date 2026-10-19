import { requireRole } from "@/lib/auth/session";
import { NotificationsView } from "@/components/portal/views/misc";

export default async function Page() { return <NotificationsView user={await requireRole("CUSTOMER")} />; }
