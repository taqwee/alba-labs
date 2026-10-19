import type { ReactNode } from "react";
import Link from "next/link";
import { cn, humanize } from "@/lib/utils";

const TONES: Record<string, string> = {
  neutral: "bg-primary/5 text-muted",
  info: "bg-secondary/15 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-error/10 text-error",
  accent: "bg-accent/25 text-accent-fg",
};
const STATUS_TONE: Record<string, string> = {
  NEW: "accent", UNASSIGNED: "warning", OPEN: "info", IN_PROGRESS: "info", WAITING_FOR_CUSTOMER: "neutral",
  WAITING_FOR_STAFF: "warning", RESOLVED: "success", CLOSED: "neutral", ACTIVE: "success", INACTIVE: "neutral",
  ARCHIVED: "neutral", DRAFT: "neutral", PUBLISHED: "success", COMPLETED: "success", CANCELLED: "danger",
  ON_HOLD: "warning", REVIEW: "info", REVISION: "warning", PLANNING: "neutral", CONVERTED: "success", LOST: "danger",
  CONTACTED: "info", QUALIFIED: "info", PROPOSAL: "info", TODO: "neutral", BLOCKED: "danger", DONE: "success",
  LOW: "neutral", MEDIUM: "info", HIGH: "warning", URGENT: "danger", FAILED: "danger", READ: "success",
  DELIVERED: "info", SENT: "neutral", PENDING: "neutral",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", TONES[tone])}>{children}</span>;
}
export function StatusBadge({ value }: { value: string }) {
  return <Badge tone={STATUS_TONE[value] ?? "neutral"}>{humanize(value)}</Badge>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <p className="font-display text-lg">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Notice({ children, tone = "warning" }: { children: ReactNode; tone?: "warning" | "info" | "danger" | "success" }) {
  return <div role="note" className={cn("rounded-lg border px-4 py-3 text-sm", TONES[tone], "border-current/20")}>{children}</div>;
}

export function StatCard({ label, value, href, hint }: { label: string; value: number | string; href?: string; hint?: string }) {
  const body = (
    <div className="card h-full p-4 transition-colors hover:border-primary/30">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

export function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}

export function Table({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse" aria-label={label}>{children}</table>
    </div>
  );
}

export function Select({ name, defaultValue, options, id, required, className }: {
  name: string; defaultValue?: string | null; options: { value: string; label: string }[]; id?: string; required?: boolean; className?: string;
}) {
  return (
    <select id={id ?? name} name={name} defaultValue={defaultValue ?? ""} required={required} className={cn("input", className)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
export const enumOptions = (values: readonly string[]) => values.map((v) => ({ value: v, label: humanize(v) }));
