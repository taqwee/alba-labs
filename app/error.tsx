"use client";
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="text-3xl">Something went wrong</h1>
      <p className="mt-2 text-muted">We hit an unexpected problem. Please try again.</p>
      <button type="button" onClick={reset} className="btn-primary mt-6">Try again</button>
    </main>
  );
}
