import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { publicEnv, SITE_NAME } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: { default: `${SITE_NAME} — creative and digital agency`, template: `%s | ${SITE_NAME}` },
  description: "Alba Lab is a creative and digital agency for brand identity, design and digital services.",
  openGraph: { siteName: SITE_NAME, type: "website" },
};
export const viewport: Viewport = { themeColor: "#9e1b26", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">
          Skip to content
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
