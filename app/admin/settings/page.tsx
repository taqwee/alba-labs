import { requirePermission } from "@/lib/auth/session";
import { getSiteSettings } from "@/lib/site";
import { Field, PageHeader } from "@/components/ui/basics";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { saveSettingsAction } from "@/app/actions/admin";

export default async function Page() {
  await requirePermission("settings.manage");
  const s = await getSiteSettings();
  const steps = s.process.map((p) => `${p.title} | ${p.description}`).join("\n");
  const social = s.social.map((x) => `${x.label} | ${x.url}`).join("\n");
  return (
    <>
      <PageHeader title="Settings" description="Edit the public website copy and contact details. Changes appear within a minute." />
      <ActionForm action={saveSettingsAction} className="card max-w-3xl space-y-4 p-5">
        <Field label="Hero headline" htmlFor="heroHeadline"><input id="heroHeadline" name="heroHeadline" required defaultValue={s.hero.headline} className="input" /></Field>
        <Field label="Hero supporting text" htmlFor="heroSubheadline"><textarea id="heroSubheadline" name="heroSubheadline" rows={2} defaultValue={s.hero.subheadline} className="input" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Primary button" htmlFor="heroPrimaryCta"><input id="heroPrimaryCta" name="heroPrimaryCta" required defaultValue={s.hero.primaryCta} className="input" /></Field>
          <Field label="Secondary button" htmlFor="heroSecondaryCta"><input id="heroSecondaryCta" name="heroSecondaryCta" required defaultValue={s.hero.secondaryCta} className="input" /></Field>
        </div>
        <Field label="About heading" htmlFor="aboutTitle"><input id="aboutTitle" name="aboutTitle" defaultValue={s.about.title} className="input" /></Field>
        <Field label="About text" htmlFor="aboutBody"><textarea id="aboutBody" name="aboutBody" rows={4} defaultValue={s.about.body} className="input" /></Field>
        <Field label="Process steps" htmlFor="processSteps" hint="One per line: Title | Description"><textarea id="processSteps" name="processSteps" rows={6} defaultValue={steps} className="input" /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Contact email" htmlFor="contactEmail"><input id="contactEmail" name="contactEmail" type="email" defaultValue={s.contact.email} className="input" /></Field>
          <Field label="Phone" htmlFor="contactPhone"><input id="contactPhone" name="contactPhone" defaultValue={s.contact.phone} className="input" /></Field>
          <Field label="Address" htmlFor="contactAddress"><input id="contactAddress" name="contactAddress" defaultValue={s.contact.address} className="input" /></Field>
        </div>
        <Field label="Social links" htmlFor="socialLinks" hint="One per line: Label | https://…"><textarea id="socialLinks" name="socialLinks" rows={3} defaultValue={social} className="input" /></Field>
        <SubmitButton>Save settings</SubmitButton>
      </ActionForm>
    </>
  );
}
