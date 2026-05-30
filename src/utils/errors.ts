import type { TFunction } from 'i18next';
import { ApiError } from '../api/http';

const TECHNICAL_ERROR_PATTERNS = [
  /^request failed( with status)? \d{3}$/i,
  /^http \d{3}$/i,
  /^\d{3}$/,
  /^bad request$/i,
  /^unauthorized$/i,
  /^forbidden$/i,
  /^not found$/i,
  /^conflict$/i,
  /^internal server error$/i,
  /^service unavailable$/i
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeMessage(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  const normalized = value.trim();
  if (!normalized) return false;

  return !TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(normalized));
}

function extractValidationMessage(value: unknown): string | null {
  if (Array.isArray(value)) {
    const messages = value
      .map(extractBackendMessage)
      .filter((message): message is string => Boolean(message));

    return messages.length ? messages.join(' ') : null;
  }

  if (!isRecord(value)) return null;

  const messages = Object.values(value)
    .map((entry) => {
      if (Array.isArray(entry)) {
        return entry.filter(isSafeMessage).join(' ');
      }

      return isSafeMessage(entry) ? entry : null;
    })
    .filter((message): message is string => Boolean(message));

  return messages.length ? messages.join(' ') : null;
}

export function extractBackendMessage(details: unknown): string | null {
  if (isSafeMessage(details)) {
    return details.trim();
  }

  if (!isRecord(details)) {
    return null;
  }

  const directFields = ['message', 'detail', 'errorMessage', 'reason', 'description'];

  for (const field of directFields) {
    const value = details[field];
    if (isSafeMessage(value)) {
      return value.trim();
    }
  }

  const validationMessage = extractValidationMessage(details.errors ?? details.violations ?? details.fieldErrors);
  if (validationMessage) {
    return validationMessage;
  }

  return null;
}

export function getUserFriendlyErrorMessage(error: unknown, t: TFunction): string {
  if (error instanceof ApiError) {
    const backendMessage = extractBackendMessage(error.details);
    if (backendMessage) return backendMessage;

    switch (error.status) {
      case 400:
        return t('errors.badRequest');
      case 401:
        return t('errors.unauthorized');
      case 403:
        return t('errors.forbidden');
      case 404:
        return t('errors.notFound');
      case 409:
        return t('errors.conflict');
      case 413:
        return t('errors.fileTooLarge');
      case 415:
        return t('errors.unsupportedMedia');
      case 422:
        return t('errors.validation');
      case 429:
        return t('errors.tooManyRequests');
      default:
        if (error.status >= 500) return t('errors.server');
        return t('errors.unexpected');
    }
  }

  if (error instanceof Error && isSafeMessage(error.message)) {
    return error.message;
  }

  return t('errors.unexpected');
}
