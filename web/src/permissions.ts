export type UserRole = 'admin' | 'agent' | 'seller' | 'landlord' | 'broker' | 'buyer' | 'renter' | 'investor' | 'lawyer' | 'notary' | 'guest';

export const LISTING_ROLES: UserRole[] = ['admin', 'agent', 'seller', 'landlord', 'broker'];
export const AGENT_ROLES: UserRole[] = ['admin', 'agent', 'broker', 'seller', 'landlord'];
export const BUYER_ROLES: UserRole[] = ['buyer', 'renter', 'investor'];

export function hasAnyRole(role: string | null | undefined, roles: UserRole[]) {
  return Boolean(role && roles.includes(role as UserRole));
}

export function canListProperties(role: string | null | undefined) {
  return hasAnyRole(role, LISTING_ROLES);
}

export function canActAsAgent(role: string | null | undefined) {
  return hasAnyRole(role, AGENT_ROLES);
}

export function canManageUsers(role: string | null | undefined) {
  return role === 'admin';
}

export function canViewAnalytics(role: string | null | undefined) {
  return canListProperties(role) || role === 'admin';
}
