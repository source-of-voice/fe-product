import { apiBlob, apiRequest } from "./http";
import type {
  AdminAudioTextBatchDetailsResponse,
  AdminAudioTextBatchListItemResponse,
  AdminAudioTextDetailsResponse,
  AdminAudioTextListItemResponse,
  AudioSubmissionResponse,
  AudioTextStatus,
  AudioTextStatusResponse,
  GenerateWikipediaTextsRequest,
  GenerateWikipediaTextsResponse,
  ReviewerAudioSubmissionDetailsResponse,
  Role,
  SliceResponse,
  UserAudioTextDetailsResponse,
  UserAudioTextListItemResponse,
  WalletResponse,
  WalletTransactionResponse,
} from "../types/domain";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
}

export interface RolePayload {
  userId: number;
  roleName: Role;
}

function query(
  params: Record<string, string | number | boolean | null | undefined>,
) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== "")
      search.set(key, String(value));
  });
  const result = search.toString();
  return result ? `?${result}` : "";
}

export const authApi = {
  register(payload: RegisterPayload) {
    return apiRequest<string>("/auth/register", {
      method: "POST",
      authenticated: false,
      body: JSON.stringify(payload),
    });
  },
  login(payload: LoginPayload) {
    return apiRequest<{ accessToken: string; refreshToken: string }>(
      "/auth/login",
      {
        method: "POST",
        authenticated: false,
        body: JSON.stringify(payload),
      },
    );
  },
  logout() {
    return apiRequest<string>("/auth/logout", { method: "POST" });
  },
  changeEmail(email: string) {
    return apiRequest<string>("/auth/changeEmail", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },
  changeUsername(username: string) {
    return apiRequest<string>("/auth/changeUsername", {
      method: "POST",
      body: JSON.stringify({ username }),
    });
  },
  changePassword(oldPassword: string, newPassword: string) {
    return apiRequest<string>("/auth/changePassword", {
      method: "POST",
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  },
};

export const adminAuthApi = {
  assignRole(payload: RolePayload) {
    return apiRequest<string>("/auth/admin/assign/role", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  revokeRole(payload: RolePayload) {
    return apiRequest<string>("/auth/admin/revoke/role", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

export const textApi = {
  listActive(languageCode = "en", page = 0, size = 20) {
    return apiRequest<SliceResponse<UserAudioTextListItemResponse>>(
      `/sofv/texts${query({ languageCode, page, size })}`,
    );
  },
  details(id: number) {
    return apiRequest<UserAudioTextDetailsResponse>(`/sofv/texts/${id}`);
  },
};

export const audioApi = {
  submitAudio(audioTextId: number, file: File) {
    const formData = new FormData();
    formData.append("file", file);

    return apiRequest<AudioSubmissionResponse>(`/sofv/audio/${audioTextId}`, {
      method: "POST",
      body: formData,
    });
  },
  mySubmissions(page = 0, size = 20) {
    return apiRequest<SliceResponse<AudioSubmissionResponse>>(
      `/sofv/audio/my${query({ page, size })}`,
    );
  },
};

export const reviewerApi = {
  available(page = 0, size = 20) {
    return apiRequest<SliceResponse<AudioSubmissionResponse>>(
      `/sofv/reviewer/audio/available${query({ page, size })}`,
    );
  },
  assigned(page = 0, size = 20) {
    return apiRequest<SliceResponse<AudioSubmissionResponse>>(
      `/sofv/reviewer/audio/my${query({ page, size })}`,
    );
  },
  details(id: number) {
    return apiRequest<ReviewerAudioSubmissionDetailsResponse>(
      `/sofv/reviewer/audio/${id}`,
    );
  },
  claim(id: number) {
    return apiRequest<AudioSubmissionResponse>(
      `/sofv/reviewer/audio/${id}/claim`,
      { method: "PATCH" },
    );
  },
  approve(id: number) {
    return apiRequest<AudioSubmissionResponse>(
      `/sofv/reviewer/audio/${id}/approve`,
      { method: "PATCH" },
    );
  },
  reject(id: number) {
    return apiRequest<AudioSubmissionResponse>(
      `/sofv/reviewer/audio/${id}/reject`,
      { method: "PATCH" },
    );
  },
  file(id: number) {
    return apiBlob(`/sofv/reviewer/audio/${id}/file`);
  },
};

export const adminTextApi = {
  generate(payload: GenerateWikipediaTextsRequest) {
    return apiRequest<GenerateWikipediaTextsResponse>(
      "/sofv/admin/texts/generate",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },
  batches(page = 0, size = 20) {
    return apiRequest<SliceResponse<AdminAudioTextBatchListItemResponse>>(
      `/sofv/admin/textBatches${query({ page, size })}`,
    );
  },
  batchDetails(id: number) {
    return apiRequest<AdminAudioTextBatchDetailsResponse>(
      `/sofv/admin/textBatches/${id}`,
    );
  },
  texts(status?: AudioTextStatus | "", page = 0, size = 20) {
    return apiRequest<SliceResponse<AdminAudioTextListItemResponse>>(
      `/sofv/admin/text${query({ status, page, size })}`,
    );
  },
  textDetails(id: number) {
    return apiRequest<AdminAudioTextDetailsResponse>(`/sofv/admin/text/${id}`);
  },
  activate(id: number) {
    return apiRequest<AudioTextStatusResponse>(
      `/sofv/admin/texts/${id}/activate`,
      { method: "PATCH" },
    );
  },
  disable(id: number) {
    return apiRequest<AudioTextStatusResponse>(
      `/sofv/admin/texts/${id}/disable`,
      { method: "PATCH" },
    );
  },
  archive(id: number) {
    return apiRequest<AudioTextStatusResponse>(
      `/sofv/admin/texts/${id}/archive`,
      { method: "PATCH" },
    );
  },
};

export const walletApi = {
  me() {
    return apiRequest<WalletResponse>("/payments/wallet/me");
  },
  transactions(page = 0, size = 20) {
    return apiRequest<SliceResponse<WalletTransactionResponse>>(
      `/payments/wallet/me/transactions${query({ page, size })}`,
    );
  },
};
