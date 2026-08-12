export type RoomRole = 'host' | 'guest';
export type Speaker = 'A' | 'B';
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';
export type MicMode = 'push-to-talk' | 'hands-free';

export interface JoinPayload {
  roomCode: string;
  role: RoomRole;
  language: string;
}

export interface AudioChunkPayload {
  seq: number;
  /** PCM16 mono, codificado en base64. */
  data: string;
  sampleRate: number;
  final: boolean;
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
 * Protocolo de mensajeria de la Live Room. `audio_chunk`/`text_delta`
 * son pensados para ser producidos/consumidos por un pipeline externo de
 * STT/MT/TTS (fuera del alcance de este cliente): el Durable Object solo
 * los retransmite, no los procesa.
 */
export type RoomMessage =
  | { type: 'join'; payload: JoinPayload }
  | { type: 'audio_chunk'; payload: AudioChunkPayload }
  | { type: 'text_delta'; payload: TextDeltaPayload }
  | { type: 'translation'; payload: TranslationPayload }
  | { type: 'presence'; payload: PresencePayload };

/** Entradas mostradas en el historial de conversacion (excluye join/presence). */
export type ConversationEntry =
  | { type: 'text_delta'; payload: TextDeltaPayload }
  | { type: 'translation'; payload: TranslationPayload };
