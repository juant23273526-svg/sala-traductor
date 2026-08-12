import clsx from 'clsx';
import { getLanguage } from '@/constants/languages';
import type { ConversationEntry } from '@/types/room';

const SPEAKER_STYLE = {
  A: { align: 'items-start', bubble: 'bg-brand-cyan-strong/20 border-brand-cyan/40', label: 'text-brand-cyan' },
  B: { align: 'items-end', bubble: 'bg-emerald-500/15 border-emerald-500/40', label: 'text-emerald-400' },
} as const;

export function MessageBubble({ entry }: { entry: ConversationEntry }) {
  const speaker = entry.payload.speaker;
  const style = SPEAKER_STYLE[speaker];

  return (
    <div className={clsx('flex w-full flex-col gap-1', style.align)}>
      <span className={clsx('text-[11px] font-semibold uppercase tracking-wide', style.label)}>
        Hablante {speaker}
      </span>

      {entry.type === 'text_delta' ? (
        <div className={clsx('max-w-[85%] rounded-2xl border px-4 py-2.5 text-sm text-slate-300', style.bubble)}>
          <span>{entry.payload.text}</span>
          {!entry.payload.final && (
            <span className="ml-1.5 inline-flex gap-0.5 align-middle">
              <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 animate-typing-dot rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
            </span>
          )}
        </div>
      ) : (
        <div className={clsx('max-w-[85%] rounded-2xl border px-4 py-2.5', style.bubble)}>
          <p className="text-[11px] text-slate-500">
            {getLanguage(entry.payload.originalLanguage).flag} {entry.payload.originalText}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-100">
            {getLanguage(entry.payload.translatedLanguage).flag} {entry.payload.translatedText}
          </p>
        </div>
      )}
    </div>
  );
}
