// Shared plan catalog copy (EN/ES) for the 5 subscription tiers
// (free, pro, brokerage, enterprise, investor).
// Plan data (prices, features keys) comes from /api/plans; this file maps
// ids and feature keys to localized, conversion-focused display copy.

import type { Lang } from './i18n';

export const PLAN_ICON: Record<string, string> = {
  free: '🧭',
  pro: '🚀',
  brokerage: '🏢',
  enterprise: '💎',
  investor: '📈',
};

// Plans that get the "Most Popular" badge.
export const PLAN_HIGHLIGHT: Record<string, boolean> = {
  pro: true,
};

// Seat / user counts shown in the plan comparison table.
export const PLAN_SEATS: Record<string, Record<Lang, string>> = {
  free: { en: '1 user', es: '1 usuario' },
  pro: { en: '1 user', es: '1 usuario' },
  brokerage: { en: '10 agent seats', es: '10 cuentas de agente' },
  enterprise: { en: '50+ agent seats', es: '50+ cuentas de agente' },
  investor: { en: '1 user', es: '1 usuario' },
};

// "Best for" copy shown in the plan comparison table.
export const PLAN_BEST_FOR: Record<string, Record<Lang, string>> = {
  free: { en: 'Testing the waters with your first listing', es: 'Probar el terreno con tu primera propiedad' },
  pro: { en: 'Solo agents ready to drop the 3% commission', es: 'Agentes independientes listos para eliminar el 3% de comisión' },
  brokerage: { en: 'Teams who need one system for every agent', es: 'Equipos que necesitan un solo sistema para todos los agentes' },
  enterprise: { en: 'Institutions that want the platform as their own', es: 'Instituciones que quieren la plataforma como propia' },
  investor: { en: "Investors who need the deal before it's public", es: 'Inversionistas que necesitan la oportunidad antes de que sea pública' },
};

export const PLAN_COPY: Record<string, Record<Lang, { name: string; tagline: string }>> = {
  free: {
    en: {
      name: 'Explorer',
      tagline: 'Step inside for free. List your first property and browse every listing on the island — no card, no catch, no expiration.',
    },
    es: {
      name: 'Explorador',
      tagline: 'Entra gratis. Publica tu primera propiedad y explora cada listado de la isla — sin tarjeta, sin trampas, sin vencimiento.',
    },
  },
  pro: {
    en: {
      name: 'Professional',
      tagline: 'Stop giving away 3% of every sale. Unlimited listings, 0% commission, and a Verified badge that turns lookers into buyers — the plan agents build their business on.',
    },
    es: {
      name: 'Profesional',
      tagline: 'Deja de regalar el 3% de cada venta. Listados ilimitados, 0% de comisión y una insignia Verificado que convierte curiosos en compradores — el plan sobre el que los agentes construyen su negocio.',
    },
  },
  brokerage: {
    en: {
      name: 'Brokerage',
      tagline: 'One dashboard. Every agent. Every lead. Brand it as your own and watch your team close faster than the competition can react.',
    },
    es: {
      name: 'Brokerage',
      tagline: 'Un solo panel. Todos tus agentes. Todos los leads. Con tu marca al frente, tu equipo cerrará más rápido de lo que la competencia puede reaccionar.',
    },
  },
  enterprise: {
    en: {
      name: 'Enterprise',
      tagline: "White-label the entire platform — your logo, your domain, your rules. Built for institutions that don't follow the market. They define it.",
    },
    es: {
      name: 'Empresarial',
      tagline: 'Marca blanca de toda la plataforma — tu logo, tu dominio, tus reglas. Hecho para instituciones que no siguen al mercado: lo definen.',
    },
  },
  investor: {
    en: {
      name: 'Investor',
      tagline: 'See the deal before it becomes a listing. Off-market access, instant ROI modeling, and cash-flow clarity — for investors who move first and never look back.',
    },
    es: {
      name: 'Inversionista',
      tagline: 'Ve la oportunidad antes de que sea un listado. Acceso fuera de mercado, modelado de ROI instantáneo y claridad de flujo de caja — para inversionistas que actúan primero y nunca miran atrás.',
    },
  },
};

export const FEATURE_LABELS: Record<Lang, Record<string, string>> = {
  en: {
    browse_listings: 'Full access to every listing',
    favorites_limit_5: 'Save up to 5 favorites',
    basic_search: 'Smart search filters',
    weekly_alerts: 'Weekly new-listing alerts',
    contact_agents: 'Message agents directly',
    listings_limit_1: 'Publish 1 listing — free, forever',
    photos_limit_12: '12 photos per listing',
    unlimited_favorites: 'Unlimited saved favorites',
    advanced_search: 'Advanced filters & saved searches',
    daily_alerts: 'Daily alerts — first look, every time',
    listings_limit_100: 'Manage up to 100 active listings',
    lead_notifications: 'Instant lead notifications',
    agent_profile: 'Public agent profile page',
    basic_analytics: 'Listing performance analytics',
    digital_contracts: 'Digital contract generator',
    verified_badge: '"Verified Agent" badge — instant credibility',
    google_maps_pin: 'Google Maps pin on every listing',
    featured_1_month: '1 month of featured placement',
    unlimited_listings: 'UNLIMITED listings — your entire inventory, live',
    agent_accounts_10: '10 agent seats included',
    team_crm: 'Built-in team CRM',
    shared_leads: 'Shared lead pool across your team',
    team_analytics: 'Team-wide performance analytics',
    brokerage_branding: 'Your brokerage brand, front and center',
    priority_support: 'Priority support — skip the line',
    lead_scoring: 'AI lead scoring — know who’s ready to buy',
    performance_analytics: 'Deep performance analytics',
    featured_listings_3: '3 featured listing slots',
    agent_accounts_50: '50 agent seats included',
    advanced_team_mgmt: 'Advanced team management & permissions',
    custom_integrations: 'Custom integrations on request',
    api_access: 'Full API access',
    white_label: 'White-label the entire platform',
    advanced_reporting: 'Advanced reporting suite',
    account_manager: 'Dedicated account manager',
    unlimited_featured: 'Unlimited featured placements',
    top_placement: 'Permanent top-of-search placement',
    priority_deal_alerts: "Priority deal alerts — be first to know",
    investment_search: 'Investment-grade search filters',
    roi_calculator: 'Built-in ROI calculator',
    market_analysis: 'Real-time market analysis',
    portfolio_tracking_10: 'Track up to 10 properties in your portfolio',
    deal_analysis: 'Automated deal analysis',
    comparative_analysis: 'Comparative market analysis (CMA)',
    cash_flow_projections: 'Cash-flow projections',
    offmarket_deals: 'Off-market & pre-listing access',
    investor_network: 'Private investor network access',
    export_csv: 'Export your data to CSV, anytime',
    email_support_24h: 'Email support — 24-hour response',
    shared_favorites: 'Shared team favorites & saved searches',
    role_based_access: 'Role-based access for every team member',
    bulk_export: 'Bulk export & reporting tools',
    priority_chat_2h: 'Priority live chat — 2-hour response',
    sso_saml: 'Single sign-on (SSO/SAML)',
    dedicated_success_manager: 'Dedicated success manager — a real person, on call',
    white_glove_onboarding: 'White-glove onboarding & data migration',
    sla_uptime: '99.9% uptime SLA, guaranteed',
    sniper_mode: '"Sniper Mode" — the alert before it\'s public',
    premium_support_30min: 'Premium support — 30-minute response, any time',
  },
  es: {
    browse_listings: 'Acceso total a todas las propiedades',
    favorites_limit_5: 'Guarda hasta 5 favoritos',
    basic_search: 'Filtros de búsqueda inteligentes',
    weekly_alerts: 'Alertas semanales de nuevas propiedades',
    contact_agents: 'Mensajea directamente con agentes',
    listings_limit_1: 'Publica 1 propiedad — gratis, para siempre',
    photos_limit_12: '12 fotos por propiedad',
    unlimited_favorites: 'Favoritos ilimitados',
    advanced_search: 'Filtros avanzados y búsquedas guardadas',
    daily_alerts: 'Alertas diarias — sé el primero en verlo',
    listings_limit_100: 'Administra hasta 100 propiedades activas',
    lead_notifications: 'Notificaciones instantáneas de leads',
    agent_profile: 'Perfil público de agente',
    basic_analytics: 'Analíticas de rendimiento de tus listados',
    digital_contracts: 'Generador de contratos digitales',
    verified_badge: 'Insignia "Agente Verificado" — credibilidad instantánea',
    google_maps_pin: 'Pin en Google Maps en cada propiedad',
    featured_1_month: '1 mes de posicionamiento destacado',
    unlimited_listings: 'Propiedades ILIMITADAS — todo tu inventario, en vivo',
    agent_accounts_10: '10 cuentas de agente incluidas',
    team_crm: 'CRM de equipo integrado',
    shared_leads: 'Bolsa de leads compartida para tu equipo',
    team_analytics: 'Analíticas de rendimiento del equipo',
    brokerage_branding: 'Tu marca de brokerage en primer plano',
    priority_support: 'Soporte prioritario — sin filas de espera',
    lead_scoring: 'Puntuación de leads con IA — sabe quién está listo para comprar',
    performance_analytics: 'Analíticas de rendimiento avanzadas',
    featured_listings_3: '3 espacios de propiedades destacadas',
    agent_accounts_50: '50 cuentas de agente incluidas',
    advanced_team_mgmt: 'Gestión avanzada de equipo y permisos',
    custom_integrations: 'Integraciones personalizadas a pedido',
    api_access: 'Acceso completo a la API',
    white_label: 'Plataforma de marca blanca, 100% tuya',
    advanced_reporting: 'Suite de reportes avanzados',
    account_manager: 'Gestor de cuenta dedicado',
    unlimited_featured: 'Posicionamientos destacados ilimitados',
    top_placement: 'Posición #1 permanente en búsquedas',
    priority_deal_alerts: 'Alertas prioritarias de oportunidades',
    investment_search: 'Filtros de búsqueda para inversionistas',
    roi_calculator: 'Calculadora de ROI integrada',
    market_analysis: 'Análisis de mercado en tiempo real',
    portfolio_tracking_10: 'Rastrea hasta 10 propiedades en tu portafolio',
    deal_analysis: 'Análisis automático de oportunidades',
    comparative_analysis: 'Análisis comparativo de mercado (CMA)',
    cash_flow_projections: 'Proyecciones de flujo de caja',
    offmarket_deals: 'Acceso a propiedades fuera de mercado',
    investor_network: 'Acceso a la red privada de inversionistas',
    export_csv: 'Exporta tus datos a CSV cuando quieras',
    email_support_24h: 'Soporte por email — respuesta en 24 horas',
    shared_favorites: 'Favoritos y búsquedas guardadas compartidas del equipo',
    role_based_access: 'Acceso por roles para cada miembro del equipo',
    bulk_export: 'Exportación masiva y herramientas de reportes',
    priority_chat_2h: 'Chat prioritario — respuesta en 2 horas',
    sso_saml: 'Inicio de sesión único (SSO/SAML)',
    dedicated_success_manager: 'Gestor de éxito dedicado — una persona real, disponible',
    white_glove_onboarding: 'Incorporación y migración de datos con servicio premium',
    sla_uptime: 'SLA de 99.9% de disponibilidad garantizada',
    sniper_mode: '"Modo Sniper" — la alerta antes de que sea pública',
    premium_support_30min: 'Soporte premium — respuesta en 30 minutos, a cualquier hora',
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
