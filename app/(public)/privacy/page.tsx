import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "Privacy", description: "How Lunomi Studio handles personal information.", path: "/privacy" });

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl">Privacy</h1>
      <p className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-4 text-sm">
        Placeholder page. Replace this text with your real privacy policy (reviewed by a qualified professional) before you collect data from real visitors.
      </p>
      <p className="mt-6 text-muted">This site collects the details you enter in the contact form, the account details you provide when you register, and messages you send us, so that we can respond to you and deliver your project.</p>
    </div>
  );
}
