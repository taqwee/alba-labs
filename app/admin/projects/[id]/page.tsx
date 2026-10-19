import { requirePermission } from "@/lib/auth/session";
import { ProjectDetail } from "@/components/portal/views/projects";

export default async function Page({ params }: { params: { id: string } }) {
  const user = await requirePermission("project.read");
  return <ProjectDetail id={params.id} user={user} base="/admin" />;
}
