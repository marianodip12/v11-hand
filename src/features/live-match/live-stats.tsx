import { useMemo, useState } from 'react';
import { computeMatchStats } from '@/domain/stats';
import type { HandballEvent } from '@/domain/types';
import { cn } from '@/lib/cn';

export interface LiveStatsProps {
  events: HandballEvent[];
  home: string;
  away: string;
  homeColor: string;
  awayColor: string;
}

/**
 * Live stats block — v9-inspired redesign.
 *
 * Layout:
 *   - Team tabs (home / away) at the top to switch focus.
 *   - 3x3 grid of metric tiles for the focused team.
 *   - GK save-rate banner if relevant.
 *   - "Comparativa" section with horizontal bars vs the other team.
 */
export const LiveStats = ({ events, home, away, homeColor, awayColor }: LiveStatsProps) => {
  const s = useMemo(() => computeMatchStats(events), [events]);
  const [focus, setFocus] = useState<'home' | 'away'>('home');

  const isHome = focus === 'home';
  const focusColor = isHome ? homeColor : awayColor;
  const focusName = isHome ? home : away;

  const focused = {
    goals:     isHome ? s.homeGoals   : s.awayGoals,
    shots:     isHome ? s.homeShots   : s.awayShots,
    pct:       isHome ? s.homePct     : s.awayPct,
    savedAg:   isHome ? s.homeSaved   : s.awaySaved,         // our shots saved by rival GK
    missed:    isHome ? s.homeMiss    : s.awayMiss,
    turnovers: isHome ? s.homeTurnover: s.awayTurnover,
    excl:      isHome ? s.homeExcl    : s.awayExcl,
    penals:    isHome ? s.homePenals  : s.awayPenals,
    // Goals against = goals scored by the other team
    goalsAg:   isHome ? s.awayGoals   : s.homeGoals,
    // GK bar at the bottom refers to the OPPOSING GK facing our shots
    oppGKSaved: isHome ? s.rivalGKSaved : s.homeGKSaved,
    oppGKTotal: isHome ? s.rivalGKTotal : s.homeGKTotal,
    oppGKPct:   isHome ? s.rivalGKPct   : s.homeGKPct,
    oppGKName:  isHome ? away           : home,
  };

  // Comparative bars compare the focused team against the opposing team.
  const bars = [
    {
      label: 'Goles',
      mine: focused.goals,
      theirs: isHome ? s.awayGoals : s.homeGoals,
      tone: 'goal',
    },
    {
      label: 'Tiros totales',
      mine: focused.shots,
      theirs: isHome ? s.awayShots : s.homeShots,
      tone: 'neutral',
    },
    {
      label: 'Exclusiones',
      mine: focused.excl,
      theirs: isHome ? s.awayExcl : s.homeExcl,
      tone: 'exclusion',
    },
    {
      label: 'Pérdidas',
      mine: focused.turnovers,
      theirs: isHome ? s.awayTurnover : s.homeTurnover,
      tone: 'danger',
    },
  ] as const;

  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      {/* Team focus tabs */}
      <div className="flex p-1 gap-1 bg-surface-2/40">
        {(['home', 'away'] as const).map((t) => {
          const active = focus === t;
          const label = t === 'home' ? home : away;
          const color = t === 'home' ? homeColor : awayColor;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setFocus(t)}
              className={cn(
                'flex-1 h-9 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 truncate px-2 transition-colors duration-fast',
                active
                  ? 'bg-primary/15 border border-primary/40 text-primary'
                  : 'text-muted-fg hover:text-fg',
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-3 space-y-3">
        {/* Team header */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: focusColor }} />
          <span className="text-sm font-medium text-fg">{focusName}</span>
        </div>

        {/* Stat tiles — 3x3 grid, v9 aesthetic */}
        <div className="grid grid-cols-3 gap-2">
          <StatTile value={focused.goals}     label="Goles"       tone="goal" big />
          <StatTile value={focused.shots}     label="Tiros"       tone="neutral" big />
          <StatTile value={`${focused.pct}%`} label="Efectividad" tone="goal" big />

          <StatTile value={focused.savedAg}   label="Ataj. recib." tone="save" />
          <StatTile value={focused.missed}    label="Errados"      tone="danger" />
          <StatTile value={focused.turnovers} label="Pérdidas"     tone="danger" />

          <StatTile value={focused.excl}      label="Exclusiones"  tone="exclusion" />
          <StatTile value={focused.penals}    label="Penales"      tone="card" />
          <StatTile value={focused.goalsAg}   label="Goles contr." tone="neutral" />
        </div>

        {/* Opposing GK save-rate banner */}
        {focused.oppGKTotal > 0 && (
          <div className="flex items-center justify-between rounded-md bg-save/10 border border-save/30 px-3 py-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <GlovesIcon />
              <span className="text-xs text-save truncate">
                Arq. {focused.oppGKName} — {focused.oppGKSaved} {focused.oppGKSaved === 1 ? 'atajada' : 'atajadas'}
              </span>
            </div>
            <span className="font-mono text-sm font-semibold tabular text-save">
              {focused.oppGKPct}%
            </span>
          </div>
        )}

        {/* Comparative bars */}
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg mb-2">
            Comparativa
          </div>
          <div className="space-y-2">
            {bars.map((b) => (
              <CompareBar
                key={b.label}
                label={b.label}
                mine={b.mine}
                theirs={b.theirs}
                myColor={focusColor}
                theirColor={isHome ? awayColor : homeColor}
                tone={b.tone}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Stat tile ─────────────────────────────────────────────────────────

const TILE_TONE = {
  goal:      'text-goal',
  save:      'text-save',
  danger:    'text-danger',
  warning:   'text-warning',
  exclusion: 'text-exclusion',
  card:      'text-card',
  neutral:   'text-fg',
} as const;

const StatTile = ({
  value,
  label,
  tone,
  big = false,
}: {
  value: number | string;
  label: string;
  tone: keyof typeof TILE_TONE;
  big?: boolean;
}) => (
  <div className="flex flex-col items-center justify-center rounded-md border border-border bg-surface-2 py-2.5">
    <span className={cn(
      'font-mono font-semibold tabular leading-none',
      TILE_TONE[tone],
      big ? 'text-xl' : 'text-lg',
    )}>
      {value}
    </span>
    <span className="text-[9px] text-muted-fg mt-1 text-center px-1 leading-tight">
      {label}
    </span>
  </div>
);

// ─── Compare bar ───────────────────────────────────────────────────────

const CompareBar = ({
  label,
  mine,
  theirs,
  myColor,
  theirColor,
  tone,
}: {
  label: string;
  mine: number;
  theirs: number;
  myColor: string;
  theirColor: string;
  tone: 'goal' | 'neutral' | 'exclusion' | 'danger';
}) => {
  const total = mine + theirs;
  const minePct = total === 0 ? 50 : (mine / total) * 100;
  const theirPct = 100 - minePct;

  const numTone =
    tone === 'goal'      ? 'text-goal' :
    tone === 'exclusion' ? 'text-exclusion' :
    tone === 'danger'    ? 'text-danger' :
                           'text-fg';

  return (
    <div>
      <div className="text-[10px] text-muted-fg text-center mb-1">{label}</div>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <span className={cn('font-mono text-sm font-semibold tabular w-6 text-right', numTone)}>
          {mine}
        </span>
        <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden flex">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${minePct}%`, background: myColor }}
          />
          <div
            className="h-full transition-all duration-300 opacity-60"
            style={{ width: `${theirPct}%`, background: theirColor }}
          />
        </div>
        <span className={cn('font-mono text-sm font-semibold tabular w-6 text-left', numTone)}>
          {theirs}
        </span>
      </div>
    </div>
  );
};

// ─── Icon ──────────────────────────────────────────────────────────────

const GlovesIcon = () => (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 20V9a2 2 0 1 1 4 0v3" />
    <path d="M12 12V5a2 2 0 1 1 4 0v7" />
    <path d="M16 12V7a2 2 0 1 1 4 0v9a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6v-1a2 2 0 1 1 4 0" />
  </svg>
);
