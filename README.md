# Sala Traductor — Live Room

PWA ultra-ligera (React + TypeScript + Vite) para salas de traduccion en
vivo multiusuario, con transporte por WebSockets sobre un Durable Object
de Cloudflare. Proyecto totalmente independiente — sin FFmpeg ni paquetes
de video.

## Estructura

```
src/
  services/RoomWebSocketService.ts   # cliente WS: reconexion automatica, estados, protocolo JSON
  services/translateApi.ts           # cliente HTTP del motor de traduccion (STT+MT+TTS)
  hooks/useRoomConnection.ts         # envuelve el WS en estado de React
  hooks/useAudioCapture.ts           # microfono: volumen en vivo + Blob grabado por intervencion
  components/home/                   # Crear Sala / Unirse a Sala
  components/room/                   # Sala activa: waveform, historial, selectores, mic
worker/                              # Durable Object (Cloudflare Worker separado)
```

## Pipeline de audio y traduccion

1. Al soltar el microfono, `useAudioCapture` resuelve el `Blob` grabado.
2. `callTranslateApi` lo envia por HTTP POST a `VITE_API_TRANSLATE_URL`
   (`FormData` con `audio` + `meta`) y recibe `{ transcript, detectedLanguage,
   translatedText, audioBase64, mimeType }`.
3. `RoomScreen` arma un mensaje `translation` con ese resultado y lo pasa a
   `sendMessage`, que lo refleja localmente (para que el hablante lo vea/oiga
   de inmediato) y lo envia por `RoomWebSocketService`.
4. El Durable Object (`worker/src/index.ts`) retransmite el mensaje al otro
   participante, que lo recibe por WebSocket.
5. En ambos lados, un mismo efecto en `RoomScreen` reproduce el audio de
   cada `translation` nueva que aparece en el historial — cubre tanto el
   eco local del emisor como la recepcion del interlocutor.

El Durable Object en si es un **relay puro**: no transcribe ni traduce,
solo retransmite `text_delta`/`translation` entre participantes.

## Variables de entorno

```
VITE_WS_WORKER_URL=https://sala-traductor-room-worker.<subdominio>.workers.dev
VITE_API_TRANSLATE_URL=https://tu-motor-de-traduccion.example.com/api/translate
```

Copia `.env.example` a `.env.local` y ajusta los valores. Si
`VITE_WS_WORKER_URL` se omite, el cliente usa `wss://<host actual>/room/:codigo`.

## Desarrollo

```bash
npm install
npm run dev        # frontend en http://localhost:5175

cd worker
npm install
npm run dev         # worker local con wrangler
```

## Build

```bash
npm run build   # tsc -b && vite build
```
