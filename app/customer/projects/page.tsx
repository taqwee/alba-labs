import { requireRole } from "@/lib/auth/session";
import { ProjectsList } from "@/components/portal/views/projects";

export default async function Page() {
  const user = await requireRole("CUSTOMER");
  return <ProjectsList base="/customer" user={user} />;
}
