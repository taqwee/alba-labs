import type { Metadata } from "next";
import { publicEnv, SITE_NAME } from "@/lib/env";

/** Builds consistent page metadata (title, canonical, Open Graph, Twitter) from the configured site URL. */
export function pageMetadata(opts: { title: string; description: string; path: string; image?: string | null }): Metadata {
  const url = `${publicEnv.siteUrl}${opts.path}`;
  const images = opts.image ? [{ url: opts.image }] : undefined;
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    openGraph: { title: opts.title, description: opts.description, url, siteName: SITE_NAME, type: "website", images },
    twitter: { card: images ? "summary_large_image" : "summary", title: opts.title, description: opts.description, images: opts.image ? [opts.image] : undefined },
  };
}
