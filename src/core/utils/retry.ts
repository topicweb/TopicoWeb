/** Retry logic with exponential backoff for transient network and database errors. */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: unknown) => boolean;
}

type ErrorLike = { name?: unknown; code?: unknown; status?: unknown; statusCode?: unknown; message?: unknown };

function isTransient(error: unknown): boolean {
  if (error instanceof TypeError) return true; // fetch network failures
  if (!error || typeof error !== 'object') return false;
  const e = error as ErrorLike;
  if (e.name === 'TypeError' || e.name === 'AuthRetryableFetchError') return true;
  if (Number(e.status) === 0 && typeof e.message === 'string' && /fetch|network|ECONNRESET|ECONNREFUSED/i.test(e.message)) return true;
  const code = typeof e.code === 'string' ? e.code : '';
  if (['40001', '40P01', '53300', '57P01'].includes(code)) return true;
  const status = Number(e.status ?? e.statusCode);
  return status === 408 || status === 429 || status >= 500;
}

export async function withRetry<T>(fn: () => PromiseLike<T>, options: RetryOptions = {}): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000, shouldRetry = isTransient } = options;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!shouldRetry(error) || attempt >= maxRetries) throw error;
      await new Promise<void>((resolve) => setTimeout(resolve, Math.min(baseDelay * 2 ** attempt, maxDelay)));
    }
  }
}

/** Retries Supabase's resolved { error } responses as well as rejected requests. */
export function withSupabaseRetry<T extends { error?: unknown; status?: unknown }>(
  fn: () => PromiseLike<T>,
  options: RetryOptions = {},
): Promise<T> {
  return withRetry(async () => {
    const result = await fn();
    if (result?.error) {
      const error = result.error;
      if (error && typeof error === 'object' && (error as ErrorLike).status == null && result.status != null) {
        try { Object.assign(error, { status: result.status }); } catch { /* retain original error */ }
      }
      throw error;
    }
    return result;
  }, options);
}
