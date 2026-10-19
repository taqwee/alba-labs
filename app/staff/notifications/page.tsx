import { requireRole } from "@/lib/auth/session";
import { NotificationsView } from "@/components/portal/views/misc";

export default async function Page() {
  const user = await requireRole("STAFF");
  return <NotificationsView user={user} />;
}
