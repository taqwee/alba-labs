import { z } from "zod";
import {
  CONTENT_STATUSES, CONVERSATION_STATUSES, LEAD_STATUSES, PROJECT_STATUSES,
  SERVICE_STATUSES, TASK_PRIORITIES, TASK_STATUSES,
} from "@/types/db";

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));
const uuid = z.string().uuid();
const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());
const optionalUuid = z.string().optional().transform((v) => (v && v.length > 0 ? v : undefined)).pipe(uuid.optional());
const slug = z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens");
const optionalUrl = z.string().trim().max(500).optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || /^https?:\/\//i.test(v) || v.startsWith("/"), "Enter a full URL starting with https://");
const optionalDate = z.string().optional().transform((v) => (v ? v : undefined))
  .refine((v) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), "Use a valid date");

// ---- auth --------------------------------------------------------------
export const passwordSchema = z.string().min(10, "Use at least 10 characters").max(128);
export const loginSchema = z.object({ email: z.string().trim().email("Enter a valid email"), password: z.string().min(1, "Enter your password") });
export const registerSchema = z.object({
  fullName: text(120).min(2, "Enter your name"),
  email: z.string().trim().email("Enter a valid email"),
  password: passwordSchema,
});
export const forgotSchema = z.object({ email: z.string().trim().email("Enter a valid email") });
export const resetSchema = z.object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

// ---- public contact form -------------------------------------------------
export const contactSchema = z.object({
  name: text(120).min(2, "Enter your name"),
  email: z.string().trim().email("Enter a valid email").max(200),
  phone: optionalText(40),
  company: optionalText(120),
  serviceId: optionalUuid,
  budget: optionalText(80),
  message: text(4000).min(10, "Tell us a little about your project"),
  // Honeypot: real users leave this empty.
  website: z.string().max(0).optional(),
});
export type ContactInput = z.infer<typeof contactSchema>;

// ---- profile -----------------------------------------------------------
export const profileSchema = z.object({
  fullName: text(120).min(2, "Enter your name"),
  phone: optionalText(40),
  company: optionalText(120),
});

// ---- content -----------------------------------------------------------
export const serviceSchema = z.object({
  title: text(120).min(2),
  slug,
  summary: text(300),
  description: text(5000),
  pricingInfo: optionalText(300),
  ctaLabel: text(60).min(1),
  ctaUrl: z.string().trim().min(1).max(300),
  status: z.enum(SERVICE_STATUSES as [string, ...string[]]),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  features: z.string().max(3000).transform((v) => v.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 30)),
});
export const portfolioSchema = z.object({
  title: text(160).min(2),
  slug,
  description: text(5000),
  category: optionalText(80),
  clientName: optionalText(120),
  technologies: z.string().max(500).transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20)),
  externalUrl: optionalUrl,
  status: z.enum(CONTENT_STATUSES as [string, ...string[]]),
  featured: checkbox,
  serviceIds: z.array(uuid).default([]),
});
export const settingsSchema = z.object({
  heroHeadline: text(160).min(1),
  heroSubheadline: text(400),
  heroPrimaryCta: text(40).min(1),
  heroSecondaryCta: text(40).min(1),
  aboutTitle: text(160),
  aboutBody: text(3000),
  contactEmail: z.string().trim().email().or(z.literal("")),
  contactPhone: text(40),
  contactAddress: text(200),
  processSteps: text(3000),
  socialLinks: text(1500),
});

// ---- CRM ------------------------------------------------------------------
export const leadStatusSchema = z.object({ id: uuid, status: z.enum(LEAD_STATUSES as [string, ...string[]]) });
export const projectSchema = z.object({
  customerId: uuid,
  title: text(160).min(2),
  description: text(5000),
  status: z.enum(PROJECT_STATUSES as [string, ...string[]]),
  startDate: optionalDate,
  deadline: optionalDate,
  progress: z.coerce.number().int().min(0).max(100),
  serviceIds: z.array(uuid).default([]),
  memberIds: z.array(uuid).default([]),
});
export const projectUpdateSchema = z.object({
  projectId: uuid,
  body: text(2000).min(1),
  visibleToCustomer: checkbox,
});
export const taskSchema = z.object({
  title: text(160).min(2),
  description: text(2000),
  projectId: optionalUuid,
  assignedTo: optionalUuid,
  priority: z.enum(TASK_PRIORITIES as [string, ...string[]]),
  status: z.enum(TASK_STATUSES as [string, ...string[]]),
  dueDate: optionalDate,
});

// ---- conversations ----------------------------------------------------------
export const messageSchema = z.object({ conversationId: uuid, body: text(4000).min(1, "Write a message first") });
export const noteSchema = z.object({ conversationId: uuid, body: text(4000).min(1, "Write a note first") });
export const statusSchema = z.object({ conversationId: uuid, status: z.enum(CONVERSATION_STATUSES as [string, ...string[]]) });
export const assignSchema = z.object({ conversationId: uuid, staffId: z.string().optional().transform((v) => (v ? v : null)).pipe(uuid.nullable()) });
export const newConversationSchema = z.object({ subject: text(160).min(2, "Add a subject"), body: text(4000).min(1, "Write a message") });

// ---- staff ------------------------------------------------------------------
export const inviteStaffSchema = z.object({
  email: z.string().trim().email(),
  fullName: text(120).min(2),
  jobTitle: optionalText(120),
});

// ---- WhatsApp mock ---------------------------------------------------------------
export const mockInboundSchema = z.object({
  phone: z.string().trim().regex(/^\d{8,15}$/, "Digits only, 8–15 digits, no +"),
  name: text(120).min(1),
  body: text(1000).min(1),
});
