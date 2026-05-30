export {};

declare global {
  interface Window {
    __SOURCE_OF_VOICE_CONFIG__?: {
      API_BASE_URL?: string;
    };
  }
}
