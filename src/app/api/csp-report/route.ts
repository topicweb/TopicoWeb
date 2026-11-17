import { logger, type LogFields } from '@/core/utils/logger';

const MAX_REPORT_BYTES = 16 * 1024;
const ALLOWED_TYPES = new Set(['application/csp-report', 'application/reports+json']);

function validReport(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const report = value as Record<string, unknown>;
  // Accept only the small standard envelope and never retain or emit its values.
  const legacy = report['csp-report'];
  const body = report.body;
  return (!!legacy && typeof legacy === 'object' && !Array.isArray(legacy)) ||
    (report.type === 'csp-violation' && !!body && typeof body === 'object' && !Array.isArray(body));
}

const CSP_DIRECTIVES = new Set([
  'default-src', 'script-src', 'style-src', 'img-src', 'connect-src', 'font-src',
  'object-src', 'base-uri', 'frame-ancestors', 'form-action', 'upgrade-insecure-requests',
]);

type CspDirective = Exclude<LogFields['cspDirective'], undefined>;

function directiveBucket(value: unknown): CspDirective {
  if (typeof value !== 'string') return 'other';
  const directive = value.trim().split(/\s+/, 1)[0].toLowerCase();
  if (directive === 'script-src-elem' || directive === 'script-src-attr') return 'script-src';
  if (directive === 'style-src-elem' || directive === 'style-src-attr') return 'style-src';
  return CSP_DIRECTIVES.has(directive) ? directive as CspDirective : 'other';
}

export async function POST(request: Request) {
  const contentType = (request.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
  if (!ALLOWED_TYPES.has(contentType)) return new Response(null, { status: 415 });
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_REPORT_BYTES) return new Response(null, { status: 413 });
  if (!request.body) return new Response(null, { status: 400 });

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REPORT_BYTES) {
        await reader.cancel();
        return new Response(null, { status: 413 });
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    chunks.forEach((chunk) => { bytes.set(chunk, offset); offset += chunk.byteLength; });
    const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));
    const reports = Array.isArray(payload) ? payload : [payload];
    if (!reports.length || reports.length > 20 || reports.some((report) => !validReport(report))) {
      return new Response(null, { status: 400 });
    }
    const counts = new Map<string, number>();
    reports.forEach((entry) => {
      const report = entry as Record<string, unknown>;
      const legacy = report['csp-report'] as Record<string, unknown> | undefined;
      const body = report.body as Record<string, unknown> | undefined;
      const bucket = directiveBucket(legacy?.['effective-directive'] ?? legacy?.['violated-directive'] ?? body?.effectiveDirective);
      counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    });
    counts.forEach((count, cspDirective) => logger.warn('security.csp_report', { cspDirective: cspDirective as CspDirective, count }));
    return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return new Response(null, { status: 400 });
  }
}

export const runtime = 'edge';
