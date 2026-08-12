import { useCallback, useEffect, useRef, useState } from 'react';
import { RoomWebSocketService } from '@/services/RoomWebSocketService';
import type { ConnectionState, ConversationEntry, Participant, RoomMessage, RoomRole } from '@/types/room';

export interface UseRoomConnectionConfig {
  roomCode: string;
  role: RoomRole;
  language: string;
}

export function useRoomConnection({ roomCode, role, language }: UseRoomConnectionConfig) {
  const [state, setState] = useState<ConnectionState>('connecting');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [entries, setEntries] = useState<ConversationEntry[]>([]);
  const serviceRef = useRef<RoomWebSocketService | null>(null);

  useEffect(() => {
    const service = new RoomWebSocketService({ roomCode, role, language });
    serviceRef.current = service;

    const offState = service.onStateChange(setState);
    const offMessage = service.onMessage((message) => {
      if (message.type === 'presence') {
        setParticipants(message.payload.participants);
      } else if (message.type === 'text_delta' || message.type === 'translation') {
        setEntries((prev) => [...prev, message]);
      }
    });

    service.connect();

    return () => {
      offState();
      offMessage();
      service.disconnect();
      serviceRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, role]);

  // El idioma propio puede cambiar dentro de la sala (selector en vivo): se
  // reenvia un `join` para actualizar la presencia sin reabrir el socket.
  useEffect(() => {
    serviceRef.current?.send({ type: 'join', payload: { roomCode, role, language } });
  }, [roomCode, role, language]);

  const sendMessage = useCallback((message: RoomMessage) => {
    // El Durable Object retransmite a los demas participantes pero no al
    // propio emisor: se refleja localmente aqui para que el hablante vea
    // (y, via el efecto de reproduccion en RoomScreen, escuche) su propio
    // mensaje sin esperar un round-trip por el WebSocket.
    if (message.type === 'text_delta' || message.type === 'translation') {
      setEntries((prev) => [...prev, message]);
    }
    serviceRef.current?.send(message);
  }, []);

  return { state, participants, entries, sendMessage };
}
