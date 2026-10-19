import { redirect } from "next/navigation";
import { getSessionUser, homePathFor } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Sends each signed-in user to the portal for their role. */
export default async function DashboardRedirect() {
  const user = await getSessionUser();
  redirect(user ? homePathFor(user.role) : "/login");
}
