import { requirePermission } from "@/lib/auth/session";
import { PageHeader } from "@/components/ui/basics";
import { ConversationList } from "@/components/portal/views/conversation-list";

export default async function Page({ searchParams }: { searchParams: { status?: string; assigned?: string } }) {
  await requirePermission("conversation.read");
  return (<><PageHeader title="My conversations" description="Conversations assigned to you." /><ConversationList base="/staff/conversations" filter={searchParams} /></>);
}
