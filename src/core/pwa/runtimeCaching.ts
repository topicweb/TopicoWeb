const NEXT_STATIC_ASSET = /^\/_next\/static\/.+\.(?:js|css|woff2?)$/i;
const PUBLIC_IMAGE_ASSET = /^\/(?:icons|images)\/.+\.(?:png|jpe?g|webp|svg|ico)$/i;

/** Cache only immutable same-origin static files. Everything dynamic is network-only. */
export const runtimeCaching = [
  {
    // Workbox serializes this callback: it must not capture module variables.
    urlPattern: ({ url }: { url: URL }) => url.origin === self.location.origin && !url.search && !url.hash && /^\/_next\/static\/.+\.(?:js|css|woff2?)$/i.test(url.pathname),
    handler: 'CacheFirst',
    options: { cacheName: 'topico-static-v1', expiration: { maxEntries: 80, maxAgeSeconds: 31_536_000 } },
  },
  {
    urlPattern: ({ url }: { url: URL }) => url.origin === self.location.origin && !url.search && !url.hash && /^\/(?:icons|images)\/.+\.(?:png|jpe?g|webp|svg|ico)$/i.test(url.pathname),
    handler: 'CacheFirst',
    options: { cacheName: 'topico-public-assets-v1', expiration: { maxEntries: 80, maxAgeSeconds: 2_592_000 } },
  },
  // Catch documents, RSC, API, auth, dashboard, cross-origin and all other URLs.
  { urlPattern: /.*/, handler: 'NetworkOnly' },
] as const;

export function shouldCacheRuntimeUrl(input: string | URL, appOrigin: string) {
  const url = input instanceof URL ? input : new URL(input, appOrigin);
  return isCacheableAsset(url, appOrigin, NEXT_STATIC_ASSET) || isCacheableAsset(url, appOrigin, PUBLIC_IMAGE_ASSET);
}

function isCacheableAsset(url: URL, appOrigin: string, pathPattern: RegExp) {
  return url.origin === appOrigin && !url.search && !url.hash && pathPattern.test(url.pathname);
}
