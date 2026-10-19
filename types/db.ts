/** Hand-written row types (kept small). Regenerate with `supabase gen types` if you prefer. */
export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "PROPOSAL" | "CONVERTED" | "LOST" | "ARCHIVED";
export type ServiceStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type ContentStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type ProjectStatus = "PLANNING" | "IN_PROGRESS" | "REVIEW" | "REVISION" | "COMPLETED" | "ON_HOLD" | "CANCELLED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE";
export type Channel = "WHATSAPP" | "WEBSITE" | "INTERNAL";
export type ConversationStatus =
  | "UNASSIGNED" | "OPEN" | "IN_PROGRESS" | "WAITING_FOR_CUSTOMER" | "WAITING_FOR_STAFF" | "RESOLVED" | "CLOSED";
export type DeliveryStatus = "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";

export const LEAD_STATUSES: LeadStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "CONVERTED", "LOST", "ARCHIVED"];
export const SERVICE_STATUSES: ServiceStatus[] = ["ACTIVE", "INACTIVE", "ARCHIVED"];
export const CONTENT_STATUSES: ContentStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];
export const PROJECT_STATUSES: ProjectStatus[] = ["PLANNING", "IN_PROGRESS", "REVIEW", "REVISION", "COMPLETED", "ON_HOLD", "CANCELLED"];
export const TASK_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
export const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];
export const CONVERSATION_STATUSES: ConversationStatus[] = [
  "UNASSIGNED", "OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "WAITING_FOR_STAFF", "RESOLVED", "CLOSED",
];

export interface Service {
  id: string; slug: string; title: string; summary: string; description: string;
  pricing_info: string | null; image_url: string | null; cta_label: string; cta_url: string;
  status: ServiceStatus; sort_order: number;
  service_features?: { id: string; label: string; sort_order: number }[];
}
export interface PortfolioItem {
  id: string; slug: string; title: string; description: string; category: string | null;
  client_name: string | null; technologies: string[]; external_url: string | null;
  cover_url: string | null; image_urls: string[]; status: ContentStatus; featured: boolean;
  created_at: string;
}
export interface Customer {
  id: string; profile_id: string | null; full_name: string; email: string | null; phone: string | null;
  company: string | null; created_at: string;
}
export interface Lead {
  id: string; customer_id: string | null; assigned_to: string | null; name: string; email: string;
  phone: string | null; company: string | null; service_id: string | null; service_name: string | null;
  budget: string | null; message: string; source: string; status: LeadStatus; created_at: string;
}
export interface Project {
  id: string; customer_id: string; title: string; description: string; status: ProjectStatus;
  start_date: string | null; deadline: string | null; progress: number; created_at: string; updated_at: string;
}
export interface Task {
  id: string; project_id: string | null; assigned_to: string | null; title: string; description: string;
  priority: TaskPriority; status: TaskStatus; due_date: string | null; created_at: string;
}
export interface Conversation {
  id: string; customer_id: string; channel: Channel; status: ConversationStatus; subject: string | null;
  assigned_to: string | null; whatsapp_contact_id: string | null; last_message_at: string;
  last_message_preview: string | null; created_at: string;
}
export interface Message {
  id: string; conversation_id: string; direction: "INBOUND" | "OUTBOUND"; sender_type: "CUSTOMER" | "STAFF" | "SYSTEM";
  sender_id: string | null; message_type: string; body: string; external_id: string | null;
  delivery_status: DeliveryStatus; error: string | null; created_at: string;
}
export interface InternalNote { id: string; conversation_id: string; author_id: string | null; body: string; created_at: string }
export interface Notification {
  id: string; type: string; title: string; body: string | null; link: string | null; read_at: string | null; created_at: string;
}
export interface ProfileRow {
  id: string; role: "ADMIN" | "STAFF" | "CUSTOMER"; full_name: string; email: string | null; phone: string | null;
  is_active: boolean; created_at: string;
}
export interface FileRow {
  id: string; customer_id: string; project_id: string | null; conversation_id: string | null;
  file_name: string; mime_type: string; size_bytes: number; created_at: string;
}
export interface SiteSettings {
  hero: { headline: string; subheadline: string; primaryCta: string; secondaryCta: string };
  about: { title: string; body: string };
  process: { title: string; description: string }[];
  contact: { email: string; phone: string; address: string };
  social: { label: string; url: string }[];
}
