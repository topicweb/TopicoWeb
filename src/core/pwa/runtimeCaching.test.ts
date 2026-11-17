import { describe, expect, it } from 'vitest';
import { runtimeCaching, shouldCacheRuntimeUrl } from './runtimeCaching';

describe('PWA runtime cache policy', () => {
  it('caches only approved local static assets', () => {
    expect(shouldCacheRuntimeUrl('/_next/static/chunks/app.js', 'https://app.test')).toBe(true);
    expect(shouldCacheRuntimeUrl('/images/logo.webp', 'https://app.test')).toBe(true);
    expect(shouldCacheRuntimeUrl('/dashboard', 'https://app.test')).toBe(false);
    expect(shouldCacheRuntimeUrl('/api/data', 'https://app.test')).toBe(false);
    expect(shouldCacheRuntimeUrl('https://other.test/images/logo.webp', 'https://app.test')).toBe(false);
    expect(shouldCacheRuntimeUrl('/images/logo.webp?v=1', 'https://app.test')).toBe(false);
  });

  it('uses network-only as the catch-all after static-only rules', () => {
    expect(runtimeCaching.at(-1)?.handler).toBe('NetworkOnly');
    expect(runtimeCaching.slice(0, -1).every((rule) => rule.handler === 'CacheFirst')).toBe(true);
  });

  it('applies same-origin, anchored, query-free matching in the actual Workbox callbacks', () => {
    const matchesStatic = runtimeCaching[0].urlPattern as (options: { url: URL }) => boolean;
    const matchesImage = runtimeCaching[1].urlPattern as (options: { url: URL }) => boolean;
    const origin = self.location.origin;
    expect(matchesStatic({ url: new URL('/_next/static/app.js', origin) })).toBe(true);
    expect(matchesStatic({ url: new URL('/api/_next/static/app.js', origin) })).toBe(false);
    expect(matchesStatic({ url: new URL('/_next/static/app.js?v=1', origin) })).toBe(false);
    expect(matchesImage({ url: new URL('/images/logo.webp', origin) })).toBe(true);
    expect(matchesImage({ url: new URL('https://other.test/images/logo.webp') })).toBe(false);
  });
});
