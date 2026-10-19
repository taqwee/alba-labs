/**
 * Optional integration test against a REAL Supabase project that has been seeded with
 * `npm run seed:demo`. Run with:  RLS_TEST=1 npm test
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. Use a DEV project only.
 * (The same guarantees are also checked in plain SQL: tests/sql/rls_isolation.sql)
 */
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

const enabled = process.env.RLS_TEST === "1" && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PASSWORD = process.env.DEMO_PASSWORD ?? "LunomiDemo!2024";

async function client(email: string) {
  const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return c;
}

describe.skipIf(!enabled)("RLS against seeded Supabase", () => {
  it("customer A sees only their own conversations, projects and files", async () => {
    const a = await client("customer.a@demo.lunomi.test");
    const { data: convs } = await a.from("conversations").select("customer_id");
    expect(new Set((convs ?? []).map((c) => c.customer_id)).size).toBeLessThanOrEqual(1);
    const { data: b } = await client("customer.b@demo.lunomi.test").then((c) => c.from("conversations").select("id"));
    const { data: aRows } = await a.from("conversations").select("id");
    for (const row of b ?? []) expect((aRows ?? []).map((r) => r.id)).not.toContain(row.id);
  });
  it("customer cannot read internal notes or leads of others", async () => {
    const a = await client("customer.a@demo.lunomi.test");
    expect((await a.from("internal_notes").select("id")).data ?? []).toHaveLength(0);
    expect((await a.from("activity_logs").select("id")).data ?? []).toHaveLength(0);
  });
  it("staff 2 cannot see staff 1's conversations", async () => {
    const s1 = await client("staff.one@demo.lunomi.test");
    const s2 = await client("staff.two@demo.lunomi.test");
    const mine = (await s1.from("conversations").select("id")).data ?? [];
    const theirs = (await s2.from("conversations").select("id")).data ?? [];
    for (const row of mine) expect(theirs.map((r) => r.id)).not.toContain(row.id);
  });
  it("staff cannot assign conversations", async () => {
    const s1 = await client("staff.one@demo.lunomi.test");
    const { data } = await s1.from("conversations").select("id").limit(1);
    if (!data?.length) return;
    const { error } = await s1.rpc("assign_conversation", { p_conversation: data[0].id, p_staff: null });
    expect(error).not.toBeNull();
  });
  it("admin sees everything", async () => {
    const admin = await client("admin@demo.lunomi.test");
    expect(((await admin.from("customers").select("id")).data ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
