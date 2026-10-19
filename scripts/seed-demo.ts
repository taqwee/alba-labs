/**
 * DEVELOPMENT ONLY. Creates demo users + demo records through Supabase's admin API.
 *   npm run seed:demo
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment
 * (use `node --env-file=.env.local` or export them). Refuses to run against production.
 * All demo accounts share a throwaway password — never use this on a live project.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PASSWORD = process.env.DEMO_PASSWORD ?? "LunomiDemo!2024";

if (!url || !key) { console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first."); process.exit(1); }
if (process.env.ALLOW_DEMO_SEED !== "1") {
  console.error("This creates accounts with a publicly known password.\nRe-run with ALLOW_DEMO_SEED=1 to confirm this is a DEVELOPMENT project.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function user(email: string, fullName: string, role: "ADMIN" | "STAFF" | "CUSTOMER") {
  const { data: existing } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
  let id = existing?.id as string | undefined;
  if (!id) {
    const { data, error } = await db.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: fullName } });
    if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);
    id = data.user.id;
  }
  await db.from("profiles").update({ role, full_name: fullName }).eq("id", id);
  if (role !== "CUSTOMER") {
    await db.from("customers").delete().eq("profile_id", id);
    if (role === "STAFF") await db.from("staff_profiles").upsert({ profile_id: id, job_title: "Designer (demo)" });
  }
  return id;
}

async function main() {
  const admin = await user("admin@demo.lunomi.test", "Demo Admin", "ADMIN");
  const staff1 = await user("staff.one@demo.lunomi.test", "Demo Staff One", "STAFF");
  const staff2 = await user("staff.two@demo.lunomi.test", "Demo Staff Two", "STAFF");
  const custA = await user("customer.a@demo.lunomi.test", "Demo Customer A", "CUSTOMER");
  const custB = await user("customer.b@demo.lunomi.test", "Demo Customer B", "CUSTOMER");

  const customerOf = async (profileId: string) => (await db.from("customers").select("id").eq("profile_id", profileId).single()).data!.id as string;
  const cA = await customerOf(custA);
  const cB = await customerOf(custB);

  const { data: svc } = await db.from("services").select("id").eq("slug", "logo-design").maybeSingle();

  if (!(await db.from("leads").select("id").eq("email", "lead@demo.lunomi.test").maybeSingle()).data) {
    await db.from("leads").insert({ name: "Demo Lead", email: "lead@demo.lunomi.test", company: "Demo Co", service_id: svc?.id ?? null, service_name: "Logo Design", message: "DEMO: We need a logo for our new cafe.", source: "WEBSITE" });
  }

  if (!(await db.from("projects").select("id").eq("customer_id", cA).eq("title", "Demo brand identity").maybeSingle()).data) {
    const { data: p } = await db.from("projects").insert({ customer_id: cA, title: "Demo brand identity", description: "DEMO project.", status: "IN_PROGRESS", progress: 40, created_by: admin }).select("id").single();
    if (p) {
      await db.from("project_members").insert({ project_id: p.id, staff_id: staff1 });
      await db.from("project_updates").insert({ project_id: p.id, author_id: staff1, body: "DEMO: First concepts are ready for review.", visible_to_customer: true });
      await db.from("tasks").insert({ project_id: p.id, assigned_to: staff1, title: "Prepare concept round 1", priority: "HIGH", status: "IN_PROGRESS", created_by: admin });
    }
  }

  async function conversation(customerId: string, staffId: string, subject: string, lines: [("CUSTOMER" | "STAFF"), string][]) {
    if ((await db.from("conversations").select("id").eq("customer_id", customerId).eq("subject", subject).maybeSingle()).data) return;
    const { data: c } = await db.from("conversations").insert({ customer_id: customerId, channel: "WEBSITE", subject, assigned_to: staffId, status: "OPEN" }).select("id").single();
    if (!c) return;
    await db.from("conversation_assignments").insert({ conversation_id: c.id, to_staff_id: staffId, changed_by: admin });
    for (const [who, body] of lines) {
      await db.from("messages").insert(who === "CUSTOMER"
        ? { conversation_id: c.id, direction: "INBOUND", sender_type: "CUSTOMER", body, delivery_status: "DELIVERED" }
        : { conversation_id: c.id, direction: "OUTBOUND", sender_type: "STAFF", sender_id: staffId, body, delivery_status: "SENT" });
    }
    await db.from("internal_notes").insert({ conversation_id: c.id, author_id: staffId, body: "DEMO internal note: confirm budget before sending a proposal." });
  }
  await conversation(cA, staff1, "Demo: logo question", [["CUSTOMER", "DEMO: Hi, can I see the colour options?"], ["STAFF", "DEMO: Of course — I will share them today."]]);
  await conversation(cB, staff2, "Demo: invoice question", [["CUSTOMER", "DEMO: When will the draft be ready?"]]);

  console.log(`\nDemo data ready. Password for every account: ${PASSWORD}\n  admin.  admin@demo.lunomi.test\n  staff.  staff.one@demo.lunomi.test / staff.two@demo.lunomi.test\n  client. customer.a@demo.lunomi.test / customer.b@demo.lunomi.test\n`);
}
main().catch((e) => { console.error(e); process.exit(1); });
