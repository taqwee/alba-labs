import { requireRole } from "@/lib/auth/session";
import { ProjectDetail } from "@/components/portal/views/projects";

export default async function Page({ params }: { params: { id: string } }) {
  const user = await requireRole("CUSTOMER");
  return <ProjectDetail id={params.id} user={user} base="/customer" />;
}
