# Sala Traductor — Live Room

PWA ultra-ligera (React + TypeScript + Vite) para salas de traduccion en
vivo multiusuario, con transporte por WebSockets sobre un Durable Object
de Cloudflare. Proyecto totalmente independiente — sin FFmpeg ni paquetes
de video.

## Estructura

```
src/
  services/RoomWebSocketService.ts   # cliente WS: reconexion automatica, estados, protocolo JSON
  hooks/useRoomConnection.ts         # envuelve el servicio en estado de React
  hooks/useAudioCapture.ts           # microfono: volumen en vivo + chunks PCM16/base64
  components/home/                   # Crear Sala / Unirse a Sala
  components/room/                   # Sala activa: waveform, historial, selectores, mic
worker/                              # Durable Object (Cloudflare Worker separado)
```

## Protocolo WebSocket

```ts
{ type: "join" | "audio_chunk" | "text_delta" | "translation" | "presence", payload: ... }
```

El Durable Object (`worker/src/index.ts`) es un **relay puro**: retransmite
`audio_chunk`/`text_delta`/`translation` entre participantes sin
transcribir ni traducir nada. Ese es el punto de integracion para un
pipeline externo de STT/MT/TTS (fuera del alcance de este proyecto).

## Desarrollo

```bash
npm install
npm run dev        # frontend en http://localhost:5175

cd worker
npm install
npm run dev         # worker local con wrangler
```

Por defecto el cliente se conecta a `wss://<host actual>/room/:codigo`.
Para apuntar al worker desplegado por separado, define en `.env.local`:

```
VITE_ROOM_WORKER_URL=https://sala-traductor-room-worker.<subdominio>.workers.dev
```

## Build

```bash
npm run build   # tsc -b && vite build
```
