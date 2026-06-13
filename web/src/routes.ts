interface SearchRouteOptions {
  q?: string;
  listingType?: 'sale' | 'rent' | '';
  propertyType?: string;
  minPrice?: string;
  maxPrice?: string;
  minBeds?: string;
  sort?: string;
  page?: number;
}

export function propertyPath(id: number) {
  return `/property/${id}`;
}

export function searchPath(options: SearchRouteOptions = {}) {
  const params = new URLSearchParams();
  if (options.q?.trim()) params.set('q', options.q.trim());
  if (options.listingType) params.set('listingType', options.listingType);
  if (options.propertyType) params.set('propertyType', options.propertyType);
  if (options.minPrice && Number(options.minPrice) > 0) params.set('minPrice', options.minPrice);
  if (options.maxPrice && Number(options.maxPrice) > 0) params.set('maxPrice', options.maxPrice);
  if (options.minBeds && Number(options.minBeds) > 0) params.set('minBeds', options.minBeds);
  if (options.sort && options.sort !== 'newest') params.set('sort', options.sort);
  if (options.page && options.page > 1) params.set('page', String(options.page));
  const query = params.toString();
  return query ? `/search?${query}` : '/search';
}

export function dashboardPath() {
  return '/dashboard';
}

export function newListingPath() {
  return '/dashboard/new';
}

export function editListingPath(id: number) {
  return `/dashboard/edit/${id}`;
}

export function favoritesPath() {
  return '/favorites';
}

export function messagesPath(userId?: number) {
  return userId ? `/messages/${userId}` : '/messages';
}

export function requirementsPath() {
  return '/requirements';
}

export function pricingPath() {
  return '/pricing';
}

export function checkoutPath(planId: string, billing: 'monthly' | 'annual') {
  return `/checkout?plan=${encodeURIComponent(planId)}&billing=${billing}`;
}

export function profilePath() {
  return '/profile';
}

export function analyticsPath() {
  return '/analytics';
}

export function contactPath() {
  return '/contact';
}
