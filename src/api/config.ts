const runtimeApiBase = window.__SOURCE_OF_VOICE_CONFIG__?.API_BASE_URL;
const buildApiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;

const configuredApiBase = runtimeApiBase ?? buildApiBase ?? "";

export const API_BASE_URL = configuredApiBase.replace(/\/$/, "");
export const DISPLAY_API_BASE_URL =
  API_BASE_URL || "same-origin API Gateway proxy";
