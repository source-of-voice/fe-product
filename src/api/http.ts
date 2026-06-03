import { API_BASE_URL } from "./config";
import {
  clearTokens,
  getAccessToken,
  getCurrentUser,
  getRefreshToken,
  saveTokens,
} from "../auth/token";
import type { AuthTokens } from "../types/domain";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export interface RequestOptions extends RequestInit {
  authenticated?: boolean;
  retryOnUnauthorized?: boolean;
}

async function parseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (response.status === 204) return null;
  if (contentType.includes("application/json")) return response.json();
  const text = await response.text();
  return text || null;
}

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearTokens();
    return false;
  }

  const tokens = (await response.json()) as AuthTokens;
  saveTokens(tokens);
  return true;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    authenticated = true,
    retryOnUnauthorized = true,
    headers,
    ...init
  } = options;
  const requestHeaders = new Headers(headers);

  if (!(init.body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (authenticated) {
    const token = getAccessToken();
    if (token) requestHeaders.set("Authorization", `Bearer ${token}`);

    const currentUser = getCurrentUser();
    if (currentUser.userId !== null && !requestHeaders.has("X-User-Id")) {
      requestHeaders.set("X-User-Id", String(currentUser.userId));
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: requestHeaders,
  });

  if (response.status === 401 && authenticated && retryOnUnauthorized) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, retryOnUnauthorized: false });
    }
  }

  const body = await parseBody(response);

  if (!response.ok) {
    const message =
      typeof body === "string"
        ? body
        : `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, body);
  }

  return body as T;
}

export async function apiBlob(path: string): Promise<Blob> {
  const token = getAccessToken();
  const currentUser = getCurrentUser();
  const headers = new Headers();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (currentUser.userId !== null)
    headers.set("X-User-Id", String(currentUser.userId));

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `Request failed with status ${response.status}`,
    );
  }

  return response.blob();
}

export async function tryGet<T>(
  paths: string[],
): Promise<{ data: T | null; path?: string; error?: unknown }> {
  let lastError: unknown;
  for (const path of paths) {
    try {
      const data = await apiRequest<T>(path);
      return { data, path };
    } catch (error) {
      lastError = error;
    }
  }
  return { data: null, error: lastError };
}
