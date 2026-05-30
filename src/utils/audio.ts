export const ALLOWED_AUDIO_TYPES = ['audio/wav', 'audio/mpeg', 'audio/aac', 'audio/ogg', 'audio/amr', 'audio/mp4', 'audio/flac'];
export const ALLOWED_AUDIO_EXTENSIONS = ['wav', 'mp3', 'mpeg', 'aac', 'ogg', 'oga', 'amr', 'm4a', 'mp4', 'flac'];
export const AUDIO_ACCEPT = ALLOWED_AUDIO_TYPES.join(',');
export const RECORDING_MIME_CANDIDATES = [
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/aac'
];

export function normalizeAudioType(type: string | undefined | null) {
  return (type ?? '').split(';')[0].trim().toLowerCase();
}

export function extensionForAudioType(type: string) {
  switch (normalizeAudioType(type)) {
    case 'audio/wav': return 'wav';
    case 'audio/mpeg': return 'mp3';
    case 'audio/aac': return 'aac';
    case 'audio/ogg': return 'ogg';
    case 'audio/amr': return 'amr';
    case 'audio/mp4': return 'm4a';
    case 'audio/flac': return 'flac';
    default: return 'audio';
  }
}

export function getFileExtension(fileName: string) {
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : '';
}

export function isAllowedAudioFile(file: File) {
  const normalizedType = normalizeAudioType(file.type);
  const extension = getFileExtension(file.name);
  return ALLOWED_AUDIO_TYPES.includes(normalizedType) || ALLOWED_AUDIO_EXTENSIONS.includes(extension);
}

export function pickRecordingMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  return RECORDING_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

export function downloadRecordedFile(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
