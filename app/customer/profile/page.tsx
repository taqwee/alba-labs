import { requireRole } from "@/lib/auth/session";
import { ProfileView } from "@/components/portal/views/misc";

export default async function Page() { return <ProfileView user={await requireRole("CUSTOMER")} />; }
