import { useState } from 'react';
import { Languages, Plus, LogIn } from 'lucide-react';
import { generateRoomCode, isValidRoomCode } from '@/utils/roomCode';
import type { RoomRole } from '@/types/room';

interface WelcomeScreenProps {
  onEnterRoom: (roomCode: string, role: RoomRole) => void;
}

export function WelcomeScreen({ onEnterRoom }: WelcomeScreenProps) {
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleCreateRoom = () => {
    onEnterRoom(generateRoomCode(), 'host');
  };

  const handleJoinRoom = () => {
    if (!isValidRoomCode(joinCode)) {
      setJoinError('Ingresa un codigo valido de 6 digitos');
      return;
    }
    setJoinError(null);
    onEnterRoom(joinCode, 'guest');
  };

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col items-center justify-center gap-10 px-6 py-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-cyan/40 bg-brand-cyan/10 text-brand-cyan">
          <Languages size={28} />
        </div>
        <h1 className="text-2xl font-bold text-slate-50">Sala Traductor</h1>
        <p className="text-sm text-slate-400">Traduccion en vivo, cara a cara, en tiempo real</p>
      </div>

      <div className="flex w-full flex-col gap-4">
        <button
          type="button"
          onClick={handleCreateRoom}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-cyan-strong px-5 py-3.5 text-sm font-semibold text-white shadow-lg transition-transform active:scale-[0.98]"
        >
          <Plus size={18} />
          Crear Sala
        </button>

        <div className="flex items-center gap-3 text-xs text-slate-600">
          <div className="h-px flex-1 bg-slate-800" />
          o
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
          <label className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Unirse a una sala
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={joinCode}
            onChange={(event) => {
              setJoinCode(event.target.value.replace(/\D/g, '').slice(0, 6));
              setJoinError(null);
            }}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-center text-lg font-semibold tracking-[0.4em] text-slate-100 outline-none focus:border-brand-cyan"
          />
          {joinError && <p className="text-xs text-rose-400">{joinError}</p>}
          <button
            type="button"
            onClick={handleJoinRoom}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-brand-cyan hover:text-brand-cyan"
          >
            <LogIn size={16} />
            Unirse a Sala
          </button>
        </div>
      </div>
    </div>
  );
}
