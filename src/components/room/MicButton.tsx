import { Mic, Radio } from 'lucide-react';
import clsx from 'clsx';
import type { MicMode } from '@/types/room';

interface MicButtonProps {
  mode: MicMode;
  onModeChange: (mode: MicMode) => void;
  isCapturing: boolean;
  onPressStart: () => void;
  onPressEnd: () => void;
  onToggle: () => void;
}

/** Boton grande de microfono: mantener presionado (push-to-talk) o alternar (manos libres). */
export function MicButton({ mode, onModeChange, isCapturing, onPressStart, onPressEnd, onToggle }: MicButtonProps) {
  const handlers =
    mode === 'push-to-talk'
      ? {
          onPointerDown: onPressStart,
          onPointerUp: onPressEnd,
          onPointerLeave: () => isCapturing && onPressEnd(),
        }
      : { onClick: onToggle };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/60 p-1 text-xs">
        <button
          type="button"
          onClick={() => onModeChange('push-to-talk')}
          className={clsx(
            'rounded-full px-3 py-1 font-medium transition-colors',
            mode === 'push-to-talk' ? 'bg-brand-cyan-strong text-white' : 'text-slate-400'
          )}
        >
          Mantener presionado
        </button>
        <button
          type="button"
          onClick={() => onModeChange('hands-free')}
          className={clsx(
            'rounded-full px-3 py-1 font-medium transition-colors',
            mode === 'hands-free' ? 'bg-brand-cyan-strong text-white' : 'text-slate-400'
          )}
        >
          Manos libres
        </button>
      </div>

      <button
        type="button"
        {...handlers}
        className="relative flex h-20 w-20 select-none items-center justify-center rounded-full shadow-lg outline-none transition-transform active:scale-95"
        style={{ touchAction: 'none' }}
      >
        {isCapturing && <span className="absolute inset-0 rounded-full bg-rose-500/60 animate-pulse-ring" />}
        <span
          className={clsx(
            'relative flex h-20 w-20 items-center justify-center rounded-full border-2 transition-colors',
            isCapturing ? 'border-rose-400 bg-rose-500 text-white' : 'border-brand-cyan bg-brand-cyan-strong text-white'
          )}
        >
          {mode === 'hands-free' && isCapturing ? <Radio size={30} /> : <Mic size={30} />}
        </span>
      </button>
      <p className="text-xs text-slate-500">
        {mode === 'push-to-talk' ? 'Manten presionado para hablar' : isCapturing ? 'Toca para detener' : 'Toca para hablar'}
      </p>
    </div>
  );
}
