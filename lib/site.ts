import { createPublicSupabase } from "@/lib/supabase/public";
import type { PortfolioItem, Service, SiteSettings } from "@/types/db";

/**
 * Default copy shown until an admin edits Settings. It makes no factual claims
 * (no client counts, awards or results) and is safe to change at any time.
 */
export const DEFAULT_SETTINGS: SiteSettings = {
  hero: {
    headline: "Design that gives your brand a clear voice.",
    subheadline: "Lunomi Studio is a creative and digital agency. Tell us what you are building and we will shape the identity around it.",
    primaryCta: "Start a project",
    secondaryCta: "See our work",
  },
  about: {
    title: "A small studio with a clear process.",
    body: "Lunomi Studio is a creative and digital agency. We work with businesses on brand identity, visual design and digital services, and we keep the process open so you always know what happens next.",
  },
  process: [
    { title: "Discover", description: "We learn about your business, your audience and what you need the work to do." },
    { title: "Plan", description: "We agree scope, timeline and deliverables before any design starts." },
    { title: "Create", description: "We develop concepts and share early work so you can react while it is still flexible." },
    { title: "Refine", description: "We revise together until the work is right." },
    { title: "Deliver", description: "You receive final files and guidance for using them." },
  ],
  contact: { email: "", phone: "", address: "" },
  social: [],
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const db = createPublicSupabase();
  if (!db) return DEFAULT_SETTINGS;
  try {
    const { data } = await db.from("site_settings").select("value").eq("key", "site").maybeSingle();
    const v = (data?.value ?? {}) as Partial<SiteSettings>;
    return {
      hero: { ...DEFAULT_SETTINGS.hero, ...v.hero },
      about: { ...DEFAULT_SETTINGS.about, ...v.about },
      process: v.process?.length ? v.process : DEFAULT_SETTINGS.process,
      contact: { ...DEFAULT_SETTINGS.contact, ...v.contact },
      social: v.social ?? [],
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function getActiveServices(): Promise<Service[]> {
  const db = createPublicSupabase();
  if (!db) return [];
  try {
    const { data } = await db.from("services").select("*, service_features(id, label, sort_order)")
      .eq("status", "ACTIVE").order("sort_order").order("title");
    return ((data ?? []) as Service[]).map((s) => ({
      ...s, service_features: [...(s.service_features ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    }));
  } catch { return []; }
}

export async function getServiceBySlug(slug: string): Promise<Service | null> {
  return (await getActiveServices()).find((s) => s.slug === slug) ?? null;
}

export async function getPublishedPortfolio(): Promise<PortfolioItem[]> {
  const db = createPublicSupabase();
  if (!db) return [];
  try {
    const { data } = await db.from("portfolio_items").select("*").eq("status", "PUBLISHED")
      .order("featured", { ascending: false }).order("created_at", { ascending: false });
    return (data ?? []) as PortfolioItem[];
  } catch { return []; }
}

export async function getPortfolioBySlug(slug: string): Promise<PortfolioItem | null> {
  return (await getPublishedPortfolio()).find((p) => p.slug === slug) ?? null;
}
