import { useMemo } from 'react';
import { computeMatchStats } from '@/domain/stats';
import type { HandballEvent } from '@/domain/types';
import { cn } from '@/lib/cn';

export interface LiveStatsProps {
  events: HandballEvent[];
  homeColor: string;
  awayColor: string;
}

/**
 * Mini stats bar under the court: shows the numbers the v8 screen had visible.
 * Two columns (home / away) with key metrics.
 */
export const LiveStats = ({ events, homeColor, awayColor }: LiveStatsProps) => {
  const s = useMemo(() => computeMatchStats(events), [events]);

  const rows: Array<{ label: string; h: number | string; a: number | string; accent?: string }> = [
    { label: 'Goles',      h: s.homeGoals,   a: s.awayGoals,   accent: 'goal' },
    { label: 'Tiros',      h: s.homeShots,   a: s.awayShots                    },
    { label: 'Efectividad',h: `${s.homePct}%`, a: `${s.awayPct}%`               },
    { label: 'Atajadas rival', h: s.rivalGKSaved, a: s.homeGKSaved              },
    { label: 'Exclusiones',h: s.homeExcl,    a: s.awayExcl,    accent: 'exclusion' },
    { label: 'Pérdidas',   h: s.homeTurnover, a: s.awayTurnover                 },
  ];

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2 border-b border-border">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-fg">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: homeColor }} />
          <span>Local</span>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-muted-fg">Stats</span>
        <div className="flex items-center gap-1.5 justify-end text-[10px] font-semibold uppercase tracking-widest text-muted-fg">
          <span>Visitante</span>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: awayColor }} />
        </div>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-1.5">
            <span className={cn(
              'font-mono text-sm font-semibold tabular text-right',
              r.accent === 'goal' && 'text-goal',
              r.accent === 'exclusion' && 'text-exclusion',
            )}>
              {r.h}
            </span>
            <span className="text-[11px] text-muted-fg text-center px-2">{r.label}</span>
            <span className={cn(
              'font-mono text-sm font-semibold tabular text-left',
              r.accent === 'goal' && 'text-goal',
              r.accent === 'exclusion' && 'text-exclusion',
            )}>
              {r.a}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
