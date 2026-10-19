import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function Page() {
  return (
    <AuthShell title="Reset your password" subtitle="Enter your email and we will send a reset link.">
      <ForgotForm />
    </AuthShell>
  );
}
