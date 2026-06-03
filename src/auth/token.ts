import type { AuthTokens, JwtPayload, Role } from "../types/domain";

const ACCESS_TOKEN_KEY = "sov.accessToken";
const REFRESH_TOKEN_KEY = "sov.refreshToken";

export function saveTokens(tokens: AuthTokens) {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function readTokens(): AuthTokens | null {
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export function decodeJwt(token: string | null): JwtPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const json = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json))) as JwtPayload;
  } catch {
    try {
      return JSON.parse(atob(parts[1])) as JwtPayload;
    } catch {
      return null;
    }
  }
}

export function getCurrentUser() {
  const payload = decodeJwt(getAccessToken());
  const roles = (payload?.roles ?? []) as Role[];
  return {
    userId: payload?.sub ? Number(payload.sub) : null,
    roles,
    tokenVersion: payload?.ver ?? null,
    expiresAt: payload?.exp ? new Date(payload.exp * 1000) : null,
  };
}

export function hasRole(role: Role) {
  return getCurrentUser().roles.includes(role);
}
