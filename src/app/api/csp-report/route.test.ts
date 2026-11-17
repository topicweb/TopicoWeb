import { describe, expect, it, vi } from 'vitest';
const logger = vi.hoisted(() => ({ warn: vi.fn() }));
vi.mock('@/core/utils/logger', () => ({ logger }));
import { POST } from './route';

const post = (body: string, contentType = 'application/csp-report', headers: Record<string, string> = {}) =>
  POST(new Request('https://app.test/api/csp-report', {
    method: 'POST', headers: { 'content-type': contentType, ...headers }, body,
  }));

describe('CSP report endpoint', () => {
  it('accepts valid reports without echoing or logging their contents', async () => {
    logger.warn.mockClear();
    const body = JSON.stringify({ 'csp-report': { 'document-uri': 'https://app.test/dashboard?patient=secret', 'blocked-uri': 'https://bad.test', 'violated-directive': 'script-src' } });
    const response = await post(body);
    expect(response.status).toBe(204);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.text()).toBe('');
    expect(logger.warn).toHaveBeenCalledWith('security.csp_report', { cspDirective: 'script-src', count: 1 });
    expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('patient=secret');
  });

  it('rejects unsupported content types and malformed payloads', async () => {
    expect((await post('{}', 'text/plain')).status).toBe(415);
    expect((await post('{')).status).toBe(400);
    expect((await post('{"anything":true}')).status).toBe(400);
  });

  it('enforces the body limit from the header and from the actual stream', async () => {
    expect((await post('{}', 'application/csp-report', { 'content-length': '16385' })).status).toBe(413);
    expect((await post('x'.repeat(16 * 1024 + 1))).status).toBe(413);
  });
});
