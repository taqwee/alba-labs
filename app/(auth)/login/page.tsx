import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Client login", robots: { index: false } };

export default function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  return (
    <AuthShell title="Client login" subtitle="Sign in to see your projects and messages.">
      <LoginForm next={searchParams.next} />
    </AuthShell>
  );
}
