// The Meridian mark: a globe in muted gray with the Dominican Republic in
// gold — wealth made real — on a light Caribbean sea.
export function GlobeMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Meridian globe">
      <circle cx="32" cy="32" r="30" fill="#A9D7E4" />
      <path d="M10 24 Q16 16 26 18 Q30 12 24 9 Q14 11 10 24Z" fill="#8B9399" />
      <path d="M40 8 Q52 12 55 24 Q50 20 44 22 Q38 18 40 8Z" fill="#8B9399" />
      <path d="M12 42 Q18 50 30 54 Q24 46 20 40 Q14 38 12 42Z" fill="#8B9399" />
      <path d="M48 44 Q56 38 54 30 Q46 32 44 38 Q44 42 48 44Z" fill="#8B9399" />
      <path d="M26 30 l8 -2 6 1 4 3 -3 4 -6 1 -7 -2 -3 -3 z" fill="#C8A24B" stroke="#E9CD8B" strokeWidth="1" />
      <circle cx="32" cy="32" r="30" fill="none" stroke="#C8A24B" strokeWidth="2.5" />
    </svg>
  );
}

export function HeroGlobe() {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="Globe with the Dominican Republic highlighted in gold">
      <circle cx="32" cy="32" r="30" fill="#A9D7E4" />
      <g fill="#8B9399">
        <path d="M10 24 Q16 16 26 18 Q30 12 24 9 Q14 11 10 24Z" />
        <path d="M40 8 Q52 12 55 24 Q50 20 44 22 Q38 18 40 8Z" />
        <path d="M12 42 Q18 50 30 54 Q24 46 20 40 Q14 38 12 42Z" />
        <path d="M48 44 Q56 38 54 30 Q46 32 44 38 Q44 42 48 44Z" />
      </g>
      <path d="M26 30 l8 -2 6 1 4 3 -3 4 -6 1 -7 -2 -3 -3 z" fill="#C8A24B" stroke="#E9CD8B" strokeWidth="0.8" />
      <g stroke="rgba(200,162,75,0.45)" strokeWidth="0.5" fill="none">
        <ellipse cx="32" cy="32" rx="30" ry="12" />
        <ellipse cx="32" cy="32" rx="14" ry="30" />
      </g>
      <circle cx="32" cy="32" r="30" fill="none" stroke="#C8A24B" strokeWidth="1.6" />
    </svg>
  );
}
