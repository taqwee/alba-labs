"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { assertPermission, assertRole } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isServiceRoleConfigured, publicEnv } from "@/lib/env";
import { logActivity } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { linkContactToCustomer } from "@/lib/conversations/service";
import { validateUpload } from "@/lib/files";
import { getWhatsAppMode } from "@/lib/whatsapp/config";
import { extractEvents, type WebhookPayload } from "@/lib/whatsapp/parse";
import { processWhatsAppEvents } from "@/lib/whatsapp/processor";
import { createSupabaseWhatsAppStore } from "@/lib/whatsapp/supabase-store";
import { isPermission } from "@/lib/permissions";
import { UserError } from "@/lib/utils";
import {
  inviteStaffSchema, leadStatusSchema, mockInboundSchema, portfolioSchema, projectSchema,
  projectUpdateSchema, serviceSchema, settingsSchema, taskSchema,
} from "@/lib/validation/schemas";
import { parseForm, runAction, type ActionState } from "./shared";
import { randomUUID } from "node:crypto";

const refresh = () => revalidatePath("/", "layout");
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const idOf = (fd: FormData) => { const v = String(fd.get("id") ?? ""); return uuidRe.test(v) ? v : null; };

/** Public images (services / portfolio). Only real images are accepted. */
async function uploadPublicImage(file: FormDataEntryValue | null, folder: string): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!isServiceRoleConfigured()) throw new UserError("Image storage is not configured on this server.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = validateUpload(file.name, file.type, bytes);
  if (!check.ok || !["png", "jpg", "jpeg", "webp", "gif"].includes(check.extension ?? "")) {
    throw new UserError(check.error && !check.ok ? check.error : "Upload a PNG, JPG, WebP or GIF image.");
  }
  if (bytes.byteLength > 5 * 1024 * 1024) throw new UserError("Images can be up to 5 MB.");
  const path = `${folder}/${randomUUID()}.${check.extension === "jpeg" ? "jpg" : check.extension}`;
  const admin = createAdminSupabase();
  const { error } = await admin.storage.from("public-assets").upload(path, bytes, { contentType: check.mime, upsert: false });
  if (error) { console.error("[image]", error.message); throw new UserError("The image could not be uploaded."); }
  return admin.storage.from("public-assets").getPublicUrl(path).data.publicUrl;
}

// ---------------- services ----------------
export async function saveServiceAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let savedId: string | null = null;
  const result = await runAction(async () => {
    const user = await assertPermission("service.manage");
    const input = parseForm(serviceSchema, fd);
    const supabase = createServerSupabase();
    const id = idOf(fd);
    const imageUrl = await uploadPublicImage(fd.get("image"), "services");

    const row = {
      title: input.title, slug: input.slug, summary: input.summary, description: input.description,
      pricing_info: input.pricingInfo ?? null, cta_label: input.ctaLabel, cta_url: input.ctaUrl,
      status: input.status, sort_order: input.sortOrder, ...(imageUrl ? { image_url: imageUrl } : {}),
    };
    const q = id ? supabase.from("services").update(row).eq("id", id) : supabase.from("services").insert(row);
    const { data, error } = await q.select("id").single();
    if (error || !data) {
      throw new UserError(error?.code === "23505" ? "That slug is already used by another service." : "The service could not be saved.");
    }
    savedId = data.id;
    await supabase.from("service_features").delete().eq("service_id", data.id);
    if (input.features.length) {
      await supabase.from("service_features").insert(input.features.map((label, i) => ({ service_id: data.id, label, sort_order: i })));
    }
    await logActivity({ actorId: user.id, action: id ? "service.updated" : "service.created", targetType: "service", targetId: data.id, metadata: { title: input.title, status: input.status } });
    refresh();
    return "Service saved";
  });
  if (result?.ok && savedId && !idOf(fd)) redirect(`/admin/services/${savedId}`);
  return result;
}

export async function setServiceStatusAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("service.manage");
    const status = String(fd.get("status"));
    const id = idOf(fd);
    if (!id || !["ACTIVE", "INACTIVE", "ARCHIVED"].includes(status)) throw new UserError("Invalid request.");
    const { error } = await createServerSupabase().from("services").update({ status }).eq("id", id);
    if (error) throw new UserError("The service could not be updated.");
    await logActivity({ actorId: user.id, action: "service.status_changed", targetType: "service", targetId: id, metadata: { status } });
    refresh();
    return "Service updated";
  });
}

// ---------------- portfolio ----------------
export async function savePortfolioAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let savedId: string | null = null;
  const result = await runAction(async () => {
    const user = await assertPermission("portfolio.manage");
    const input = parseForm(portfolioSchema, fd, ["serviceIds"]);
    const supabase = createServerSupabase();
    const id = idOf(fd);
    const cover = await uploadPublicImage(fd.get("cover"), "portfolio");
    const extra: string[] = [];
    for (const f of fd.getAll("images")) { const url = await uploadPublicImage(f, "portfolio"); if (url) extra.push(url); }

    let existingImages: string[] = [];
    if (id) {
      const { data } = await supabase.from("portfolio_items").select("image_urls").eq("id", id).maybeSingle();
      existingImages = (data?.image_urls as string[] | undefined) ?? [];
    }
    const row = {
      title: input.title, slug: input.slug, description: input.description, category: input.category ?? null,
      client_name: input.clientName ?? null, technologies: input.technologies, external_url: input.externalUrl ?? null,
      status: input.status, featured: input.featured, image_urls: [...existingImages, ...extra], ...(cover ? { cover_url: cover } : {}),
    };
    const q = id ? supabase.from("portfolio_items").update(row).eq("id", id) : supabase.from("portfolio_items").insert(row);
    const { data, error } = await q.select("id").single();
    if (error || !data) throw new UserError(error?.code === "23505" ? "That slug is already used." : "The project could not be saved.");
    savedId = data.id;
    await supabase.from("portfolio_services").delete().eq("portfolio_id", data.id);
    if (input.serviceIds.length) await supabase.from("portfolio_services").insert(input.serviceIds.map((service_id) => ({ portfolio_id: data.id, service_id })));
    await logActivity({ actorId: user.id, action: id ? "portfolio.updated" : "portfolio.created", targetType: "portfolio", targetId: data.id, metadata: { title: input.title, status: input.status } });
    refresh();
    return "Portfolio item saved";
  });
  if (result?.ok && savedId && !idOf(fd)) redirect(`/admin/portfolio/${savedId}`);
  return result;
}

// ---------------- leads ----------------
export async function updateLeadStatusAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("lead.manage");
    const input = parseForm(leadStatusSchema, fd);
    const { error } = await createServerSupabase().from("leads").update({ status: input.status }).eq("id", input.id);
    if (error) throw new UserError("The lead could not be updated.");
    await logActivity({ actorId: user.id, action: "lead.status_changed", targetType: "lead", targetId: input.id, metadata: { status: input.status } });
    refresh();
    return "Lead updated";
  });
}

// ---------------- customers ----------------
export async function saveCustomerAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("customer.manage");
    const id = idOf(fd);
    if (!id) throw new UserError("Invalid customer.");
    const clean = (k: string) => String(fd.get(k) ?? "").trim().slice(0, 200) || null;
    const name = clean("fullName");
    if (!name) throw new UserError("Enter the customer's name.");
    const { error } = await createServerSupabase().from("customers")
      .update({ full_name: name, email: clean("email"), phone: clean("phone"), company: clean("company") }).eq("id", id);
    if (error) throw new UserError("The customer could not be saved.");
    await logActivity({ actorId: user.id, action: "customer.updated", targetType: "customer", targetId: id });
    refresh();
    return "Customer saved";
  });
}

export async function linkContactAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("customer.manage");
    const contactId = String(fd.get("contactId") ?? "");
    const customerId = String(fd.get("customerId") ?? "");
    if (!uuidRe.test(contactId) || !uuidRe.test(customerId)) throw new UserError("Choose a customer to link.");
    await linkContactToCustomer(user, contactId, customerId);
    refresh();
    return "WhatsApp contact linked";
  });
}

// ---------------- projects / tasks ----------------
export async function saveProjectAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let savedId: string | null = null;
  const result = await runAction(async () => {
    const user = await assertPermission("project.manage");
    const input = parseForm(projectSchema, fd, ["serviceIds", "memberIds"]);
    const supabase = createServerSupabase();
    const id = idOf(fd);
    const row = {
      customer_id: input.customerId, title: input.title, description: input.description, status: input.status,
      start_date: input.startDate ?? null, deadline: input.deadline ?? null, progress: input.progress,
    };
    const q = id ? supabase.from("projects").update(row).eq("id", id) : supabase.from("projects").insert({ ...row, created_by: user.id });
    const { data, error } = await q.select("id").single();
    if (error || !data) throw new UserError("The project could not be saved.");
    savedId = data.id;
    await supabase.from("project_services").delete().eq("project_id", data.id);
    if (input.serviceIds.length) await supabase.from("project_services").insert(input.serviceIds.map((service_id) => ({ project_id: data.id, service_id })));
    const { data: before } = await supabase.from("project_members").select("staff_id").eq("project_id", data.id);
    await supabase.from("project_members").delete().eq("project_id", data.id);
    if (input.memberIds.length) await supabase.from("project_members").insert(input.memberIds.map((staff_id) => ({ project_id: data.id, staff_id })));
    const previous = new Set((before ?? []).map((m: { staff_id: string }) => m.staff_id));
    await notify(input.memberIds.filter((m) => !previous.has(m)), { type: "PROJECT_UPDATED", title: `You were added to ${input.title}`, link: "/staff/projects" });
    await logActivity({ actorId: user.id, action: id ? "project.updated" : "project.created", targetType: "project", targetId: data.id, metadata: { title: input.title, status: input.status } });
    refresh();
    return "Project saved";
  });
  if (result?.ok && savedId && !idOf(fd)) redirect(`/admin/projects/${savedId}`);
  return result;
}

/** Staff on the project (project.update) or admins post updates; customers see the visible ones. */
export async function addProjectUpdateAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertRole("ADMIN", "STAFF");
    const input = parseForm(projectUpdateSchema, fd);
    const supabase = createServerSupabase();
    const { error } = await supabase.from("project_updates").insert({
      project_id: input.projectId, author_id: user.id, body: input.body, visible_to_customer: input.visibleToCustomer,
    });
    if (error) throw new UserError("You cannot post updates to this project.");
    if (input.visibleToCustomer) {
      const { data: p } = await supabase.from("projects").select("title, customers(profile_id)").eq("id", input.projectId).maybeSingle();
      const profileId = (p as unknown as { customers: { profile_id: string | null } | null } | null)?.customers?.profile_id;
      if (profileId) await notify([profileId], { type: "PROJECT_UPDATED", title: `Update on ${p?.title}`, body: input.body.slice(0, 120), link: `/customer/projects/${input.projectId}` });
    }
    await logActivity({ actorId: user.id, action: "project.update_posted", targetType: "project", targetId: input.projectId });
    refresh();
    return "Update posted";
  });
}

export async function updateProjectProgressAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertRole("ADMIN", "STAFF");
    const id = idOf(fd);
    const progress = Number(fd.get("progress"));
    const status = String(fd.get("status"));
    if (!id || !Number.isInteger(progress) || progress < 0 || progress > 100) throw new UserError("Enter progress from 0 to 100.");
    const { data, error } = await createServerSupabase().from("projects").update({ progress, status }).eq("id", id).select("id").maybeSingle();
    if (error || !data) throw new UserError("You cannot update this project.");
    await logActivity({ actorId: user.id, action: "project.progress_updated", targetType: "project", targetId: id, metadata: { progress, status } });
    refresh();
    return "Project updated";
  });
}

export async function saveTaskAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("task.manage");
    const input = parseForm(taskSchema, fd);
    const supabase = createServerSupabase();
    const id = idOf(fd);
    const row = {
      title: input.title, description: input.description, project_id: input.projectId ?? null,
      assigned_to: input.assignedTo ?? null, priority: input.priority, status: input.status, due_date: input.dueDate ?? null,
    };
    const q = id ? supabase.from("tasks").update(row).eq("id", id) : supabase.from("tasks").insert({ ...row, created_by: user.id });
    const { data, error } = await q.select("id").single();
    if (error || !data) throw new UserError("The task could not be saved.");
    if (input.assignedTo) await notify([input.assignedTo], { type: "TASK_ASSIGNED", title: `Task assigned: ${input.title}`, link: "/staff/tasks" });
    await logActivity({ actorId: user.id, action: id ? "task.updated" : "task.created", targetType: "task", targetId: data.id });
    refresh();
    return "Task saved";
  });
}

/** Staff can move their own tasks between statuses. */
export async function updateTaskStatusAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertRole("ADMIN", "STAFF");
    const id = idOf(fd);
    const status = String(fd.get("status"));
    if (!id || !["TODO", "IN_PROGRESS", "BLOCKED", "DONE"].includes(status)) throw new UserError("Invalid request.");
    const { data, error } = await createServerSupabase().from("tasks").update({ status }).eq("id", id).select("id").maybeSingle();
    if (error || !data) throw new UserError("You cannot update this task.");
    await logActivity({ actorId: user.id, action: "task.status_changed", targetType: "task", targetId: id, metadata: { status } });
    refresh();
    return "Task updated";
  });
}

// ---------------- staff ----------------
export async function inviteStaffAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("staff.manage");
    if (!isServiceRoleConfigured()) throw new UserError("Inviting staff needs SUPABASE_SERVICE_ROLE_KEY on the server.");
    const input = parseForm(inviteStaffSchema, fd);
    const admin = createAdminSupabase();

    const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
      data: { full_name: input.fullName },
      redirectTo: `${publicEnv.siteUrl}/auth/callback?next=/reset-password`,
    });
    if (error || !data.user) {
      console.error("[invite]", error?.message);
      throw new UserError(/already/i.test(error?.message ?? "") ? "That email already has an account." : "The invitation could not be sent.");
    }
    const uid = data.user.id;
    // The signup trigger made a CUSTOMER; promote to STAFF and drop the customer record.
    await admin.from("profiles").update({ role: "STAFF", full_name: input.fullName }).eq("id", uid);
    await admin.from("customers").delete().eq("profile_id", uid);
    await admin.from("staff_profiles").upsert({ profile_id: uid, job_title: input.jobTitle ?? null });
    await logActivity({ actorId: user.id, action: "staff.invited", targetType: "staff", targetId: uid, metadata: { email: input.email } });
    refresh();
    return "Invitation sent";
  });
}

export async function setStaffActiveAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("staff.manage");
    const id = idOf(fd);
    const active = String(fd.get("active")) === "true";
    if (!id) throw new UserError("Invalid staff member.");
    if (id === user.id) throw new UserError("You cannot deactivate your own account.");
    const { error } = await createServerSupabase().from("profiles").update({ is_active: active }).eq("id", id).in("role", ["STAFF"]);
    if (error) throw new UserError("The staff member could not be updated.");
    await logActivity({ actorId: user.id, action: active ? "staff.activated" : "staff.deactivated", targetType: "staff", targetId: id });
    refresh();
    return active ? "Staff member activated" : "Staff member deactivated";
  });
}

export async function setStaffPermissionsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("staff.manage");
    const id = idOf(fd);
    if (!id) throw new UserError("Invalid staff member.");
    const granted = fd.getAll("permissions").map(String).filter(isPermission);
    const supabase = createServerSupabase();
    await supabase.from("profile_permissions").delete().eq("profile_id", id);
    if (granted.length) await supabase.from("profile_permissions").insert(granted.map((permission_key) => ({ profile_id: id, permission_key })));
    await logActivity({ actorId: user.id, action: "staff.permissions_changed", targetType: "staff", targetId: id, metadata: { granted } });
    refresh();
    return "Permissions saved";
  });
}

// ---------------- settings ----------------
export async function saveSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("settings.manage");
    const input = parseForm(settingsSchema, fd);
    const pairs = (raw: string) => raw.split("\n").map((l) => l.split("|").map((p) => p.trim())).filter((p) => p[0]);
    const value = {
      hero: { headline: input.heroHeadline, subheadline: input.heroSubheadline, primaryCta: input.heroPrimaryCta, secondaryCta: input.heroSecondaryCta },
      about: { title: input.aboutTitle, body: input.aboutBody },
      process: pairs(input.processSteps).slice(0, 8).map(([title, description]) => ({ title, description: description ?? "" })),
      contact: { email: input.contactEmail, phone: input.contactPhone, address: input.contactAddress },
      social: pairs(input.socialLinks).filter((p) => p[1] && /^https?:\/\//i.test(p[1])).slice(0, 8).map(([label, url]) => ({ label, url })),
    };
    const { error } = await createServerSupabase().from("site_settings").upsert({ key: "site", value });
    if (error) throw new UserError("Settings could not be saved.");
    await logActivity({ actorId: user.id, action: "settings.updated", targetType: "settings", targetId: "site" });
    revalidatePath("/", "layout");
    return "Settings saved";
  });
}

// ---------------- WhatsApp mock mode ----------------
/** Simulates "customer sends a WhatsApp message" through the SAME pipeline as the real webhook. */
export async function mockInboundAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertPermission("whatsapp.manage");
    if (getWhatsAppMode() !== "mock") throw new UserError("Mock mode is off. Set WHATSAPP_MODE=mock to use the simulator.");
    if (!isServiceRoleConfigured()) throw new UserError("SUPABASE_SERVICE_ROLE_KEY is required for the simulator.");
    const input = parseForm(mockInboundSchema, fd);
    const waId = `999${input.phone}`.slice(0, 15); // obviously-fake prefix: mock numbers can never equal real ones we message
    const payload: WebhookPayload = {
      object: "whatsapp_business_account",
      entry: [{ changes: [{ field: "messages", value: {
        contacts: [{ wa_id: waId, profile: { name: input.name } }],
        messages: [{ id: `mock.in.${randomUUID()}`, from: waId, timestamp: String(Math.floor(Date.now() / 1000)), type: "text", text: { body: input.body } }],
      } }] }],
    };
    const store = createSupabaseWhatsAppStore(createAdminSupabase());
    const res = await processWhatsAppEvents(extractEvents(payload), store, payload, { isMock: true });
    if (res.failed) throw new UserError("The simulated message could not be processed.");
    await logActivity({ actorId: user.id, action: "whatsapp.mock_inbound", targetType: "whatsapp_contact", targetId: waId });
    refresh();
    return "Simulated message received";
  });
}
