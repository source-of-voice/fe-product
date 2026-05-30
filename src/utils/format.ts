import type { TFunction } from 'i18next';
import type { WalletTransactionResponse } from '../types/domain';

export function toneForStatus(status?: string | null): 'neutral' | 'success' | 'warning' | 'danger' {
  if (!status) return 'neutral';
  if (status.includes('APPROVED') || status.includes('ACTIVE') || status.includes('FINISHED') || status.includes('COMPLETED')) return 'success';
  if (status.includes('REJECTED') || status.includes('DISABLED') || status.includes('FAILED') || status.includes('ARCHIVED')) return 'danger';
  if (status.includes('REVIEW') || status.includes('SUBMITTED') || status.includes('RUNNING') || status.includes('STARTED')) return 'warning';
  return 'neutral';
}

export function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  return `${value} PLN`;
}

export function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function humanizeConstant(value?: string | null) {
  if (!value) return '—';
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatStatusLabel(status?: string | null, t?: TFunction) {
  const fallback = humanizeConstant(status);
  if (!status || !t) return fallback;
  return t(`statusLabels.${status}`, { defaultValue: fallback });
}

export function formatTransactionTitle(type?: string | null, t?: TFunction) {
  const fallback = type === 'AUDIO_REWARD' ? 'Audio reward' : humanizeConstant(type);
  if (!type || !t) return fallback;
  return t(`transactionTypes.${type}`, { defaultValue: fallback });
}

export function formatTransactionDescription(transaction: WalletTransactionResponse, t?: TFunction) {
  if (transaction.type === 'AUDIO_REWARD') {
    const fallback = 'Payment for accepted recording';
    return t ? t('transactionDescriptions.AUDIO_REWARD', { defaultValue: fallback }) : fallback;
  }

  return transaction.description ?? '—';
}

export function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function languageCodeFromI18n(language: string) {
  return language.toLowerCase().startsWith('pl') ? 'pl' : 'en';
}

export function fileSize(bytes: number) {
  if (!Number.isFinite(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
