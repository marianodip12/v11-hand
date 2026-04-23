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
 * Live stats block — sits under the scoreboard.
 *
 * Layout mirrors the v8 aesthetic the user liked:
 *   ┌──────────────────────────────────┐
 *   │   60% ─── EFECTIVIDAD ──── 50%   │
 *   │   ▓▓▓▓▓▓▓▓▓░░░░░░░ (bar)         │
 *   │                                  │
 *   │   3-2   5-4    2-1    1-0        │
 *   │  GOLES  TIROS  ATAJ.  EXCL.      │
 *   └──────────────────────────────────┘
 *
 * The bar visualizes goal conversion %: home fills from left, away from right,
 * with a thin gap in between. If both sides are 0%, bar is empty.
 */
export const LiveStats = ({ events, homeColor, awayColor }: LiveStatsProps) => {
  const s = useMemo(() => computeMatchStats(events), [events]);

  // Bar segment widths normalize to sum ≤ 100% so neither side overlaps.
  const homeEff = s.homePct;
  const awayEff = s.awayPct;
  const totalEff = homeEff + awayEff;
  const homeBar = totalEff === 0 ? 0 : (homeEff / totalEff) * 100;
  const awayBar = totalEff === 0 ? 0 : (awayEff / totalEff) * 100;

  const tiles = [
    { label: 'Goles',   h: s.homeGoals,    a: s.awayGoals,    accent: 'goal' as const },
    { label: 'Tiros',   h: s.homeShots,    a: s.awayShots,    accent: 'neutral' as const },
    { label: 'Atajadas',h: s.homeGKSaved,  a: s.rivalGKSaved, accent: 'save' as const },
    { label: 'Excl.',   h: s.homeExcl,     a: s.awayExcl,     accent: 'exclusion' as const },
  ];

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      {/* Effectiveness header — goal conversion rate */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="font-mono text-lg font-semibold tabular text-right text-fg">
          {homeEff}%
        </div>
        <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-fg px-2 text-center">
          Efectividad
        </div>
        <div className="font-mono text-lg font-semibold tabular text-left text-fg">
          {awayEff}%
        </div>
      </div>

      {/* Proportional bar */}
      <div className="mt-1.5 h-1 bg-surface-2 rounded-full overflow-hidden flex">
        <div
          className="h-full transition-all duration-300"
          style={{ width: `${homeBar}%`, background: homeColor }}
        />
        <div className="w-[2px] bg-surface" />
        <div
          className="h-full transition-all duration-300 ml-auto"
          style={{ width: `${awayBar}%`, background: awayColor }}
        />
      </div>

      {/* Metric tiles: one row per metric, side-by-side local vs visitor */}
      <div className="grid grid-cols-4 gap-1.5 mt-3">
        {tiles.map((t) => (
          <div
            key={t.label}
            className={cn(
              'flex flex-col items-center justify-center rounded-md bg-surface-2/60 py-2 px-1',
              t.accent === 'exclusion' && 'bg-exclusion/10',
            )}
          >
            <div className="flex items-baseline gap-1">
              <span className={cn(
                'font-mono text-base font-semibold tabular',
                t.accent === 'goal'      && 'text-goal',
                t.accent === 'save'      && 'text-save',
                t.accent === 'exclusion' && 'text-exclusion',
                t.accent === 'neutral'   && 'text-fg',
              )}>
                {t.h}
              </span>
              <span className="text-muted-fg text-xs">–</span>
              <span className={cn(
                'font-mono text-base font-semibold tabular',
                t.accent === 'goal'      && 'text-goal',
                t.accent === 'save'      && 'text-save',
                t.accent === 'exclusion' && 'text-exclusion',
                t.accent === 'neutral'   && 'text-fg',
              )}>
                {t.a}
              </span>
            </div>
            <span className={cn(
              'text-[8px] uppercase tracking-widest mt-0.5',
              t.accent === 'exclusion' ? 'text-exclusion' : 'text-muted-fg',
            )}>
              {t.label}
            </span>
          </div>
        ))}
      </div>

      {/* GK save rate row — the metric the user explicitly asked for */}
      {(s.rivalGKTotal > 0 || s.homeGKTotal > 0) && (
        <div className="grid grid-cols-2 gap-1.5 mt-2">
          <GKRow
            label={`Arq. ${s.rivalGKTotal > 0 ? 'rival' : '—'}`}
            saved={s.rivalGKSaved}
            total={s.rivalGKTotal}
            pct={s.rivalGKPct}
          />
          <GKRow
            label={`Mi arq.`}
            saved={s.homeGKSaved}
            total={s.homeGKTotal}
            pct={s.homeGKPct}
          />
        </div>
      )}
    </div>
  );
};

const GKRow = ({
  label,
  saved,
  total,
  pct,
}: {
  label: string;
  saved: number;
  total: number;
  pct: number;
}) => (
  <div className="flex items-center justify-between rounded-md bg-save/10 border border-save/20 px-2 py-1">
    <span className="text-[9px] uppercase tracking-widest text-save font-semibold truncate">
      {label}
    </span>
    <span className="font-mono text-xs tabular text-save font-semibold">
      {saved}/{total} · {pct}%
    </span>
  </div>
);
