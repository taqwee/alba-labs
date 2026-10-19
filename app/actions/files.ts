"use server";
import { revalidatePath } from "next/cache";
import { getSessionUser, AuthorizationError } from "@/lib/auth/session";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { isServiceRoleConfigured } from "@/lib/env";
import { buildStoragePath, validateUpload } from "@/lib/files";
import { activeAdminIds, notify } from "@/lib/notifications";
import { logActivity } from "@/lib/audit";
import { rateLimit } from "@/lib/utils/rate-limit";
import { UserError } from "@/lib/utils";
import { runAction, type ActionState } from "./shared";

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Upload to the PRIVATE bucket after validating type, magic bytes and size. */
export async function uploadFileAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await getSessionUser();
    if (!user) throw new AuthorizationError("Please sign in first.");
    if (!isServiceRoleConfigured()) throw new UserError("File storage is not configured on this server.");
    if (!rateLimit(`upload:${user.id}`, 20, 60_000).ok) throw new UserError("Too many uploads. Please wait a moment.");

    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) throw new UserError("Choose a file to upload.");

    const customerId = user.role === "CUSTOMER" ? user.customerId : String(fd.get("customerId") ?? "");
    if (!customerId || !uuidRe.test(customerId)) throw new UserError("Choose which customer this file belongs to.");
    const projectIdRaw = String(fd.get("projectId") ?? "");
    const projectId = uuidRe.test(projectIdRaw) ? projectIdRaw : null;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const check = validateUpload(file.name, file.type, bytes);
    if (!check.ok) throw new UserError(check.error ?? "That file is not allowed.");

    const path = buildStoragePath(customerId, file.name);
    const admin = createAdminSupabase();
    const { error: uploadError } = await admin.storage.from("private-files").upload(path, bytes, { contentType: check.mime, upsert: false });
    if (uploadError) { console.error("[upload]", uploadError.message); throw new UserError("The file could not be uploaded."); }

    // Row is inserted with the USER's client so RLS proves they may attach files to this customer.
    const { data: row, error } = await createServerSupabase().from("files").insert({
      customer_id: customerId, project_id: projectId, uploaded_by: user.id, storage_path: path,
      file_name: file.name.slice(0, 200), mime_type: check.mime, size_bytes: bytes.byteLength,
    }).select("id").single();
    if (error || !row) {
      await admin.storage.from("private-files").remove([path]);
      throw new AuthorizationError("You cannot upload files for this customer.");
    }

    if (user.role === "CUSTOMER") {
      await notify(await activeAdminIds(), {
        type: "CUSTOMER_FILE_UPLOADED", title: `${user.fullName || "A customer"} uploaded a file`, body: file.name, link: "/admin/files",
      });
    }
    await logActivity({ actorId: user.id, action: "file.uploaded", targetType: "file", targetId: row.id, metadata: { name: file.name, size: bytes.byteLength } });
    revalidatePath("/", "layout");
    return "File uploaded";
  });
}
