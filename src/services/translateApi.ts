export interface TranslateApiResult {
  transcript: string;
  detectedLanguage: string;
  translatedText: string;
  /** Audio TTS ya sintetizado en el idioma destino, codificado en base64. */
  audioBase64: string;
  mimeType: string;
}

export interface TranslateApiParams {
  audioBlob: Blob;
  sourceLanguage: string;
  targetLanguage: string;
}

/** Deriva una extension de archivo a partir del MIME type real del blob (iOS graba en audio/mp4, no webm). */
function extensionForMimeType(mimeType: string): string {
  const [base] = mimeType.split(';');
  const map: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
  };
  return map[base] ?? 'webm';
}

/**
 * Cliente HTTP del motor de traduccion (VITE_API_TRANSLATE_URL): recibe el
 * audio grabado y devuelve transcripcion + traduccion + audio TTS en una
 * sola respuesta. No forma parte del WebSocket de la sala — su resultado
 * se reenvia despues por RoomWebSocketService como mensaje `translation`.
 */
export async function callTranslateApi({ audioBlob, sourceLanguage, targetLanguage }: TranslateApiParams): Promise<TranslateApiResult> {
  const endpoint = import.meta.env.VITE_API_TRANSLATE_URL;
  if (!endpoint) {
    throw new Error('VITE_API_TRANSLATE_URL no esta configurada');
  }

  const form = new FormData();
  form.append('audio', audioBlob, `audio.${extensionForMimeType(audioBlob.type)}`);
  form.append('meta', JSON.stringify({ sourceLanguage, targetLanguage }));

  let response: Response;
  try {
    response = await fetch(endpoint, { method: 'POST', body: form });
  } catch (err) {
    console.error('[translateApi] Fallo de red llamando a', endpoint, err);
    throw err instanceof Error ? err : new Error('Fallo de red llamando al motor de traduccion');
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message = (errorBody as { error?: string } | null)?.error ?? `El motor de traduccion respondio ${response.status}`;
    console.error('[translateApi] Respuesta no ok:', response.status, message);
    throw new Error(message);
  }

  return (await response.json()) as TranslateApiResult;
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  if (!base64) return new Blob([], { type: mimeType });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}
