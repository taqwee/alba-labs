import { requireRole } from "@/lib/auth/session";
import { FilesView } from "@/components/portal/views/misc";

export default async function Page() { return <FilesView user={await requireRole("CUSTOMER")} />; }
