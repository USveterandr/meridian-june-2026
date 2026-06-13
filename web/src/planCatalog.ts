// Shared plan catalog copy (EN/ES) for the 4 subscription tiers.
// Plan data (prices, features keys) comes from /api/plans; this file maps
// ids and feature keys to localized display copy.

import type { Lang } from './i18n';

export const PLAN_ICON: Record<string, string> = {
  free: '🏠',
  team: '🚀',
  professional: '💼',
  enterprise: '💎',
};

export const PLAN_HIGHLIGHT: Record<string, boolean> = {
  team: true,
};

export const PLAN_COPY: Record<string, Record<Lang, { name: string; tagline: string }>> = {
  free: {
    en: { name: 'FREE Start', tagline: 'List your property today — absolutely free. Pay only when you sell.' },
    es: { name: 'Inicio GRATIS', tagline: 'Publica tu propiedad hoy — totalmente gratis. Paga solo cuando vendas.' },
  },
  team: {
    en: { name: 'TEAM Essentials', tagline: "Boost your team's reach and efficiency with advanced tools." },
    es: { name: 'Equipo Esencial', tagline: 'Impulsa el alcance y eficiencia de tu equipo con herramientas avanzadas.' },
  },
  professional: {
    en: { name: 'PROFESSIONAL Business', tagline: 'Scale your brokerage with unlimited listings and 0% commission.' },
    es: { name: 'Negocio PROFESIONAL', tagline: 'Escala tu brokerage con listados ilimitados y 0% comisión.' },
  },
  enterprise: {
    en: { name: 'ENTERPRISE Solutions', tagline: 'The ultimate real estate platform — custom built for market leaders.' },
    es: { name: 'Soluciones EMPRESARIALES', tagline: 'La plataforma inmobiliaria definitiva — personalizada para líderes del mercado.' },
  },
};

export const FEATURE_LABELS: Record<Lang, Record<string, string>> = {
  en: {
    users_1: '1 user account',
    users_3: 'Up to 3 users',
    users_12: 'Starts with 12 users (expandable)',
    users_custom_25: 'Custom user count (starts at 25)',
    listings_limit_1: 'List 1 property',
    listings_limit_100: 'Manage 100 shared properties',
    unlimited_listings: 'UNLIMITED properties',
    photos_limit_12: 'Up to 12 photos per property',
    photos_limit_18: '18 photos per property (expandable)',
    photos_limit_24: '24 photos per property (expandable)',
    sketch_3d: '3D sketch included',
    buyer_id_basic: 'Basic buyer ID verification',
    buyer_verification_advanced: 'Advanced buyer verification (ID + income)',
    biometric_verification: 'Biometric buyer verification',
    ai_verification: 'AI-powered verification (AML prevention)',
    manual_contracts: 'Manual contract templates',
    digital_contracts: 'Digital contract generator',
    smart_contracts: 'Smart, auto-renewing contracts',
    custom_contracts_branding: 'Customizable contracts & branding',
    escrow_integration: 'Escrow service integration',
    blockchain_records: 'Blockchain auditable records',
    commission_protection_365: '365-day commission protection',
    commission_protection_180: '180-day commission protection',
    commission_protection_lifetime: 'LIFETIME commission protection',
    maps_geo_pin: 'Google Maps geo-PIN (standard logo)',
    maps_pro: 'Maps Pro: geo-PIN + territory outline, gold marker',
    maps_enterprise: 'Maps Enterprise: diamond marker, Street View',
    storage_2gb: '2 GB storage (expandable)',
    storage_10gb: '10 GB storage (expandable)',
    storage_20gb: '20 GB storage (expandable)',
    featured_1_month: 'Featured listing priority (1 month) + "Verified" badge',
    featured_3_months: 'TOP featured priority (3 months) + animated banner',
    vip_placement_6_months: 'VIP guaranteed placement (6 months) + carousel',
    lead_scoring: 'Lead scoring system',
    account_manager: 'Dedicated account manager',
    extra_users_58: 'Additional users $58/user/mo (up to 25)',
    email_support_72h: 'Email support (72h response)',
    chat_support_24h: 'Chat support (24h response)',
    support_24_7_legal: 'Dedicated 24/7 legal/technical support team',
  },
  es: {
    users_1: '1 cuenta de usuario',
    users_3: 'Hasta 3 usuarios',
    users_12: 'Comienza con 12 usuarios (ampliable)',
    users_custom_25: 'Usuarios personalizados (desde 25)',
    listings_limit_1: 'Publica 1 propiedad',
    listings_limit_100: 'Gestiona 100 propiedades compartidas',
    unlimited_listings: 'Propiedades ILIMITADAS',
    photos_limit_12: 'Hasta 12 fotos por propiedad',
    photos_limit_18: '18 fotos por propiedad (ampliable)',
    photos_limit_24: '24 fotos por propiedad (ampliable)',
    sketch_3d: 'Bosquejo 3D incluido',
    buyer_id_basic: 'Verificación básica de ID de comprador',
    buyer_verification_advanced: 'Verificación avanzada (ID + ingresos)',
    biometric_verification: 'Verificación biométrica de comprador',
    ai_verification: 'Verificación con IA (prevención lavado de dinero)',
    manual_contracts: 'Plantillas de contrato manuales',
    digital_contracts: 'Generador digital de contratos',
    smart_contracts: 'Contratos inteligentes auto-renovables',
    custom_contracts_branding: 'Contratos y marca personalizables',
    escrow_integration: 'Integración con fideicomiso (escrow)',
    blockchain_records: 'Registros auditables con blockchain',
    commission_protection_365: 'Protección de comisión por 365 días',
    commission_protection_180: 'Protección de comisión por 180 días',
    commission_protection_lifetime: 'Protección de comisión VITALICIA',
    maps_geo_pin: 'Geo-PIN en Google Maps (logo estándar)',
    maps_pro: 'Maps Pro: geo-PIN + contorno territorial, marcador dorado',
    maps_enterprise: 'Maps Enterprise: marcador diamante, Street View',
    storage_2gb: '2 GB almacenamiento (ampliable)',
    storage_10gb: '10 GB almacenamiento (ampliable)',
    storage_20gb: '20 GB almacenamiento (ampliable)',
    featured_1_month: 'Prioridad destacada (1 mes) + insignia "Verificado"',
    featured_3_months: 'Prioridad MÁXIMA (3 meses) + banner animado',
    vip_placement_6_months: 'Posicionamiento VIP garantizado (6 meses) + carrusel',
    lead_scoring: 'Sistema de puntuación de leads',
    account_manager: 'Gestor de cuenta dedicado',
    extra_users_58: 'Usuarios adicionales $58/usuario/mes (hasta 25)',
    email_support_72h: 'Soporte por email (respuesta en 72h)',
    chat_support_24h: 'Soporte por chat (respuesta en 24h)',
    support_24_7_legal: 'Equipo legal/técnico dedicado 24/7',
  },
};

export interface ApiPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceAnnual: number;
  trialDays: number;
  commissionPct: number;
  features: string[];
}

export function planName(p: ApiPlan, lang: Lang): string {
  return PLAN_COPY[p.id]?.[lang]?.name ?? p.name;
}
export function planTagline(p: ApiPlan, lang: Lang): string {
  return PLAN_COPY[p.id]?.[lang]?.tagline ?? p.description;
}
export function featureLabel(key: string, lang: Lang): string {
  return FEATURE_LABELS[lang][key] ?? FEATURE_LABELS.en[key] ?? key.replace(/_/g, ' ');
}
