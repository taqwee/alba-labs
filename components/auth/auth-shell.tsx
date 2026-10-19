import Link from "next/link";
import type { ReactNode } from "react";
import { SITE_NAME, isSupabaseConfigured } from "@/lib/env";
import { Notice } from "@/components/ui/basics";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main id="main" className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 block text-center font-display text-2xl">{SITE_NAME}</Link>
        <div className="card p-6 sm:p-8">
          <h1 className="text-2xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          {!isSupabaseConfigured() && (
            <div className="mt-4"><Notice>Supabase is not configured yet. Add your keys to .env.local (see README) to enable sign-in.</Notice></div>
          )}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
