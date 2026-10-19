import Image from "next/image";
import { publicEnv } from "@/lib/env";

/** next/image for our own Supabase storage; a plain lazy <img> for any other host (never breaks). */
export function SafeImage({ src, alt, className, sizes = "(min-width: 768px) 33vw, 100vw" }: {
  src: string; alt: string; className?: string; sizes?: string;
}) {
  let own = false;
  try { own = Boolean(publicEnv.supabaseUrl) && new URL(src).hostname === new URL(publicEnv.supabaseUrl).hostname; } catch { /* relative or invalid */ }
  if (own) return <Image src={src} alt={alt} fill sizes={sizes} className={className} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" className={`absolute inset-0 h-full w-full ${className ?? ""}`} />;
}
