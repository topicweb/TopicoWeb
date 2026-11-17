import { afterEach, describe, expect, it, vi } from 'vitest';
import { withRetry, withSupabaseRetry } from './retry';

afterEach(() => vi.useRealTimers());

describe('withRetry', () => {
  it('retries network TypeErrors then returns the successful value', async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockRejectedValueOnce(new TypeError('network')).mockResolvedValue('ok');
    const promise = withRetry(fn, { baseDelay: 0 });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it.each([408, 429, 500])('retries HTTP %i', async (status) => {
    vi.useFakeTimers();
    const fn = vi.fn().mockRejectedValueOnce({ status }).mockResolvedValue('ok');
    const promise = withRetry(fn, { baseDelay: 0 });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe('ok');
  });

  it.each([400, 401, 403, 422])('does not retry HTTP %i', async (status) => {
    const error = { status };
    const fn = vi.fn().mockRejectedValue(error);
    await expect(withRetry(fn, { baseDelay: 0 })).rejects.toBe(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries PostgreSQL serialization and deadlock errors', async () => {
    vi.useFakeTimers();
    const fn = vi.fn().mockRejectedValueOnce({ code: '40001' }).mockResolvedValue('ok');
    const promise = withRetry(fn, { baseDelay: 0 });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe('ok');
  });

  it('retries Supabase resolved error responses and preserves the successful result', async () => {
    vi.useFakeTimers();
    const success = { data: { id: 1 }, error: null };
    const fn = vi.fn().mockResolvedValueOnce({ data: null, error: { code: '40P01' } }).mockResolvedValue(success);
    const promise = withSupabaseRetry(fn, { baseDelay: 0 });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBe(success);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws Supabase error when retries are exhausted and keeps its status', async () => {
    const error = { message: 'unavailable' };
    const fn = vi.fn().mockResolvedValue({ data: null, error, status: 503 });
    await expect(withSupabaseRetry(fn, { maxRetries: 0, baseDelay: 0 })).rejects.toMatchObject({ status: 503 });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
