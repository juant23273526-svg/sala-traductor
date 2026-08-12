import { useCallback, useMemo, useState } from 'react';
import { ArrowLeft, Users } from 'lucide-react';
import { useRoomConnection } from '@/hooks/useRoomConnection';
import { useAudioCapture } from '@/hooks/useAudioCapture';
import { detectDefaultLanguage } from '@/constants/languages';
import { ConnectionStatusBadge } from './ConnectionStatusBadge';
import { LanguageSelector } from './LanguageSelector';
import { WaveformVisualizer } from './WaveformVisualizer';
import { ConversationHistory } from './ConversationHistory';
import { MicButton } from './MicButton';
import type { MicMode, RoomRole } from '@/types/room';

interface RoomScreenProps {
  roomCode: string;
  role: RoomRole;
  onLeave: () => void;
}

export function RoomScreen({ roomCode, role, onLeave }: RoomScreenProps) {
  const [ownLanguage, setOwnLanguage] = useState(detectDefaultLanguage);
  const [peerLanguage, setPeerLanguage] = useState(() => (detectDefaultLanguage() === 'en' ? 'es' : 'en'));
  const [micMode, setMicMode] = useState<MicMode>('push-to-talk');

  const { state, participants, entries, sendMessage } = useRoomConnection({ roomCode, role, language: ownLanguage });

  const handleChunk = useCallback(
    (chunk: { seq: number; data: string; sampleRate: number }) => {
      sendMessage({ type: 'audio_chunk', payload: { ...chunk, final: false } });
    },
    [sendMessage]
  );

  const { start, stop, isCapturing, volume, error } = useAudioCapture({ onChunk: handleChunk });

  const handleStopCapture = useCallback(() => {
    stop();
    sendMessage({ type: 'audio_chunk', payload: { seq: 0, data: '', sampleRate: 0, final: true } });
  }, [stop, sendMessage]);

  const handleToggleHandsFree = useCallback(() => {
    if (isCapturing) {
      handleStopCapture();
    } else {
      void start();
    }
  }, [isCapturing, handleStopCapture, start]);

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

        <MicButton
          mode={micMode}
          onModeChange={setMicMode}
          isCapturing={isCapturing}
          onPressStart={() => void start()}
          onPressEnd={handleStopCapture}
          onToggle={handleToggleHandsFree}
        />
      </div>
    </div>
  );
}
