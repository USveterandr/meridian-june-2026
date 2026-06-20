// The Meridian mark: three overlapping gold rings. The two lens-shaped
// overlaps — where Meridian sits between buyer, market, and opportunity —
// are woven with fine gold hatching; the rest stays open linework.

const HATCH_ID = 'mm-hatch';
const GOLD_ID = 'mm-gold';

function RingsDefs() {
  return (
    <>
      <linearGradient id={GOLD_ID} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#F8E7B0" />
        <stop offset="0.45" stopColor="#D9B24A" />
        <stop offset="1" stopColor="#A0741B" />
      </linearGradient>
      {/* Solid color, not url(#gold): some SVG rasterizers (e.g. rsvg-convert,
          used to regenerate the PNG favicons) can't resolve a gradient
          referenced from inside a <pattern>. */}
      <pattern id={HATCH_ID} width="3" height="2.4" patternUnits="userSpaceOnUse">
        <line x1="0" y1="1.2" x2="3" y2="1.2" stroke="#D9B24A" strokeWidth="0.6" />
      </pattern>
      <clipPath id="mm-clip-a"><circle cx="16" cy="32" r="13" /></clipPath>
      <clipPath id="mm-clip-b"><circle cx="32" cy="32" r="13" /></clipPath>
      <clipPath id="mm-clip-c"><circle cx="48" cy="32" r="13" /></clipPath>
    </>
  );
}

function RingsMark({ strokeWidth = 1.1 }: { strokeWidth?: number }) {
  return (
    <>
      {/* hatched overlap lenses (intersection via nested clip-paths), under the ring outlines */}
      <g clipPath="url(#mm-clip-a)">
        <g clipPath="url(#mm-clip-b)"><rect x="0" y="16" width="32" height="32" fill={`url(#${HATCH_ID})`} /></g>
      </g>
      <g clipPath="url(#mm-clip-b)">
        <g clipPath="url(#mm-clip-c)"><rect x="32" y="16" width="32" height="32" fill={`url(#${HATCH_ID})`} /></g>
      </g>
      <circle cx="16" cy="32" r="13" fill="none" stroke={`url(#${GOLD_ID})`} strokeWidth={strokeWidth} />
      <circle cx="32" cy="32" r="13" fill="none" stroke={`url(#${GOLD_ID})`} strokeWidth={strokeWidth} />
      <circle cx="48" cy="32" r="13" fill="none" stroke={`url(#${GOLD_ID})`} strokeWidth={strokeWidth} />
    </>
  );
}

export function GlobeMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Meridian" xmlns="http://www.w3.org/2000/svg">
      <defs><RingsDefs /></defs>
      <RingsMark />
    </svg>
  );
}

export function HeroGlobe() {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="Meridian mark — three interlocking gold rings" xmlns="http://www.w3.org/2000/svg">
      <defs><RingsDefs /></defs>
      <RingsMark strokeWidth={1.4} />
    </svg>
  );
}
