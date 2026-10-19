import { requireRole } from "@/lib/auth/session";
import { ProfileView } from "@/components/portal/views/misc";

export default async function Page() {
  const user = await requireRole("STAFF");
  return <ProfileView user={user} />;
}
