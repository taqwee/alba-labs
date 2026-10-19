import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/basics";
import { ProjectForm } from "@/components/portal/views/projects";

export default async function Page() {
  const user = await requirePermission("project.manage");
  return (<><PageHeader title="New project" /><ProjectForm user={user} /></>);
}
