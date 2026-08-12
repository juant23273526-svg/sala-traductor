import { useCallback, useEffect, useRef, useState } from 'react';
import { encodePCM16ToBase64, mergeFloat32Arrays } from '@/utils/audioEncoding';

export interface AudioChunkEvent {
  seq: number;
  data: string;
  sampleRate: number;
}

export interface UseAudioCaptureOptions {
  onChunk?: (chunk: AudioChunkEvent) => void;
  chunkIntervalMs?: number;
}

/**
 * Captura microfono via Web Audio API: expone volumen en vivo (para el
 * WaveformVisualizer) y trocea el audio capturado en chunks PCM16/base64
 * a intervalos regulares (para el mensaje `audio_chunk` del WS). No hace
 * transcripcion ni traduccion — solo transporte de audio crudo.
 */
export function useAudioCapture({ onChunk, chunkIntervalMs = 250 }: UseAudioCaptureOptions = {}) {
  const [volume, setVolume] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const frameRef = useRef(0);
  const seqRef = useRef(0);
  const pcmBufferRef = useRef<Float32Array[]>([]);
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onChunkRef = useRef(onChunk);
  onChunkRef.current = onChunk;

  const stop = useCallback(() => {
    if (chunkTimerRef.current !== null) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    if (frameRef.current !== 0) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }
    processorRef.current?.disconnect();
    processorRef.current = null;
    analyserRef.current?.disconnect();
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    pcmBufferRef.current = [];
    seqRef.current = 0;
    setVolume(0);
    setIsCapturing(false);
  }, []);

  const start = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      // ScriptProcessorNode necesita estar conectado a un destino para
      // disparar onaudioprocess en algunos navegadores; se enruta a traves
      // de una ganancia en 0 para no reproducir el propio microfono.
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      const silentGain = audioContext.createGain();
      silentGain.gain.value = 0;
      source.connect(processor);
      processor.connect(silentGain);
      silentGain.connect(audioContext.destination);

      processor.onaudioprocess = (event) => {
        pcmBufferRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      };

      const timeDomainData = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(timeDomainData);
        let sumSquares = 0;
        for (let i = 0; i < timeDomainData.length; i++) {
          const normalized = (timeDomainData[i] - 128) / 128;
          sumSquares += normalized * normalized;
        }
        const rms = Math.sqrt(sumSquares / timeDomainData.length);
        setVolume(Math.min(1, rms * 4));
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);

      chunkTimerRef.current = setInterval(() => {
        if (pcmBufferRef.current.length === 0) return;
        const merged = mergeFloat32Arrays(pcmBufferRef.current);
        pcmBufferRef.current = [];
        seqRef.current += 1;
        onChunkRef.current?.({
          seq: seqRef.current,
          data: encodePCM16ToBase64(merged),
          sampleRate: audioContext.sampleRate,
        });
      }, chunkIntervalMs);

      setIsCapturing(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo acceder al microfono');
      setIsCapturing(false);
    }
  }, [chunkIntervalMs]);

  useEffect(() => stop, [stop]);

  return { start, stop, isCapturing, volume, error };
}
