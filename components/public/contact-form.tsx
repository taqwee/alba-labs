"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactSchema, type ContactInput } from "@/lib/validation/schemas";
import { submitContactAction } from "@/app/actions/public";
import { Field } from "@/components/ui/basics";
import { useToast } from "@/components/ui/toast";

const BUDGETS = ["Not sure yet", "Under $500", "$500 – $2,000", "$2,000 – $5,000", "$5,000+"];

export function ContactForm({ services }: { services: { id: string; title: string }[] }) {
  const { show } = useToast();
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<ContactInput>({ resolver: zodResolver(contactSchema) });

  const onSubmit = handleSubmit((values) => {
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => { if (typeof v === "string") fd.set(k, v); });
    start(async () => {
      const res = await submitContactAction(null, fd);
      if (res?.ok) setDone(true);
      else show("error", res?.error ?? "Something went wrong. Please try again.");
    });
  });

  if (done) {
    return (
      <div role="status" className="card p-8">
        <h2 className="text-2xl">Thank you</h2>
        <p className="mt-2 text-muted">Your message is with us. We will reply by email as soon as we can.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="card space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" error={errors.name?.message}><input id="name" autoComplete="name" className="input" {...register("name")} /></Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message}><input id="email" type="email" autoComplete="email" className="input" {...register("email")} /></Field>
        <Field label="Phone (optional)" htmlFor="phone" error={errors.phone?.message}><input id="phone" type="tel" autoComplete="tel" className="input" {...register("phone")} /></Field>
        <Field label="Company (optional)" htmlFor="company" error={errors.company?.message}><input id="company" autoComplete="organization" className="input" {...register("company")} /></Field>
        <Field label="Service" htmlFor="serviceId" error={errors.serviceId?.message}>
          <select id="serviceId" className="input" {...register("serviceId")}>
            <option value="">Not sure yet</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </Field>
        <Field label="Budget (optional)" htmlFor="budget" error={errors.budget?.message}>
          <select id="budget" className="input" {...register("budget")}>
            <option value="">Prefer not to say</option>
            {BUDGETS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Tell us about your project" htmlFor="message" error={errors.message?.message}>
        <textarea id="message" rows={6} className="input" {...register("message")} />
      </Field>
      {/* Honeypot: hidden from people and assistive tech; bots fill it in. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" {...register("website")} /></label>
      </div>
      <button type="submit" disabled={pending} className="btn-primary" aria-busy={pending}>{pending ? "Sending…" : "Send message"}</button>
    </form>
  );
}
