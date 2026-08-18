import { AxiosError } from 'axios';

export const REQUEST_TIMED_OUT_CODE = 'ECONNABORTED';
export const REQUEST_TIMED_OUT_MESSAGE = 'The request timed out. Please try again.';

export function isTimeoutError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code?: string }).code === REQUEST_TIMED_OUT_CODE;
  }
  return false;
}

export interface ApiErrorResponse {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

export class ApiError extends Error {
  code?: string;
  status?: number;
  details?: unknown;
  fieldErrors?: Record<string, string>;

  constructor(
    message: string,
    code?: string,
    status?: number,
    details?: unknown,
    fieldErrors?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.fieldErrors = fieldErrors;
  }
}

function extractFieldErrors(data: unknown): Record<string, string> | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const obj = data as Record<string, unknown>;
  const errors = obj.errors;

  if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
    const record = errors as Record<string, unknown>;
    const fieldErrors: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === 'string') {
        fieldErrors[key] = value;
      } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
        fieldErrors[key] = value[0];
      }
    }
    if (Object.keys(fieldErrors).length > 0) {
      return fieldErrors;
    }
  }

  return undefined;
}

export function parseApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<{ message?: string; error?: string; code?: string; details?: unknown }>;
    const data = axiosError.response?.data;
    const message =
      REQUEST_TIMED_OUT_CODE === axiosError.code ? REQUEST_TIMED_OUT_MESSAGE : data?.message || data?.error || axiosError.message || 'An unexpected error occurred';
    const code = data?.code || axiosError.code;
    const status = axiosError.response?.status;
    const details = data?.details;
    const fieldErrors = extractFieldErrors(data);

    return new ApiError(message, code, status, details, fieldErrors);
  }

  if (error instanceof Error) {
    return new ApiError(error.message);
  }

  return new ApiError('An unexpected error occurred');
}

export function getErrorMessage(error: unknown): string {
  return parseApiError(error).message;
}
