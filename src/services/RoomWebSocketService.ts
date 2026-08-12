import type { ConnectionState, RoomMessage, RoomRole } from '@/types/room';

export interface RoomWebSocketConfig {
  roomCode: string;
  role: RoomRole;
  language: string;
  /** Override para pruebas/desarrollo local; por defecto se deriva de VITE_ROOM_WORKER_URL o del host actual. */
  wsUrl?: string;
}

type MessageListener = (message: RoomMessage) => void;
type StateListener = (state: ConnectionState) => void;

const BASE_RECONNECT_DELAY_MS = 500;
const MAX_RECONNECT_DELAY_MS = 10_000;
const MAX_RECONNECT_ATTEMPTS = 8;

/**
 * Cliente WebSocket de una Live Room: conecta al Worker de Cloudflare que
 * hospeda el Durable Object de la sala, con reconexion automatica
 * (backoff exponencial) y notificacion de estado/mensajes via suscripcion.
 * No procesa audio ni traduce — es transporte puro, el mismo contrato que
 * consume el Durable Object en `worker/src/index.ts`.
 */
export class RoomWebSocketService {
  private socket: WebSocket | null = null;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manuallyClosed = false;

  private readonly messageListeners = new Set<MessageListener>();
  private readonly stateListeners = new Set<StateListener>();

  constructor(private readonly config: RoomWebSocketConfig) {}

  connect(): void {
    this.manuallyClosed = false;
    this.reconnectAttempts = 0;
    this.open();
  }

  disconnect(): void {
    this.manuallyClosed = true;
    this.clearReconnectTimer();
    this.socket?.close(1000, 'client_disconnect');
    this.socket = null;
    this.setState('disconnected');
  }

  send(message: RoomMessage): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      console.warn('[RoomWS] Intento de enviar con socket no abierto, se descarta:', message.type);
      return;
    }
    this.socket.send(JSON.stringify(message));
  }

  onMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onStateChange(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  getState(): ConnectionState {
    return this.state;
  }

  private open(): void {
    const url = this.buildUrl();
    this.setState('connecting');

    const socket = new WebSocket(url);
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectAttempts = 0;
      this.setState('connected');
      this.send({
        type: 'join',
        payload: { roomCode: this.config.roomCode, role: this.config.role, language: this.config.language },
      });
    };

    socket.onmessage = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return;
      try {
        const parsed = JSON.parse(event.data) as RoomMessage;
        this.messageListeners.forEach((listener) => listener(parsed));
      } catch (err) {
        console.error('[RoomWS] Mensaje invalido recibido, se ignora:', err);
      }
    };

    socket.onerror = (event) => {
      console.error('[RoomWS] Error de WebSocket:', event);
      this.setState('error');
    };

    socket.onclose = (event) => {
      this.socket = null;
      if (this.manuallyClosed) {
        this.setState('disconnected');
        return;
      }
      console.warn('[RoomWS] Conexion cerrada inesperadamente (code=', event.code, '), reintentando...');
      this.setState('disconnected');
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[RoomWS] Se alcanzo el maximo de reintentos de reconexion');
      this.setState('error');
      return;
    }
    const delay = Math.min(BASE_RECONNECT_DELAY_MS * 2 ** this.reconnectAttempts, MAX_RECONNECT_DELAY_MS);
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => this.open(), delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private setState(state: ConnectionState): void {
    if (this.state === state) return;
    this.state = state;
    this.stateListeners.forEach((listener) => listener(state));
  }

  private buildUrl(): string {
    const { roomCode, role, language, wsUrl } = this.config;

    if (wsUrl) {
      const url = new URL(wsUrl);
      url.searchParams.set('role', role);
      url.searchParams.set('lang', language);
      return url.toString();
    }

    const workerBase = import.meta.env.VITE_ROOM_WORKER_URL;
    const origin = workerBase
      ? workerBase.replace(/^http/, 'ws')
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

    const url = new URL(`/room/${roomCode}`, origin);
    url.searchParams.set('role', role);
    url.searchParams.set('lang', language);
    return url.toString();
  }
}
