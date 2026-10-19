"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useToast } from "./toast";
import { cn } from "@/lib/utils";

type State = { ok: true; message?: string; nonce: number } | { ok: false; error: string; nonce: number } | null;
type Action = (prev: State, formData: FormData) => Promise<State>;

/** <form> wired to a server action: shows a toast on success/failure, optionally resets. */
export function ActionForm({
  action, children, className, resetOnSuccess = false, encType,
}: { action: Action; children: ReactNode; className?: string; resetOnSuccess?: boolean; encType?: string }) {
  const [state, formAction] = useFormState(action, null);
  const { show } = useToast();
  const ref = useRef<HTMLFormElement>(null);
  const lastNonce = useRef(0);

  useEffect(() => {
    if (!state || state.nonce === lastNonce.current) return;
    lastNonce.current = state.nonce;
    if (state.ok) {
      if (state.message) show("success", state.message);
      if (resetOnSuccess) ref.current?.reset();
    } else {
      show("error", state.error);
    }
  }, [state, show, resetOnSuccess]);

  return (
    <form ref={ref} action={formAction} className={className} encType={encType}>
      {children}
    </form>
  );
}

export function SubmitButton({
  children, pendingText = "Saving…", className,
}: { children: ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={cn("btn-primary", className)}>
      {pending ? pendingText : children}
    </button>
  );
}
