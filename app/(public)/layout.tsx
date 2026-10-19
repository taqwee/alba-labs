import type { ReactNode } from "react";
import { SiteHeader } from "@/components/public/site-header";
import { SiteFooter } from "@/components/public/site-footer";
import { getSiteSettings } from "@/lib/site";

export const revalidate = 60;

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const settings = await getSiteSettings();
  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter settings={settings} />
    </>
  );
}
