/**
 * Retry logic con exponential backoff
 * Reintenta operaciones fallidas con delays crecientes
 */

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: unknown) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Si no debe reintentar o es el último intento, lanzar error
      if (!shouldRetry(error) || attempt === maxRetries) {
        throw error;
      }

      // Calcular delay con exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      
      console.warn(`[Retry] Intento ${attempt + 1}/${maxRetries + 1} falló, reintentando en ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
