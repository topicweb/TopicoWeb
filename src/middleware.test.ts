// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

const auth = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (items: Array<{name:string;value:string;options?:Record<string,unknown>}>) => void } }) => ({
    auth: { getUser: async () => {
      options.cookies.setAll([{ name: 'sb-first-cookie', value: 'preserved' }]);
      options.cookies.setAll([{ name: 'sb-refresh-token', value: 'refreshed' }]);
      return auth.getUser();
    } },
  }),
}));

describe('HTTP middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-anon-key';
    auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  });

  it('protects /dashboard and descendants, preserving refreshed cookies on login redirect', async () => {
    auth.getUser.mockImplementation(async () => {
      // Simulate @supabase/ssr refreshing the cookie before returning an auth error.
      return { data: { user: null }, error: new Error('expired') };
    });
    const result = await middleware(new NextRequest('https://app.test/dashboard/records'));
    expect(result.status).toBe(307);
    expect(result.headers.get('location')).toBe('https://app.test/login');
    expect(result.headers.get('Cache-Control')).toContain('no-store');
    expect(result.cookies.get('sb-refresh-token')?.value).toBe('refreshed');
    expect(result.cookies.get('sb-first-cookie')?.value).toBe('preserved');
    expect(auth.getUser).toHaveBeenCalledOnce();
  });

  it('allows public pages without requiring a user and sets report-only security headers', async () => {
    const result = await middleware(new NextRequest('https://app.test/about'));
    expect(auth.getUser).not.toHaveBeenCalled();
    expect(result.status).toBe(200);
    expect(result.headers.get('Content-Security-Policy-Report-Only')).toContain('report-uri /api/csp-report');
    expect(result.headers.get('Content-Security-Policy')).toBeNull();
    expect(result.headers.get('Referrer-Policy')).toBe('no-referrer');
  });

  it('allows an authenticated dashboard and disables caching for dashboard and APIs', async () => {
    const dashboard = await middleware(new NextRequest('https://app.test/dashboard'));
    const api = await middleware(new NextRequest('https://app.test/api/records'));
    expect(dashboard.headers.get('Cache-Control')).toContain('no-store');
    expect(api.headers.get('Cache-Control')).toContain('no-store');
    expect(auth.getUser).toHaveBeenCalledOnce();
  });
});
