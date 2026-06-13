import { sign, verify } from 'hono/jwt';
import type { AuthUser } from '../types';

const TOKEN_TTL_SECONDS = 60 * 60 * 24; // 24h

export async function createToken(user: AuthUser, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    { sub: String(user.id), email: user.email, role: user.role, iat: now, exp: now + TOKEN_TTL_SECONDS },
    secret,
    'HS256'
  );
}

export async function readToken(token: string, secret: string): Promise<AuthUser | null> {
  try {
    const payload = await verify(token, secret, 'HS256');
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) return null;
    return { id, email: String(payload.email ?? ''), role: String(payload.role ?? 'buyer') };
  } catch {
    return null;
  }
}
