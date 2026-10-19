import { requirePermission } from "@/lib/auth/session";
import { ConversationView } from "@/components/portal/views/conversation-view";

export default async function Page({ params }: { params: { id: string } }) {
  const user = await requirePermission("conversation.read");
  return <ConversationView id={params.id} user={user} base="/staff" />;
}
