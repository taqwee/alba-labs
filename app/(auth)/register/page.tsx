import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Create your account", robots: { index: false } };

export default function Page() {
  return (
    <AuthShell title="Create your account" subtitle="Customer accounts give you a private space for projects, files and messages.">
      <RegisterForm />
    </AuthShell>
  );
}
