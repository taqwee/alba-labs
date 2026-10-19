import type { Permission, Role } from "./index";

/** Minimal shapes so these rules are pure and unit-testable. */
export interface Actor {
  id: string;
  role: Role;
  customerId: string | null;
  permissions: ReadonlySet<Permission>;
}
export interface ConversationAccessInfo {
  customerId: string;
  assignedTo: string | null;
  channel: "WHATSAPP" | "WEBSITE" | "INTERNAL";
}

/** Mirrors can_staff_read_conversation()/can_read_conversation() in SQL. */
export function canViewConversation(actor: Actor, c: ConversationAccessInfo): boolean {
  if (actor.role === "CUSTOMER") return actor.customerId === c.customerId && c.channel !== "INTERNAL";
  if (actor.permissions.has("conversation.manage")) return true;
  return actor.permissions.has("conversation.read") && c.assignedTo === actor.id;
}

/** Mirrors can_reply_conversation(): only the assignee replies — even admins. */
export function canReplyToConversation(actor: Actor, c: ConversationAccessInfo): boolean {
  if (actor.role === "CUSTOMER") return false;
  return actor.permissions.has("conversation.reply") && c.assignedTo === actor.id;
}

export function canSeeInternalNotes(actor: Actor, c: ConversationAccessInfo): boolean {
  return actor.role !== "CUSTOMER" && canViewConversation(actor, c);
}

export function canAssignConversation(actor: Actor): boolean {
  return actor.role !== "CUSTOMER" && actor.permissions.has("conversation.assign");
}
