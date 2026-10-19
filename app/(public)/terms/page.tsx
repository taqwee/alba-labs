import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "Terms", description: "Terms of use for Lunomi Studio.", path: "/terms" });

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl">Terms</h1>
      <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
        Placeholder page. Replace this text with your real terms of service (reviewed by a qualified professional) before launch.
      </p>
    </div>
  );
}
