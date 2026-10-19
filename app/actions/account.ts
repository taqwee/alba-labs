"use server";
import { revalidatePath } from "next/cache";
import { getSessionUser, AuthorizationError } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/validation/schemas";
import { UserError } from "@/lib/utils";
import { parseForm, runAction, type ActionState } from "./shared";

export async function updateProfileAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await getSessionUser();
    if (!user) throw new AuthorizationError("Please sign in first.");
    const input = parseForm(profileSchema, fd);
    const supabase = createServerSupabase();
    const { error } = await supabase.from("profiles").update({ full_name: input.fullName, phone: input.phone ?? null }).eq("id", user.id);
    if (error) throw new UserError("Your profile could not be saved.");
    if (user.role === "CUSTOMER") {
      await supabase.from("customers").update({ full_name: input.fullName, phone: input.phone ?? null, company: input.company ?? null }).eq("profile_id", user.id);
    }
    revalidatePath("/", "layout");
    return "Profile saved";
  });
}

export async function markNotificationsReadAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await getSessionUser();
    if (!user) throw new AuthorizationError("Please sign in first.");
    const id = String(fd.get("id") ?? "");
    const q = createServerSupabase().from("notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", user.id).is("read_at", null);
    await (id ? q.eq("id", id) : q);
    revalidatePath("/", "layout");
  });
}
