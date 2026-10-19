import { getActiveServices, getSiteSettings } from "@/lib/site";
import { pageMetadata } from "@/lib/seo";
import { ContactForm } from "@/components/public/contact-form";

export const revalidate = 60;
export const metadata = pageMetadata({ title: "Contact", description: "Tell Lunomi Studio about your project.", path: "/contact" });

export default async function ContactPage() {
  const [services, settings] = await Promise.all([getActiveServices(), getSiteSettings()]);
  const { contact } = settings;
  return (
    <div className="mx-auto grid max-w-page gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1fr_1.4fr]">
      <div>
        <h1 className="text-4xl sm:text-5xl">Contact</h1>
        <p className="mt-3 text-lg text-muted">Tell us about your project. We read every message.</p>
        <ul className="mt-8 space-y-2 text-sm">
          {contact.email && <li><a className="text-secondary underline-offset-4 hover:underline" href={`mailto:${contact.email}`}>{contact.email}</a></li>}
          {contact.phone && <li>{contact.phone}</li>}
          {contact.address && <li className="text-muted">{contact.address}</li>}
        </ul>
      </div>
      <ContactForm services={services.map((s) => ({ id: s.id, title: s.title }))} />
    </div>
  );
}
