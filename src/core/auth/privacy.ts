/** Purge sensitive responses from this application's known Workbox caches only.
 * IndexedDB, queues, public assets and unrelated application caches are retained. */
export async function purgePrivateResponses(storage: CacheStorage, origin: string): Promise<void> {
  const appOrigin = new URL(origin).origin;
  const runtimeNames = new Set(['others', 'cross-origin', 'apis', 'pages', 'start-url', 'next-data', 'next-data-prefetch', 'next-data-rsc', 'next-data-rsc-prefetch']);
  for (const name of await storage.keys()) {
    const ownPrecache = name.startsWith('workbox-precache-') && name.endsWith(`${appOrigin}/`);
    if (!runtimeNames.has(name) && !ownPrecache && !name.startsWith('topico-')) continue;
    const cache = await storage.open(name);
    for (const request of await cache.keys()) {
      const url = new URL(request.url);
      const privateRequest = url.origin !== appOrigin || url.pathname === '/dashboard' || url.pathname.startsWith('/dashboard/') ||
        url.pathname === '/login' || url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/') ||
        url.pathname.startsWith('/rest/') || url.pathname.startsWith('/_next/data/') || url.searchParams.has('_rsc');
      if (privateRequest) await cache.delete(request);
    }
  }
}

export function clearLocalAuthCredentials(url: string | undefined, storage: Storage, documentCookies: Document): void {
  if (!url) return;
  const project = new URL(url).hostname.split('.')[0];
  const prefix = `sb-${project}-auth-token`;
  storage.removeItem(prefix);
  for (const cookie of documentCookies.cookie.split(';')) {
    const name = cookie.trim().split('=')[0];
    if (name === prefix || name === `${prefix}-code-verifier` || name.startsWith(`${prefix}.`)) {
      documentCookies.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
    }
  }
}
