import { afterEach, describe, expect, it, vi } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  afterEach(() => vi.restoreAllMocks());

  it('emite solo el evento literal y los campos seguros admitidos', () => {
    const output = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('sync.table_failed', {
      area: 'sync', operation: 'push', count: 2,
      message: 'DNI 12345678 email persona@example.test',
      error: new Error('token secret'),
      body: { dni: '12345678' },
    } as never);
    expect(output).toHaveBeenCalledOnce();
    expect(output).toHaveBeenCalledWith({ event: 'sync.table_failed', area: 'sync', operation: 'push', count: 2 });
  });

  it('descarta eventos no registrados en runtime', () => {
    const output = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('untrusted.event' as never, { count: 1 });
    expect(output).not.toHaveBeenCalled();
  });

  it('rechaza campos seguros con formato o valores inválidos', () => {
    const output = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('security.csp_report', {
      count: -2,
      cspDirective: 'script-src https://private.example/path' as never,
      area: 'email@example.test' as never,
      online: 'yes' as never,
    });
    expect(output).toHaveBeenCalledWith({ event: 'security.csp_report' });
  });
});
