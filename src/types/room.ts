export type RoomRole = 'host' | 'guest';
export type Speaker = 'A' | 'B';
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';
export type MicMode = 'push-to-talk' | 'hands-free';

export interface JoinPayload {
  roomCode: string;
  role: RoomRole;
  language: string;
}

export interface TextDeltaPayload {
  speaker: Speaker;
  text: string;
  final: boolean;
}

export interface TranslationPayload {
  id: string;
  speaker: Speaker;
  originalText: string;
  translatedText: string;
  originalLanguage: string;
  translatedLanguage: string;
  /** Audio TTS en base64, relayado tal cual por el Durable Object hacia el otro participante. */
  audioBase64: string | null;
  mimeType: string | null;
  createdAt: string;
}

export interface Participant {
  role: RoomRole;
  language: string;
}

export interface PresencePayload {
  participants: Participant[];
}

/**
 * Protocolo de mensajeria de la Live Room. El Durable Object retransmite
 * `text_delta`/`translation` tal cual entre participantes — la traduccion
 * en si ocurre fuera del WebSocket, via HTTP POST a VITE_API_TRANSLATE_URL
 * (ver src/services/translateApi.ts), y su resultado se reenvia por aqui.
 */
export type RoomMessage =
  | { type: 'join'; payload: JoinPayload }
  | { type: 'text_delta'; payload: TextDeltaPayload }
  | { type: 'translation'; payload: TranslationPayload }
  | { type: 'presence'; payload: PresencePayload };

/** Entradas mostradas en el historial de conversacion (excluye join/presence). */
export type ConversationEntry =
  | { type: 'text_delta'; payload: TextDeltaPayload }
  | { type: 'translation'; payload: TranslationPayload };
