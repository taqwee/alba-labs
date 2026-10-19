import { requirePermission } from "@/lib/auth/session";
import { CustomerDetail } from "@/components/portal/views/misc";

export default async function Page({ params }: { params: { id: string } }) {
  const user = await requirePermission("customer.read");
  return <CustomerDetail id={params.id} user={user} base="/admin" />;
}
