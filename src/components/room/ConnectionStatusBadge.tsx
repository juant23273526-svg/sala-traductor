import { Loader2, Wifi, WifiOff } from 'lucide-react';
import clsx from 'clsx';
import type { ConnectionState } from '@/types/room';

const BADGE = {
  connecting: { label: 'Conectando...', icon: Loader2, className: 'text-amber-400', spin: true },
  connected: { label: 'Conectado', icon: Wifi, className: 'text-emerald-400', spin: false },
  disconnected: { label: 'Desconectado', icon: WifiOff, className: 'text-slate-500', spin: false },
  error: { label: 'Error de conexion', icon: WifiOff, className: 'text-rose-400', spin: false },
} as const;

export function ConnectionStatusBadge({ state }: { state: ConnectionState }) {
  const badge = BADGE[state];
  const Icon = badge.icon;
  return (
    <div className={clsx('flex items-center gap-1.5 text-xs font-medium', badge.className)}>
      <Icon size={14} className={badge.spin ? 'animate-spin' : ''} />
      {badge.label}
    </div>
  );
}
