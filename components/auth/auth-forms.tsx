"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { forgotSchema, loginSchema, registerSchema, resetSchema } from "@/lib/validation/schemas";
import { Field } from "@/components/ui/basics";
import { useToast } from "@/components/ui/toast";
import { publicEnv } from "@/lib/env";
import { safeNextPath } from "@/lib/utils";

const friendly = (msg: string) =>
  /invalid login/i.test(msg) ? "Email or password is incorrect."
  : /not confirmed/i.test(msg) ? "Please confirm your email first — check your inbox."
  : /rate|too many/i.test(msg) ? "Too many attempts. Please wait a few minutes."
  : "We couldn't complete that. Please try again.";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });
  const onSubmit = handleSubmit(async (v) => {
    setBusy(true);
    const { error } = await createBrowserSupabase().auth.signInWithPassword(v);
    if (error) { setBusy(false); show("error", friendly(error.message)); return; }
    router.replace(safeNextPath(next));
    router.refresh();
  });
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Email" htmlFor="email" error={errors.email?.message}><input id="email" type="email" autoComplete="email" className="input" {...register("email")} /></Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message}><input id="password" type="password" autoComplete="current-password" className="input" {...register("password")} /></Field>
      <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? "Signing in…" : "Sign in"}</button>
      <p className="flex justify-between text-sm"><Link href="/forgot-password" className="text-secondary hover:underline">Forgot password?</Link><Link href="/register" className="text-secondary hover:underline">Create account</Link></p>
    </form>
  );
}

export function RegisterForm() {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) });
  const onSubmit = handleSubmit(async (v) => {
    setBusy(true);
    const { data, error } = await createBrowserSupabase().auth.signUp({
      email: v.email, password: v.password,
      options: { data: { full_name: v.fullName }, emailRedirectTo: `${publicEnv.siteUrl}/auth/callback?next=/dashboard` },
    });
    setBusy(false);
    if (error) { show("error", friendly(error.message)); return; }
    // Supabase returns an obfuscated user for existing emails; we show the same message either way.
    void data; setSent(true);
  });
  if (sent) return <p role="status" className="text-sm">Check your inbox. If this email can be registered, we sent a link to confirm your account.</p>;
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message}><input id="fullName" autoComplete="name" className="input" {...register("fullName")} /></Field>
      <Field label="Email" htmlFor="email" error={errors.email?.message}><input id="email" type="email" autoComplete="email" className="input" {...register("email")} /></Field>
      <Field label="Password" htmlFor="password" hint="At least 10 characters." error={errors.password?.message}><input id="password" type="password" autoComplete="new-password" className="input" {...register("password")} /></Field>
      <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? "Creating account…" : "Create account"}</button>
      <p className="text-sm">Already registered? <Link href="/login" className="text-secondary hover:underline">Sign in</Link></p>
    </form>
  );
}

export function ForgotForm() {
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema) });
  const onSubmit = handleSubmit(async (v) => {
    setBusy(true);
    const { error } = await createBrowserSupabase().auth.resetPasswordForEmail(v.email, { redirectTo: `${publicEnv.siteUrl}/auth/callback?next=/reset-password` });
    setBusy(false);
    if (error && /rate|too many/i.test(error.message)) { show("error", friendly(error.message)); return; }
    setSent(true);
  });
  if (sent) return <p role="status" className="text-sm">If an account exists for that email, a reset link is on its way.</p>;
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="Email" htmlFor="email" error={errors.email?.message}><input id="email" type="email" autoComplete="email" className="input" {...register("email")} /></Field>
      <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? "Sending…" : "Send reset link"}</button>
      <p className="text-sm"><Link href="/login" className="text-secondary hover:underline">Back to sign in</Link></p>
    </form>
  );
}

export function ResetForm() {
  const router = useRouter();
  const { show } = useToast();
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema) });
  const onSubmit = handleSubmit(async (v) => {
    setBusy(true);
    const { error } = await createBrowserSupabase().auth.updateUser({ password: v.password });
    if (error) { setBusy(false); show("error", "That link may have expired. Request a new reset email."); return; }
    show("success", "Password updated");
    router.replace("/dashboard");
    router.refresh();
  });
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <Field label="New password" htmlFor="password" hint="At least 10 characters." error={errors.password?.message}><input id="password" type="password" autoComplete="new-password" className="input" {...register("password")} /></Field>
      <Field label="Confirm password" htmlFor="confirm" error={errors.confirm?.message}><input id="confirm" type="password" autoComplete="new-password" className="input" {...register("confirm")} /></Field>
      <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? "Saving…" : "Set password"}</button>
    </form>
  );
}
