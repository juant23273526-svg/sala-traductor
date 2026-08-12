import { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import type { ConversationEntry } from '@/types/room';

export function ConversationHistory({ entries }: { entries: ConversationEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center text-slate-600">
        <MessageSquare size={28} />
        <p className="text-sm">La conversacion aparecera aqui en cuanto alguien hable</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto py-2">
      {entries.map((entry, index) => (
        <MessageBubble key={`${entry.type}-${index}`} entry={entry} />
      ))}
      <div ref={endRef} />
    </div>
  );
}
