export type Role = 'USER' | 'REVIEWER' | 'ADMIN';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub?: string;
  roles?: Role[] | string[];
  ver?: number;
  exp?: number;
  iat?: number;
  jti?: string;
}

export interface SliceResponse<T> {
  content: T[];
  page: number;
  size: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  numberOfElements: number;
}

export type AudioSubmissionStatus =
  | 'SUBMITTED'
  | 'NEEDS_REVIEW'
  | 'IN_REVIEW'
  | 'APPROVED_FOR_PAYMENT'
  | 'REJECTED'
  | string;

export type AudioTextStatus = 'DRAFT' | 'ACTIVE' | 'DISABLED' | 'ARCHIVED' | string;
export type AudioTextBatchStatus = 'RUNNING' | 'FINISHED' | 'FAILED' | string;

export interface AudioSubmissionResponse {
  id: number;
  audioTextId: number;
  status: AudioSubmissionStatus;
  correctnessScore?: number | null;
  payoutAmount?: string | number | null;
}

export interface ReviewerAudioSubmissionDetailsResponse extends AudioSubmissionResponse {
  userId: number;
  sourceTitle?: string | null;
  originalText?: string | null;
  transcriptText?: string | null;
  audioUrl?: string | null;
  assignedReviewerId?: number | null;
  assignedAt?: string | null;
  submittedAt?: string | null;
  transcribedAt?: string | null;
}

export interface WalletResponse {
  walletId: number;
  userId: number;
  balance: string | number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WalletTransactionResponse {
  id: number;
  walletId: number;
  userId: number;
  type: string;
  status: string;
  amount: string | number;
  balanceAfter: string | number;
  sourceService?: string;
  sourceReferenceId?: string;
  description?: string;
  createdAt?: string;
}

export interface UserAudioTextListItemResponse {
  id: number;
  languageCode: string;
  sourceTitle: string;
  wordCount: number;
  difficultyScore: number;
  estimatedReadingSeconds: number;
  basePrice: string | number;
}

export interface UserAudioTextDetailsResponse extends UserAudioTextListItemResponse {
  content: string;
}

export interface AudioTextLike {
  id: number;
  sourceTitle?: string | null;
  title?: string | null;
  content?: string | null;
  languageCode?: string | null;
  wordCount?: number | null;
  characterCount?: number | null;
  difficultyScore?: number | null;
  estimatedReadingSeconds?: number | null;
  basePrice?: string | number | null;
  status?: string | null;
}

export interface AdminAudioTextListItemResponse extends AudioTextLike {
  batchId: number;
  status: AudioTextStatus;
  sourcePageId?: number | null;
  sourceUrl?: string | null;
  createdAt?: string | null;
  activatedAt?: string | null;
  disabledAt?: string | null;
}

export interface AdminAudioTextDetailsResponse extends AdminAudioTextListItemResponse {
  content?: string | null;
}

export interface AudioTextStatusResponse {
  id?: number;
  status: AudioTextStatus;
}

export interface AdminAudioTextBatchListItemResponse {
  id: number;
  createdByAdminId: number;
  status: AudioTextBatchStatus;
  languageCode: string;
  requestedCount: number;
  savedCount: number;
  skippedCount: number;
  minWords: number;
  maxWords: number;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface AdminAudioTextBatchDetailsResponse extends AdminAudioTextBatchListItemResponse {
  errorMessage?: string | null;
}

export interface GenerateWikipediaTextsRequest {
  languageCode: string;
  requestedCount: number;
  minWords: number;
  maxWords: number;
  baseRatePerWord: string | number;
  activateImmediately: boolean;
  wikipediaFetchLimit: number;
  introOnly: boolean;
  minDifficultyScore?: number | null;
  maxDifficultyScor?: number | null;
}

export interface GenerateWikipediaTextsResponse {
  batchId: number;
  status: AudioTextBatchStatus;
  requestedCount: number;
  savedCount: number;
  skippedCount: number;
  startedAt?: string | null;
  finishedAt?: string | null;
  errorMessage?: string | null;
}
