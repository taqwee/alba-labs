import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";
import { getActiveServices, getPublishedPortfolio } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = publicEnv.siteUrl;
  const [services, work] = await Promise.all([getActiveServices(), getPublishedPortfolio()]);
  const fixed = ["", "/services", "/work", "/about", "/contact", "/privacy", "/terms"].map((p) => ({
    url: `${base}${p}`, changeFrequency: "monthly" as const, priority: p === "" ? 1 : 0.7,
  }));
  return [
    ...fixed,
    ...services.map((s) => ({ url: `${base}/services/${s.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    ...work.map((w) => ({ url: `${base}/work/${w.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
