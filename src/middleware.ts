import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const privatePath = (pathname: string) =>
  pathname === '/dashboard' || pathname.startsWith('/dashboard/');
const sensitivePath = (pathname: string) =>
  privatePath(pathname) || pathname === '/login' || pathname === '/auth' || pathname.startsWith('/auth/') ||
  pathname === '/api' || pathname.startsWith('/api/');

function validSupabaseOrigin(value?: string) {
  if (!value) return "'self'";
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
      return url.origin;
    }
  } catch { /* use self only for malformed or untrusted configuration */ }
  return "'self'";
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let response = NextResponse.next({ request });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseOrigin = validSupabaseOrigin(supabaseUrl);

  if (privatePath(pathname) && supabaseUrl && supabaseKey && supabaseOrigin !== "'self'") {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          const previousCookies = response.cookies.getAll();
          response = NextResponse.next({ request });
          previousCookies.forEach((cookie) => response.cookies.set(cookie));
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    let authenticated = false;
    try {
      const { data, error } = await supabase.auth.getUser();
      authenticated = !error && !!data.user;
    } catch {
      authenticated = false;
    }
    if (!authenticated) {
      const redirect = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      response = redirect;
    }
  } else if (privatePath(pathname)) {
    response = NextResponse.redirect(new URL('/login', request.url));
  }

  if (sensitivePath(pathname)) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
    response.headers.set('Pragma', 'no-cache');
  }
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Content-Security-Policy-Report-Only', [
    "default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'self'",
    "form-action 'self'", `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`, "style-src 'self' 'unsafe-inline'",
    'img-src \'self\' data: blob: https:', 'font-src \'self\' data: https:',
    `connect-src 'self' ${supabaseOrigin} ${supabaseOrigin.replace(/^https:/, 'wss:')}`,
    "worker-src 'self' blob:", "frame-src 'self' blob:", 'report-uri /api/csp-report',
  ].join('; '));
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
