import { requirePermission } from "@/lib/auth/session";
import { TasksView } from "@/components/portal/views/misc";

export default async function Page() {
  const user = await requirePermission("task.read");
  return <TasksView user={user} />;
}
