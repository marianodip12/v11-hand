import type { ShooterSummary } from '@/domain/analysis';
import { cn } from '@/lib/cn';

export interface PlayersPanelProps {
  shooters: ShooterSummary[];
  selectedKey: string | null;
  homeColor: string;
  awayColor: string;
  onToggle: (key: string) => void;
}

/**
 * Jersey-grid of shooters. Tap a jersey to add/remove it as a filter.
 * Shows each player's shots, goals, and %.
 */
export const PlayersPanel = ({
  shooters,
  selectedKey,
  homeColor,
  awayColor,
  onToggle,
}: PlayersPanelProps) => {
  if (shooters.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-surface-2/30 py-6 text-center">
        <p className="text-xs text-muted-fg">
          No hay tiradores identificados en este filtro
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
      {shooters.map((s) => {
        const active = selectedKey === s.key;
        const teamColor = s.team === 'home' ? homeColor : awayColor;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onToggle(s.key)}
            className={cn(
              'flex flex-col items-center gap-1 p-1.5 rounded-md border touch-target',
              'transition-colors duration-fast active:scale-[0.97]',
              active
                ? 'border-fg bg-surface-2 ring-1 ring-fg/20'
                : 'border-border bg-surface-2/60 hover:border-border hover:bg-surface-2',
            )}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-mono text-sm font-bold tabular text-white"
              style={{ background: teamColor, opacity: active ? 1 : 0.85 }}
            >
              {s.number}
            </div>
            <div className="text-[10px] text-fg truncate w-full text-center leading-tight">
              {s.name.split(' ')[0]}
            </div>
            <div className="flex items-center gap-1 text-[9px] font-mono tabular">
              <span className="text-goal">{s.goals}g</span>
              <span className="text-muted-fg">·</span>
              <span className="text-muted-fg">{s.pct}%</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};
