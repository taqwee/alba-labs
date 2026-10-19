import { requirePermission } from "@/lib/auth/session";
import { ProjectsList } from "@/components/portal/views/projects";

export default async function Page() {
  const user = await requirePermission("project.read");
  return <ProjectsList base="/admin" user={user} />;
}
