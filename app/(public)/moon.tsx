/**
 * A lunar phase. `lit` runs from 0 (new moon) to 1 (full moon).
 * The process section uses five of these — Discover → Deliver — as a real sequence.
 */
export function MoonPhase({ lit, id, size = 56, className }: { lit: number; id: string; size?: number; className?: string }) {
  const r = 24;
  const shift = (1 - Math.min(1, Math.max(0, lit))) * (r * 2.1);
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" role="img" aria-label={`Moon at ${Math.round(lit * 100)} percent`} className={className}>
      <defs>
        <mask id={`m-${id}`}>
          <rect width="56" height="56" fill="white" />
          <circle cx={28 + shift} cy="28" r={r} fill="black" />
        </mask>
      </defs>
      <circle cx="28" cy="28" r={r} fill="currentColor" opacity="0.14" />
      <circle cx="28" cy="28" r={r} fill="rgb(var(--color-accent))" mask={`url(#m-${id})`} />
      <circle cx="28" cy="28" r={r} fill="none" stroke="currentColor" strokeOpacity="0.25" />
    </svg>
  );
}
