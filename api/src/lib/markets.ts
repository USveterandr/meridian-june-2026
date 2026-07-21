// ───────────────────────────────────────────────────────────────────────────
// Canonical DR market resolver.
//
// Listing feeds return free-text locations — neighborhoods ("Bávaro"),
// sectors ("Piantini"), gated communities ("Juanillo"), or bare province
// names. Stored verbatim, these fragment inventory into dozens of tiny city
// buckets, so the markets the site actually promotes (Punta Cana, Cap Cana,
// Las Terrenas, Samaná) never fill up even when qualifying listings exist.
//
// `resolveMarket` maps any of those location strings to a single canonical
// market + region so listings surface under the city names buyers search for.
// Matching is accent- and case-insensitive and runs most-specific-first.
//
// This is pure data/logic (no I/O), so it is safe to import in the Worker,
// in tests, and in the dry-run harness alike.
// ───────────────────────────────────────────────────────────────────────────

/** Broad geographic region a market belongs to (used for reporting/grouping). */
export type Region =
  | 'East / Punta Cana'
  | 'Samaná'
  | 'North Coast'
  | 'Santo Domingo'
  | 'Cibao'
  | 'South'
  | 'Other';

export interface Market {
  /** Canonical city bucket, e.g. "Punta Cana". */
  city: string;
  region: Region;
  /** True when this is one of the markets the homepage promotes but historically lacked inventory. */
  isTarget: boolean;
}

/**
 * Markets the marketing site promotes up-front. Filling these is the whole
 * point of region targeting — a listing that resolves to one of these should
 * be prioritized for import so the promise matches the inventory.
 */
export const TARGET_MARKETS = ['Punta Cana', 'Cap Cana', 'Las Terrenas', 'Samaná'] as const;

const TARGET_SET = new Set<string>(TARGET_MARKETS);

/** Strip accents, lowercase, collapse runs of non-alphanumerics to single spaces. */
export function normalizeLocation(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

interface Rule {
  city: string;
  region: Region;
  /** Normalized alias substrings; a location matches if it contains any of them. */
  aliases: string[];
}

// Ordered most-specific first. Cap Cana must precede Punta Cana so a
// "Cap Cana" location isn't swallowed by a generic Punta Cana rule, and
// Las Terrenas must precede the Samaná province fallback so it keeps its own
// bucket. Aliases are matched as whole normalized tokens/phrases.
const RULES: Rule[] = [
  {
    city: 'Cap Cana',
    region: 'East / Punta Cana',
    aliases: ['cap cana', 'juanillo', 'punta espada', 'las canas cap cana', 'marina cap cana', 'ciudad las canas', 'sanctuary cap cana'],
  },
  {
    city: 'Punta Cana',
    region: 'East / Punta Cana',
    aliases: [
      'punta cana', 'bavaro', 'veron', 'el cortecito', 'cortecito', 'uvero alto',
      'macao', 'arena gorda', 'cabeza de toro', 'cocotal', 'los corales',
      'punta cana village', 'white sands', 'downtown punta cana', 'vista cana', 'la altagracia',
    ],
  },
  {
    city: 'Las Terrenas',
    region: 'Samaná',
    aliases: ['las terrenas', 'el portillo', 'portillo', 'coson', 'playa bonita las terrenas'],
  },
  {
    city: 'Samaná',
    region: 'Samaná',
    aliases: ['samana', 'las galeras', 'el limon', 'santa barbara de samana'],
  },
  {
    city: 'La Romana',
    region: 'East / Punta Cana',
    aliases: ['la romana', 'casa de campo', 'bayahibe', 'dominicus', 'altos de chavon'],
  },
  {
    city: 'Bayahíbe',
    region: 'East / Punta Cana',
    aliases: ['bayahibe'],
  },
  {
    city: 'Juan Dolio',
    region: 'South',
    aliases: ['juan dolio', 'guayacanes', 'playa nueva romana', 'metro country club'],
  },
  {
    city: 'Boca Chica',
    region: 'Santo Domingo',
    aliases: ['boca chica'],
  },
  {
    city: 'Santo Domingo',
    region: 'Santo Domingo',
    aliases: [
      'santo domingo', 'distrito nacional', 'piantini', 'naco', 'bella vista',
      'evaristo morales', 'gazcue', 'serralles', 'los cacicazgos', 'cacicazgos',
      'arroyo hondo', 'la esperilla', 'julieta', 'mirador', 'anacaona', 'paraiso',
      'los prados', 'renacimiento', 'ciudad nueva', 'zona colonial',
      'san isidro', 'santo domingo este', 'santo domingo norte', 'santo domingo oeste',
    ],
  },
  {
    city: 'Santiago',
    region: 'Cibao',
    aliases: ['santiago', 'gurabo', 'jacagua', 'la trinitaria', 'los jardines metropolitanos', 'cerros de gurabo'],
  },
  {
    city: 'Puerto Plata',
    region: 'North Coast',
    aliases: ['puerto plata', 'playa dorada', 'costambar', 'cofresi', 'cofresí'],
  },
  {
    city: 'Cabarete',
    region: 'North Coast',
    aliases: ['cabarete', 'encuentro'],
  },
  {
    city: 'Sosúa',
    region: 'North Coast',
    aliases: ['sosua'],
  },
  {
    city: 'Cabrera',
    region: 'North Coast',
    aliases: ['cabrera', 'rio san juan', 'orchid bay'],
  },
  {
    city: 'Jarabacoa',
    region: 'Cibao',
    aliases: ['jarabacoa'],
  },
  {
    city: 'Constanza',
    region: 'Cibao',
    aliases: ['constanza'],
  },
];

function titleCase(normalized: string): string {
  return normalized
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Resolves a free-text location to a canonical market. Falls back to a
 * title-cased version of the original string (region "Other") when nothing
 * matches, so an unknown location is never silently dropped — it just isn't
 * treated as a target market.
 */
export function resolveMarket(rawLocation: string | null | undefined): Market {
  const norm = normalizeLocation(rawLocation ?? '');
  if (!norm) return { city: 'Unknown', region: 'Other', isTarget: false };

  // Pad so a single ` alias ` test catches the alias anywhere as a whole
  // phrase (start, middle, or end) without matching inside a larger word —
  // e.g. "oeste" never matches the "este" bucket.
  const padded = ` ${norm} `;
  for (const rule of RULES) {
    for (const alias of rule.aliases) {
      if (padded.includes(` ${alias} `)) {
        return { city: rule.city, region: rule.region, isTarget: TARGET_SET.has(rule.city) };
      }
    }
  }

  return { city: titleCase(norm), region: 'Other', isTarget: false };
}

/** True when the resolved market is one the site actively promotes. */
export function isTargetMarket(rawLocation: string | null | undefined): boolean {
  return resolveMarket(rawLocation).isTarget;
}
