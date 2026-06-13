// The Meridian mark: a gold "meridian" globe — longitude/latitude lines in gold —
// with the Dominican Republic glowing gold at the center of the world and jets
// departing and landing. Gold on a dark sphere: luxury made real.

function Graticule() {
  return (
    <>
      <g opacity="0.42">
        <ellipse cx="32" cy="32" rx="26" ry="26" />
        <ellipse cx="32" cy="32" rx="18" ry="26" />
        <ellipse cx="32" cy="32" rx="9" ry="26" />
        <line x1="32" y1="6" x2="32" y2="58" />
      </g>
      <g opacity="0.30">
        <line x1="6" y1="32" x2="58" y2="32" />
        <ellipse cx="32" cy="32" rx="26" ry="13" />
        <ellipse cx="32" cy="32" rx="26" ry="22" />
      </g>
    </>
  );
}

const JET = 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z';
const DR_ISLAND = 'M21 32 C22 30 25 29 28 30 C30 28 35 28 37 30 C40 30 43 31 42 33 C43 35 38 36 35 35 C33 37 27 37 24 35 C21 36 18 35 18 33 Z';

export function GlobeMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Meridian globe" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mm-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F8E7B0" />
          <stop offset="0.45" stopColor="#D9B24A" />
          <stop offset="1" stopColor="#A0741B" />
        </linearGradient>
        <radialGradient id="mm-bright" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#FFF4CE" />
          <stop offset="0.5" stopColor="#F0CC6A" />
          <stop offset="1" stopColor="#C2922B" />
        </radialGradient>
        <radialGradient id="mm-sphere" cx="0.42" cy="0.36" r="0.75">
          <stop offset="0" stopColor="#19222c" />
          <stop offset="0.7" stopColor="#0f161d" />
          <stop offset="1" stopColor="#0a0f14" />
        </radialGradient>
        <clipPath id="mm-clip"><circle cx="32" cy="32" r="26" /></clipPath>
      </defs>
      <circle cx="32" cy="32" r="26" fill="url(#mm-sphere)" />
      <g clipPath="url(#mm-clip)" fill="none" stroke="url(#mm-gold)" strokeWidth="0.8"><Graticule /></g>
      <circle cx="32" cy="32" r="26" fill="none" stroke="url(#mm-gold)" strokeWidth="1.6" />
      <path d={DR_ISLAND} fill="url(#mm-bright)" />
      <g fill="none" stroke="url(#mm-gold)" strokeWidth="1" strokeLinecap="round" opacity="0.9">
        <path d="M27 30 Q16 19 11 12" strokeDasharray="0.6 4" />
        <path d="M37 33 Q49 44 54 52" strokeDasharray="0.6 4" />
      </g>
      <g transform="translate(11 12) rotate(-48) scale(0.42)" fill="url(#mm-bright)"><path d={JET} /></g>
      <g transform="translate(54 52) rotate(150) scale(0.42)" fill="url(#mm-bright)"><path d={JET} /></g>
    </svg>
  );
}

export function HeroGlobe() {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="Globe with the Dominican Republic highlighted in gold and jets departing" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hg-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F8E7B0" />
          <stop offset="0.45" stopColor="#D9B24A" />
          <stop offset="1" stopColor="#A0741B" />
        </linearGradient>
        <radialGradient id="hg-bright" cx="0.5" cy="0.4" r="0.7">
          <stop offset="0" stopColor="#FFF4CE" />
          <stop offset="0.5" stopColor="#F0CC6A" />
          <stop offset="1" stopColor="#C2922B" />
        </radialGradient>
        <radialGradient id="hg-sphere" cx="0.42" cy="0.36" r="0.75">
          <stop offset="0" stopColor="#19222c" />
          <stop offset="0.7" stopColor="#0f161d" />
          <stop offset="1" stopColor="#0a0f14" />
        </radialGradient>
        <filter id="hg-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="0.7" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <clipPath id="hg-clip"><circle cx="32" cy="32" r="28" /></clipPath>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#hg-sphere)" />
      <g clipPath="url(#hg-clip)" fill="none" stroke="url(#hg-gold)" strokeWidth="0.7">
        <g opacity="0.42">
          <ellipse cx="32" cy="32" rx="28" ry="28" />
          <ellipse cx="32" cy="32" rx="19" ry="28" />
          <ellipse cx="32" cy="32" rx="9.5" ry="28" />
          <line x1="32" y1="4" x2="32" y2="60" />
        </g>
        <g opacity="0.30">
          <line x1="4" y1="32" x2="60" y2="32" />
          <ellipse cx="32" cy="32" rx="28" ry="14" />
          <ellipse cx="32" cy="32" rx="28" ry="24" />
        </g>
      </g>
      <circle cx="32" cy="32" r="28" fill="none" stroke="url(#hg-gold)" strokeWidth="1.4" />
      <g filter="url(#hg-glow)"><path d={DR_ISLAND} fill="url(#hg-bright)" stroke="#FFF4CE" strokeWidth="0.3" /></g>
      <g fill="none" stroke="url(#hg-gold)" strokeWidth="0.9" strokeLinecap="round" opacity="0.9">
        <path d="M27 30 Q15 17 9 9" strokeDasharray="0.5 3.5" />
        <path d="M37 33 Q51 46 56 55" strokeDasharray="0.5 3.5" />
      </g>
      <g transform="translate(9 9) rotate(-48) scale(0.5)" fill="url(#hg-bright)"><path d={JET} /></g>
      <g transform="translate(56 55) rotate(150) scale(0.5)" fill="url(#hg-bright)"><path d={JET} /></g>
    </svg>
  );
}
