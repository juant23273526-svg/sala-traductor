// Worker independiente que hospeda el Durable Object de las Live Rooms.
// Se despliega aparte del frontend (Vite/PWA) con `wrangler deploy`; el
// cliente (src/services/RoomWebSocketService.ts) se conecta a su URL
// publica via VITE_ROOM_WORKER_URL.
export interface Env {
  ROOMS: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/room\/([A-Za-z0-9]{4,12})$/);

    if (!match) {
      return new Response('sala-traductor room-worker: usa /room/:codigo', { status: 404 });
    }
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Se espera una conexion WebSocket (header Upgrade: websocket)', { status: 426 });
    }

    const roomCode = match[1].toUpperCase();
    const id = env.ROOMS.idFromName(roomCode);
    const stub = env.ROOMS.get(id);
    return stub.fetch(request);
  },
};

interface Session {
  role: 'host' | 'guest';
  language: string;
}

type IncomingMessage =
  | { type: 'join'; payload: { roomCode?: unknown; role?: unknown; language: string } }
  | { type: 'audio_chunk' | 'text_delta' | 'translation'; payload: unknown };

const KNOWN_TYPES = new Set(['join', 'audio_chunk', 'text_delta', 'translation']);

function parseIncoming(data: string): IncomingMessage | null {
  let value: unknown;
  try {
    value = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;

  const msg = value as { type?: unknown; payload?: unknown };
  if (typeof msg.type !== 'string' || !KNOWN_TYPES.has(msg.type) || msg.payload === undefined) return null;

  if (msg.type === 'join') {
    const payload = msg.payload as { language?: unknown };
    if (typeof payload.language !== 'string') return null;
  }

  return value as IncomingMessage;
}

/**
 * Estado en memoria de una Live Room: mantiene las conexiones WebSocket de
 * los participantes y retransmite (relay) los mensajes entre ellos. Es un
 * relay puro — no transcribe ni traduce; `audio_chunk`/`text_delta`/
 * `translation` se reenvian tal cual para que un pipeline externo (STT/MT/
 * TTS) los consuma. Cuando todas las conexiones se cierran, la instancia
 * queda vacia y Cloudflare la recicla: cero persistencia, cero registros.
 */
export class TranslationRoom implements DurableObject {
  private sessions = new Map<WebSocket, Session>();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const role: Session['role'] = url.searchParams.get('role') === 'host' ? 'host' : 'guest';
    const language = url.searchParams.get('lang') ?? 'es';

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket];

    this.handleSession(server, role, language);

    return new Response(null, { status: 101, webSocket: client });
  }

  private handleSession(ws: WebSocket, role: Session['role'], language: string): void {
    ws.accept();
    this.sessions.set(ws, { role, language });
    this.broadcastPresence();

    ws.addEventListener('message', (event: MessageEvent) => {
      if (typeof event.data !== 'string') {
        console.error('[TranslationRoom] Frame no textual recibido, se ignora:', typeof event.data);
        return;
      }
      this.handleMessage(event.data, ws);
    });

    const cleanup = () => {
      this.sessions.delete(ws);
      this.broadcastPresence();
    };
    ws.addEventListener('close', cleanup);
    ws.addEventListener('error', cleanup);
  }

  private handleMessage(data: string, sender: WebSocket): void {
    const message = parseIncoming(data);
    if (!message) {
      console.error('[TranslationRoom] Payload invalido, se descarta sin relayar:', data.slice(0, 200));
      return;
    }

    if (message.type === 'join') {
      const session = this.sessions.get(sender);
      if (session) {
        session.language = message.payload.language;
      }
      this.broadcastPresence();
      return;
    }

    // audio_chunk / text_delta / translation: se retransmiten tal cual a
    // los demas participantes de la sala.
    this.relay(data, sender);
  }

  private relay(data: string, sender: WebSocket): void {
    for (const ws of this.sessions.keys()) {
      if (ws === sender) continue;
      this.safeSend(ws, data);
    }
  }

  private broadcastPresence(): void {
    const participants = Array.from(this.sessions.values()).map((s) => ({ role: s.role, language: s.language }));
    const payload = JSON.stringify({ type: 'presence', payload: { participants } });
    for (const ws of this.sessions.keys()) {
      this.safeSend(ws, payload);
    }
  }

  private safeSend(ws: WebSocket, data: string): void {
    try {
      ws.send(data);
    } catch {
      this.sessions.delete(ws);
    }
  }
}
