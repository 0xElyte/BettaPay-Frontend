/**
 * Module-level reference to the Next.js App Router instance.
 *
 * Code that lives outside the React component tree (e.g. the axios
 * interceptors in lib/api/axios.ts) can't call the `useRouter` hook, so a
 * top-level client provider registers the router here once on mount. Non-React
 * code then navigates via `getAppRouter()?.push(...)` and falls back to
 * `window.location` when the router hasn't been registered (SSR, tests, or
 * calls that happen before the provider mounts).
 */

/** Minimal slice of next/navigation's router that we actually use. */
export interface AppRouter {
  push: (href: string) => void;
}

let routerRef: AppRouter | null = null;

export function setAppRouter(router: AppRouter | null): void {
  routerRef = router;
}

export function getAppRouter(): AppRouter | null {
  return routerRef;
}
