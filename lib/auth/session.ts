import type { NextRequest } from 'next/server';
import type { User, Role } from '@/lib/types';

/**
 * Single source of truth for BettaPay session cookie contract.
 * Used by middleware, hooks (useSessionCheck), store, and e2e helpers
 * to avoid drift when tokens rotate (POST /api/auth/session sets both).
 */

export const AUTH_TOKEN_COOKIE = 'auth_token' as const;
export const USER_ROLE_COOKIE = 'user_role' as const;
export const MERCHANT_ONBOARDED_COOKIE = 'merchant_onboarded' as const;
export const CSRF_COOKIE = 'csrf_token' as const;

/** Persisted localStorage key for zustand auth store (bp-session). */
export const BP_SESSION_KEY = 'bp-session' as const;

export interface Session {
  user: User | null;
  token: string | null;
  role: Role | null;
  isAuthenticated: boolean;
}

export type SessionCheckResponse = { user: User; token: string };

function normalizeRole(raw?: string | null): Role | null {
  const v = (raw ?? '').toLowerCase().trim();
  if (v === 'admin') return 'admin';
  if (v === 'merchant') return 'merchant';
  return null;
}

/**
 * Derive Session from a NextRequest cookie jar (middleware) or any
 * object with a `get(name)` that returns `{value}`.
 * Valid session requires a non-empty auth_token; role may be null (defaults to merchant on hydrate).
 */
export function getSessionFromCookies(
  cookies: Pick<NextRequest['cookies'], 'get'>,
): Session {
  const token = cookies.get(AUTH_TOKEN_COOKIE)?.value ?? null;
  const rawRole = cookies.get(USER_ROLE_COOKIE)?.value ?? null;
  const role = normalizeRole(rawRole);
  const isAuthenticated = Boolean(token && token.trim().length > 0);
  // User not decoded here — hydrate via GET /api/auth/session in the hook
  return { user: null, token: isAuthenticated ? token : null, role, isAuthenticated };
}

/** Guard used by middleware and hooks — same predicate. */
export function isSessionValid(session: Session): boolean {
  return session.isAuthenticated && Boolean(session.token);
}

/** Route classification shared by middleware and client flash guard. */
export function isPublicRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname.startsWith('/pay') ||
    pathname === '/contact' ||
    pathname.startsWith('/docs') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/fiat-settlements') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/about') ||
    pathname.startsWith('/guides') ||
    pathname.startsWith('/sdks') ||
    pathname.startsWith('/status')
  );
}
export function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith('/auth');
}

/** Shape persisted in localStorage bp-session (zustand partialize). */
export interface PersistedAuthState {
  isLoggedIn: boolean;
}
