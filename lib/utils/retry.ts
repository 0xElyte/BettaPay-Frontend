import { ApiError } from './apiError';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (error: unknown, attempt: number) => void;
  isRetryable?: (error: unknown) => boolean;
}

const defaultIsRetryable = (error: unknown): boolean => {
  return error instanceof ApiError && (error.status ?? 0) >= 500;
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    onRetry,
    isRetryable = defaultIsRetryable,
  } = options || {};

  let attempt = 0;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryable(error)) {
        throw error;
      }

      attempt++;

      if (attempt > maxRetries) {
        throw error;
      }

      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

      console.warn(
        `[retry] Attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`,
        error,
      );

      onRetry?.(error, attempt);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
