import { useT } from '@/lib/i18n';
import { EVENT_TYPES } from '@/domain/constants';
import type { HandballEvent } from '@/domain/types';
import { cn } from '@/lib/cn';

export interface EventTimelineProps {
  events: HandballEvent[];
  homeColor: string;
  awayColor: string;
  onDelete: (id: string) => void;
}

export const EventTimeline = ({ events, homeColor, awayColor, onDelete }: EventTimelineProps) => {
  const t = useT();
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 text-center">
        <p className="text-xs text-muted-fg">{t.live_no_events}</p>
      </div>
    );
  }

  const sorted = [...events].sort((a, b) => b.min - a.min);

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg">
          {t.live_timeline_title}
        </span>
        <span className="text-[10px] text-muted-fg tabular">{events.length} total</span>
      </div>
      <ul className="max-h-[240px] overflow-y-auto divide-y divide-border">
        {sorted.map((e) => (
          <EventRow key={e.id} event={e} color={e.team === 'home' ? homeColor : awayColor} onDelete={() => onDelete(e.id)} />
        ))}
      </ul>
    </div>
  );
};

const EventRow = ({
  event,
  color,
  onDelete,
}: {
  event: HandballEvent;
  color: string;
  onDelete: () => void;
}) => {
  const meta = EVENT_TYPES[event.type];
  const toneClass =
    meta.tone === 'goal'      ? 'text-goal' :
    meta.tone === 'save'      ? 'text-save' :
    meta.tone === 'danger'    ? 'text-danger' :
    meta.tone === 'warning'   ? 'text-warning' :
    meta.tone === 'exclusion' ? 'text-exclusion' :
    meta.tone === 'card'      ? 'text-card' :
    meta.tone === 'primary'   ? 'text-primary' :
                                'text-fg';

  const person =
    event.shooter?.name ?? event.sanctioned?.name ?? null;

  return (
    <li className="flex items-center gap-2 px-3 py-2">
      <span className="font-mono text-[11px] tabular text-muted-fg w-7">
        {event.min}'
      </span>
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        <span className={cn('text-xs font-medium', toneClass)}>
          {meta.label}
        </span>
        {person && (
          <span className="text-[11px] text-muted-fg truncate">· {person}</span>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          if (window.confirm('¿Borrar este evento?')) onDelete();
        }}
        className="text-muted-fg hover:text-danger transition-colors p-1 -m-1"
        aria-label="Borrar evento"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </li>
  );
};
