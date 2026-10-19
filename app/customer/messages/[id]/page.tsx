import { requireRole } from "@/lib/auth/session";
import { ConversationView } from "@/components/portal/views/conversation-view";

export default async function Page({ params }: { params: { id: string } }) {
  const user = await requireRole("CUSTOMER");
  return <ConversationView id={params.id} user={user} base="/customer" />;
}
