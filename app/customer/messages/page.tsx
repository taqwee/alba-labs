import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui/basics";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { newConversationAction } from "@/app/actions/conversations";
import { timeAgo } from "@/lib/utils";

export default async function Page() {
  await requireRole("CUSTOMER");
  const { data } = await createServerSupabase().from("conversations")
    .select("id, subject, channel, status, last_message_at, last_message_preview").order("last_message_at", { ascending: false });
  const rows = data ?? [];
  return (
    <>
      <PageHeader title="Messages" description="Talk to the Lunomi Studio team." />
      <ActionForm action={newConversationAction} className="card mb-6 space-y-3 p-4">
        <h2 className="text-lg">Start a conversation</h2>
        <div><label htmlFor="subject" className="label">Subject</label><input id="subject" name="subject" required maxLength={160} className="input" /></div>
        <div><label htmlFor="body" className="label">Message</label><textarea id="body" name="body" rows={3} required maxLength={4000} className="input" /></div>
        <SubmitButton pendingText="Sending…">Send message</SubmitButton>
      </ActionForm>
      {rows.length === 0 ? <EmptyState title="No conversations yet" description="Send us a message above and we will reply here." /> : (
        <ul className="card divide-y divide-border">{rows.map((c) => (
          <li key={c.id}><Link href={`/customer/messages/${c.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-primary/[0.03]">
            <span><span className="font-medium">{c.subject ?? "Conversation"}</span><span className="block text-sm text-muted">{c.last_message_preview}</span></span>
            <span className="text-right"><StatusBadge value={c.status} /><span className="mt-1 block text-xs text-muted">{timeAgo(c.last_message_at)}</span></span></Link></li>))}
        </ul>
      )}
    </>
  );
}
