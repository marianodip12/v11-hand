import { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { MatchSummary } from '@/domain/types';
import { buildSeasonStats } from '@/domain/stats';
import { cn } from '@/lib/cn';

export interface SeasonSummaryProps {
  completedMatches: MatchSummary[];
  myTeamName: string;
  className?: string;
}

interface Stat {
  label: string;
  value: number;
  accent?: 'default' | 'goal' | 'warning' | 'danger' | 'primary' | 'muted';
}

const ACCENT: Record<NonNullable<Stat['accent']>, string> = {
  default: 'text-fg',
  goal:    'text-goal',
  warning: 'text-warning',
  danger:  'text-danger',
  primary: 'text-primary',
  muted:   'text-muted-fg',
};

export const SeasonSummary = ({
  completedMatches,
  myTeamName,
  className,
}: SeasonSummaryProps) => {
  const season = useMemo(
    () => buildSeasonStats(completedMatches, myTeamName),
    [completedMatches, myTeamName],
  );

  const stats: Stat[] = [
    { label: 'PJ',  value: season.total },
    { label: 'G',   value: season.w,  accent: 'goal'    },
    { label: 'E',   value: season.d,  accent: 'warning' },
    { label: 'P',   value: season.l,  accent: 'danger'  },
    { label: 'GF',  value: season.gf },
    { label: 'GC',  value: season.ga, accent: 'muted'   },
    { label: 'Pts', value: season.pts, accent: 'primary' },
  ];

  // Last 6 results for form
  const recent = useMemo(() => {
    return completedMatches
      .slice(0, 6)
      .reverse()
      .map((m) => {
        const isHome = m.home === myTeamName;
        const isAway = m.away === myTeamName;
        if (!isHome && !isAway) return null;
        const mine = isHome ? m.hs : m.as;
        const opp  = isHome ? m.as : m.hs;
        const res = mine > opp ? 'W' : mine === opp ? 'D' : 'L';
        return { id: m.id, res, mine, opp };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
  }, [completedMatches, myTeamName]);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-fg">{myTeamName}</h3>
          <span className="text-[10px] uppercase tracking-wider text-muted-fg">Temporada</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-4 md:grid-cols-7 gap-1.5">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center justify-center rounded-md border border-border bg-surface-2 py-2"
            >
              <span
                className={cn(
                  'font-mono text-lg font-semibold tabular leading-none',
                  ACCENT[s.accent ?? 'default'],
                )}
              >
                {s.value}
              </span>
              <span className="mt-1 text-[9px] uppercase tracking-wider text-muted-fg">
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {recent.length > 0 && (
          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-fg mb-1.5">
              Últimos {recent.length}
            </div>
            <div className="flex gap-1.5">
              {recent.map((r) => {
                const color =
                  r.res === 'W' ? 'border-goal/60 bg-goal/15 text-goal' :
                  r.res === 'D' ? 'border-warning/60 bg-warning/15 text-warning' :
                                  'border-danger/60 bg-danger/15 text-danger';
                return (
                  <span
                    key={r.id}
                    title={`${r.mine}–${r.opp}`}
                    className={cn(
                      'w-7 h-7 rounded-full border flex items-center justify-center',
                      'text-[10px] font-bold',
                      color,
                    )}
                  >
                    {r.res}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
