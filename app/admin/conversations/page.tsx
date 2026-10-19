import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/basics";
import { ConversationList } from "@/components/portal/views/conversation-list";

export default async function Page({ searchParams }: { searchParams: { status?: string; assigned?: string } }) {
  await requirePermission("conversation.manage");
  return (<><PageHeader title="Conversations" description="Every conversation across all channels. Opening one is read-only unless it is assigned to you." /><ConversationList base="/admin/conversations" filter={searchParams} /></>);
}
