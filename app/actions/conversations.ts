"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assertRole, getSessionUser, AuthorizationError } from "@/lib/auth/session";
import * as convo from "@/lib/conversations/service";
import { assignSchema, messageSchema, newConversationSchema, noteSchema, statusSchema } from "@/lib/validation/schemas";
import type { ConversationStatus } from "@/types/db";
import { parseForm, runAction, type ActionState } from "./shared";

const refresh = () => revalidatePath("/", "layout");

export async function replyAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertRole("ADMIN", "STAFF");
    const input = parseForm(messageSchema, fd);
    const { warning } = await convo.sendReply(user, input.conversationId, input.body);
    refresh();
    return warning ?? "Message sent";
  });
}

export async function noteAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertRole("ADMIN", "STAFF");
    const input = parseForm(noteSchema, fd);
    await convo.addInternalNote(user, input.conversationId, input.body);
    refresh();
    return "Internal note saved";
  });
}

export async function statusAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertRole("ADMIN", "STAFF");
    const input = parseForm(statusSchema, fd);
    await convo.changeStatus(user, input.conversationId, input.status as ConversationStatus);
    refresh();
    return "Status updated";
  });
}

export async function assignAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertRole("ADMIN", "STAFF");
    const input = parseForm(assignSchema, fd);
    await convo.assignConversation(user, input.conversationId, input.staffId);
    refresh();
    return input.staffId ? "Conversation assigned" : "Conversation unassigned";
  });
}

export async function customerReplyAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertRole("CUSTOMER");
    const input = parseForm(messageSchema, fd);
    await convo.sendCustomerMessage(user, input.conversationId, input.body);
    refresh();
    return "Message sent";
  });
}

export async function newConversationAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let id = "";
  const result = await runAction(async () => {
    const user = await getSessionUser();
    if (!user) throw new AuthorizationError("Please sign in first.");
    const input = parseForm(newConversationSchema, fd);
    id = await convo.startCustomerConversation(user, input.subject, input.body);
    refresh();
  });
  if (result?.ok && id) redirect(`/customer/messages/${id}`);
  return result;
}
