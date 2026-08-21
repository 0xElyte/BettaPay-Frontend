/**
 * Route normalization for RUM telemetry.
 *
 * Strips query strings, fragments, and leading/trailing slashes to produce
 * a canonical route label. Dynamic segments are preserved as-is so route
 * patterns remain useful for aggregation (e.g. `/pay/[linkId]` stays as
 * `/pay/[linkId]`).
 *
 * PII-safe: query parameters are never included.
 */

/**
 * Normalize a pathname into a canonical route label.
 *
 * Examples:
 *   `/dashboard?foo=bar#section` → `/dashboard`
 *   `/pay/link_abc123`          → `/pay/link_abc123`
 *   `//overview/`               → `/overview`
 *   ``                          → `/`
 */
export function normalizeRoute(pathname: string): string {
  if (!pathname || typeof pathname !== 'string') {
    return '/';
  }

  // Strip query string and fragment
  let route = pathname.split('?')[0].split('#')[0];

  // Collapse multiple slashes
  route = route.replace(/\/{2,}/g, '/');

  // Remove trailing slash (but keep root as `/`)
  if (route.length > 1 && route.endsWith('/')) {
    route = route.slice(0, -1);
  }

  // Ensure leading slash
  if (!route.startsWith('/')) {
    route = '/' + route;
  }

  return route || '/';
}
