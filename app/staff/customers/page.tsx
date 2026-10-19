import { requirePermission } from "@/lib/auth/session";
import { CustomersList } from "@/components/portal/views/misc";

export default async function Page({ searchParams }: { searchParams: { q?: string } }) {
  await requirePermission("customer.read");
  return <CustomersList base="/staff/customers" q={searchParams.q} />;
}
