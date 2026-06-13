import { z } from 'zod';

export const ROLES = ['buyer', 'renter', 'investor', 'seller', 'landlord', 'agent', 'broker', 'lawyer', 'notary'] as const;
export const PROPERTY_TYPES = ['house', 'apartment', 'condo', 'villa', 'land', 'commercial'] as const;
export const LISTING_TYPES = ['sale', 'rent'] as const;
export const STATUSES = ['draft', 'active', 'pending', 'sold', 'rented', 'inactive'] as const;

export const registerSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters.')
    .max(128)
    .regex(/[a-zA-Z]/, 'Password must include a letter.')
    .regex(/[0-9]/, 'Password must include a number.'),
  role: z.enum(ROLES).default('buyer'),
  locale: z.enum(['en', 'es']).default('en'),
  planId: z.string().trim().min(1).max(40).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

export const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(60).optional(),
  lastName: z.string().trim().min(1).max(60).optional(),
  phone: z.string().trim().max(30).regex(/^[+0-9 ()-]*$/).optional(),
  locale: z.enum(['en', 'es']).optional(),
  notifyMatches: z.boolean().optional(),
  notifyMessages: z.boolean().optional(),
});

export const propertySchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().max(5000).default(''),
  propertyType: z.enum(PROPERTY_TYPES),
  listingType: z.enum(LISTING_TYPES),
  priceCents: z.number().int().positive().max(2_000_000_000_000),
  currency: z.enum(['USD', 'DOP']).default('USD'),
  address: z.string().trim().min(3).max(200),
  city: z.string().trim().min(2).max(80),
  country: z.string().trim().length(2).toUpperCase().default('DO'),
  latitude: z.number().min(-90).max(90).nullish(),
  longitude: z.number().min(-180).max(180).nullish(),
  bedrooms: z.number().int().min(0).max(50).default(0),
  bathrooms: z.number().min(0).max(50).default(0),
  areaM2: z.number().positive().max(1_000_000).nullish(),
  lotM2: z.number().positive().max(100_000_000).nullish(),
  yearBuilt: z.number().int().min(1800).max(2100).nullish(),
  features: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  virtualTourUrl: z.string().trim().url().max(500).startsWith('https://').nullish(),
  status: z.enum(STATUSES).default('active'),
});

export const propertyPatchSchema = propertySchema.partial();

export const requirementSchema = z.object({
  title: z.string().trim().min(3).max(120),
  listingType: z.enum(LISTING_TYPES),
  propertyType: z.enum(PROPERTY_TYPES).nullish(),
  city: z.string().trim().min(2).max(80).nullish(),
  maxPriceCents: z.number().int().positive().max(2_000_000_000_000).nullish(),
  minBedrooms: z.number().int().min(0).max(50).default(0),
  minBathrooms: z.number().min(0).max(50).default(0),
  notes: z.string().trim().max(2000).default(''),
});

export const messageSchema = z.object({
  recipientId: z.number().int().positive(),
  propertyId: z.number().int().positive().nullish(),
  body: z.string().trim().min(1).max(2000),
});

// Query params arrive as strings; coerce them defensively with bounds.
export const searchSchema = z.object({
  q: z.string().trim().max(100).optional(),
  city: z.string().trim().max(80).optional(),
  listingType: z.enum(LISTING_TYPES).optional(),
  propertyType: z.enum(PROPERTY_TYPES).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  minBeds: z.coerce.number().int().min(0).max(50).optional(),
  minBaths: z.coerce.number().min(0).max(50).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).default('newest'),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(20),
});

export type SearchParams = z.infer<typeof searchSchema>;

export function flattenZodError(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_';
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
