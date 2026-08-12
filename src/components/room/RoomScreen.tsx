import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Users } from 'lucide-react';
import { useRoomConnection } from '@/hooks/useRoomConnection';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { callTranslateApi, base64ToBlob } from '@/services/translateApi';
import { unlockAudioPlayback } from '@/utils/audioUnlock';
import { detectDefaultLanguage } from '@/constants/languages';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { LanguageSelector } from './LanguageSelector';
import { WaveformVisualizer } from './WaveformVisualizer';
import { ConversationHistory } from './ConversationHistory';
import { MicButton } from './MicButton';
import type { MicMode, RoomRole, TranslationPayload } from '@/types/room';

interface RoomScreenProps {
  roomCode: string;
  role: RoomRole;
  onLeave: () => void;
}

export function RoomScreen({ roomCode, role, onLeave }: RoomScreenProps) {
  const [ownLanguage, setOwnLanguage] = useState(detectDefaultLanguage);
  const [peerLanguage, setPeerLanguage] = useState(() => (detectDefaultLanguage() === 'en' ? 'es' : 'en'));
  const [micMode, setMicMode] = useState<MicMode>('push-to-talk');
  const [isTranslating, setIsTranslating] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  const { state, participants, entries, sendMessage } = useRoomConnection({ roomCode, role, language: ownLanguage });
  const { start, stop, isCapturing, volume, error } = useAudioCapture();

  const handleRelease = useCallback(async () => {
    const blob = await stop();
    if (!blob) return;

    setPipelineError(null);
    setIsTranslating(true);
    try {
      const result = await callTranslateApi({ audioBlob: blob, sourceLanguage: ownLanguage, targetLanguage: peerLanguage });
      const translation: TranslationPayload = {
        id: crypto.randomUUID(),
        speaker: role === 'host' ? 'A' : 'B',
        originalText: result.transcript,
        translatedText: result.translatedText,
        originalLanguage: result.detectedLanguage || ownLanguage,
        translatedLanguage: peerLanguage,
        audioBase64: result.audioBase64,
        mimeType: result.mimeType,
        createdAt: new Date().toISOString(),
      };
      // sendMessage refleja la entrada localmente (para verla y escucharla
      // via el efecto de reproduccion mas abajo) y la envia por el
      // WebSocket para que el otro participante la reciba.
      sendMessage({ type: 'translation', payload: translation });
    } catch (err) {
      setPipelineError(err instanceof Error ? err.message : 'Error al traducir el audio');
    } finally {
      setIsTranslating(false);
    }
  }, [stop, ownLanguage, peerLanguage, role, sendMessage]);

  const handleToggleHandsFree = useCallback(() => {
    if (isCapturing) {
      void handleRelease();
    } else {
      unlockAudioPlayback();
      void start();
    }
  }, [isCapturing, handleRelease, start]);

  // Reproduce automaticamente el audio de cada mensaje `translation` nuevo,
  // tanto el propio (reflejado localmente por sendMessage) como el recibido
  // del interlocutor por WebSocket — un unico efecto cubre ambos casos.
  const playedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const last = entries[entries.length - 1];
    if (!last || last.type !== 'translation' || !last.payload.audioBase64) return;
    if (playedIdsRef.current.has(last.payload.id)) return;
    playedIdsRef.current.add(last.payload.id);

    const blob = base64ToBlob(last.payload.audioBase64, last.payload.mimeType ?? 'audio/mpeg');
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
    audio.play().catch((err) => console.error('[RoomScreen] No se pudo reproducir el audio traducido:', err));
  }, [entries]);

  const peerRole: RoomRole = role === 'host' ? 'guest' : 'host';
  const peerConnected = useMemo(() => participants.some((p) => p.role === peerRole), [participants, peerRole]);

  return (
    <div className="mx-auto flex h-dvh max-w-lg flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={onLeave}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft size={16} />
          Salir
        </button>
        <ConnectionStatusBadge state={state} />
      </header>

      <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Codigo de sala</p>
          <p className="text-2xl font-bold tracking-[0.3em] text-slate-50">{roomCode}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Users size={14} />
          {peerConnected ? 'Interlocutor conectado' : 'Esperando interlocutor...'}
        </div>
      </div>

      <div className="flex gap-3">
        <LanguageSelector label="Mi idioma" value={ownLanguage} onChange={setOwnLanguage} />
        <LanguageSelector label="Idioma del interlocutor" value={peerLanguage} onChange={setPeerLanguage} />
      </div>

      <ConversationHistory entries={entries} />

      <div className="flex flex-col items-center gap-3 border-t border-slate-800 pt-4">
        <WaveformVisualizer volume={volume} active={isCapturing} barColor={role === 'host' ? '#22d3ee' : '#10b981'} />

        {error && <p className="text-xs text-rose-400">{error}</p>}
        {isTranslating && <p className="text-xs text-brand-cyan">Traduciendo...</p>}
        {pipelineError && <p className="text-xs text-rose-400">{pipelineError}</p>}

        <MicButton
          mode={micMode}
          onModeChange={setMicMode}
          isCapturing={isCapturing}
          onPressStart={() => {
            unlockAudioPlayback();
            void start();
          }}
          onPressEnd={() => void handleRelease()}
          onToggle={handleToggleHandsFree}
        />
      </div>
    </div>
  );
}
