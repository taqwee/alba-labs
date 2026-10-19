"use server";
import { headers } from "next/headers";
import { contactSchema } from "@/lib/validation/schemas";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { isServiceRoleConfigured, isSupabaseConfigured } from "@/lib/env";
import { rateLimit } from "@/lib/utils/rate-limit";
import { activeAdminIds, notify } from "@/lib/notifications";
import { logActivity } from "@/lib/audit";
import { UserError } from "@/lib/utils";
import { parseForm, runAction, type ActionState } from "./shared";

/** Public contact form => LEAD. Uses the service role because visitors are anonymous. */
export async function submitContactAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const forwarded = headers().get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!rateLimit(`contact:${forwarded}`, 5, 10 * 60_000).ok) {
      throw new UserError("Too many messages from your connection. Please try again in a few minutes.");
    }
    if (String(fd.get("website") ?? "") !== "") return "Thanks! We'll be in touch."; // honeypot: pretend success

    const input = parseForm(contactSchema, fd);
    if (!isSupabaseConfigured() || !isServiceRoleConfigured()) {
      throw new UserError("The contact form is not connected yet. Please email us instead.");
    }
    const db = createAdminSupabase();

    let serviceName: string | null = null;
    if (input.serviceId) {
      const { data } = await db.from("services").select("title").eq("id", input.serviceId).maybeSingle();
      serviceName = data?.title ?? null;
    }

    // If a signed-in customer submits, link the lead to their record (never by email alone).
    let customerId: string | null = null;
    const { data: auth } = await createServerSupabase().auth.getUser();
    if (auth.user) {
      const { data } = await db.from("customers").select("id").eq("profile_id", auth.user.id).maybeSingle();
      customerId = data?.id ?? null;
    }

    const { data: lead, error } = await db.from("leads").insert({
      name: input.name, email: input.email, phone: input.phone ?? null, company: input.company ?? null,
      service_id: input.serviceId ?? null, service_name: serviceName, budget: input.budget ?? null,
      message: input.message, source: "WEBSITE", customer_id: customerId,
    }).select("id").single();
    if (error || !lead) { console.error("[lead]", error?.message); throw new UserError("We couldn't send your message. Please try again."); }

    await notify(await activeAdminIds(), {
      type: "NEW_ENQUIRY", title: `New enquiry from ${input.name}`, body: input.message.slice(0, 120), link: "/admin/leads",
    });
    await logActivity({ actorId: null, action: "lead.created", targetType: "lead", targetId: lead.id, metadata: { source: "WEBSITE" } });
    return "Thanks! We'll be in touch soon.";
  });
}
