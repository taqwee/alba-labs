import "server-only";
import { isRedirectError } from "next/dist/client/components/redirect";
import type { ZodTypeAny, z } from "zod";
import { friendlyError, UserError } from "@/lib/utils";

export type ActionState = { ok: true; message?: string; nonce: number } | { ok: false; error: string; nonce: number } | null;

const ok = (message?: string): ActionState => ({ ok: true, message, nonce: Date.now() });
const fail = (error: string): ActionState => ({ ok: false, error, nonce: Date.now() });

/** Runs an action body; converts thrown errors into friendly results. Redirects pass through. */
export async function runAction(body: () => Promise<string | void>): Promise<ActionState> {
  try {
    const message = await body();
    return ok(message || undefined);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (!(error instanceof UserError) && !(error instanceof Error && error.name === "AuthorizationError")) {
      console.error("[action]", error instanceof Error ? error.message : error);
    }
    return fail(friendlyError(error));
  }
}

/** FormData -> plain object (repeated keys become arrays; `arrays` are always arrays). */
export function formToObject(fd: FormData, arrays: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(fd.keys())) {
    if (key.startsWith("$ACTION")) continue;
    const values = fd.getAll(key).filter((v): v is string => typeof v === "string");
    out[key] = arrays.includes(key) || values.length > 1 ? values : values[0];
  }
  for (const key of arrays) if (!(key in out)) out[key] = [];
  return out;
}

/** Validates form data with Zod; throws a UserError with the first friendly message. */
export function parseForm<S extends ZodTypeAny>(schema: S, fd: FormData, arrays: string[] = []): z.infer<S> {
  const result = schema.safeParse(formToObject(fd, arrays));
  if (!result.success) throw new UserError(result.error.issues[0]?.message ?? "Please check the form and try again.");
  return result.data;
}
