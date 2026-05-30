export type View = 'dashboard' | 'audio' | 'reviewer' | 'wallet' | 'adminTexts' | 'adminUsers' | 'profile';

export type Notice = { kind: 'success' | 'error'; message: string } | null;

export type NavigateTo = (view: View) => void;
