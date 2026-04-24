import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import {
  EMPTY_SEASON_FILTER,
  computeSeasonTotals,
  filterMatches,
  toMatchPoints,
  topScorers,
} from '@/domain/season';
import { selectHomeTeam, useMatchStore } from '@/lib/store';
import { cn } from '@/lib/cn';

type StatsView = 'resumen' | 'jugadores';

export const StatsPage = () => {
  const navigate = useNavigate();
  const completed = useMatchStore((s) => s.completed);
  const myTeam = useMatchStore(selectHomeTeam);

  const [view, setView] = useState<StatsView>('resumen');
  const [competition, setCompetition] = useState<string | null>(null);

  const competitions = useMemo(() => {
    const set = new Set<string>();
    for (const m of completed) if (m.competition) set.add(m.competition);
    return Array.from(set).sort();
  }, [completed]);

  if (!myTeam) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold leading-tight">📊 Stats</h1>
        </header>
        <EmptyState
          title="Sin equipo propio"
          description="Definí tu equipo en Equipos para ver tus estadísticas de temporada."
          action={<Button onClick={() => navigate('/teams')}>Ir a Equipos</Button>}
        />
      </div>
    );
  }

  const filter = { ...EMPTY_SEASON_FILTER, myTeamName: myTeam.name, competition };
  const relevant = filterMatches(completed, filter);

  if (relevant.length === 0) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold leading-tight">📊 Stats</h1>
        </header>
        <EmptyState
          title="Sin partidos de tu equipo"
          description="Completá partidos donde juegue tu equipo para ver agregados."
          action={<Button onClick={() => navigate('/')}>Ir a Partidos</Button>}
        />
      </div>
    );
  }

  const totals = computeSeasonTotals(completed, filter);
  const matchPoints = toMatchPoints(completed, filter);
  const scorers = topScorers(completed, filter, 15);

  return (
    <div className="w-full">
      <div className="space-y-3 pb-4">
        <header>
          <div className="text-[10px] font-semibold tracking-[3px] uppercase text-primary mb-1">
            Stats
          </div>
          <h1 className="text-3xl font-semibold leading-tight md:text-4xl">📊 {myTeam.name}</h1>
          <p className="text-xs text-muted-fg mt-1">
            {relevant.length} {relevant.length === 1 ? 'partido' : 'partidos'}
            {competition && ` · ${competition}`}
          </p>
        </header>

        <div className="rounded-lg border border-border bg-surface p-1 flex gap-1">
          <ViewTab label="📋 Resumen"  active={view === 'resumen'}    onClick={() => setView('resumen')} />
          <ViewTab label="🎯 Jugadores" active={view === 'jugadores'} onClick={() => setView('jugadores')} />
        </div>

        {competitions.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <CompChip label="Todas" active={competition === null} onClick={() => setCompetition(null)} />
            {competitions.map((c) => (
              <CompChip key={c} label={c} active={competition === c} onClick={() => setCompetition(c)} />
            ))}
          </div>
        )}

        {view === 'resumen' ? (
          <ResumenView totals={totals} points={matchPoints} />
        ) : (
          <JugadoresView scorers={scorers} />
        )}
      </div>
    </div>
  );
};

const ResumenView = ({
  totals, points,
}: {
  totals: ReturnType<typeof computeSeasonTotals>;
  points: ReturnType<typeof toMatchPoints>;
}) => (
  <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3">
    <Card>
      <CardContent className="p-3">
        <div className="grid grid-cols-4 gap-2">
          <StatTile value={totals.matchesPlayed} label="PJ" />
          <StatTile value={totals.wins}          label="PG" tone="goal" />
          <StatTile value={totals.draws}         label="PE" tone="warning" />
          <StatTile value={totals.losses}        label="PP" tone="danger" />
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardContent className="p-3 space-y-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg mb-2">
            Ofensivo
          </div>
          <div className="grid grid-cols-4 gap-2">
            <StatTile value={totals.goalsFor}       label="Goles"   tone="goal" />
            <StatTile value={totals.shots}          label="Tiros"   />
            <StatTile value={`${totals.shotPct}%`}  label="Efect."  tone="goal" />
            <StatTile value={avg(totals.goalsFor, totals.matchesPlayed)} label="Prom." />
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg mb-2">
            Defensivo
          </div>
          <div className="grid grid-cols-4 gap-2">
            <StatTile value={totals.goalsAgainst}      label="Gol contr."      tone="danger" />
            <StatTile value={totals.ourGKSaves}        label="Ataj. propias"   tone="save" />
            <StatTile value={`${totals.ourGKPct}%`}    label="% arquero"       tone="save" />
            <StatTile value={avg(totals.goalsAgainst, totals.matchesPlayed)} label="Prom. rec." />
          </div>
        </div>
      </CardContent>
    </Card>

    {points.length > 0 && (
      <Card>
        <CardContent className="p-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg mb-2">
            Rendimiento por partido
          </div>
          <PctBars points={points} />
          <div className="flex items-center justify-center gap-3 text-[10px] text-muted-fg mt-1">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-goal" /> % tiro</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary" /> % arq</span>
          </div>
        </CardContent>
      </Card>
    )}
  </div>
);

const JugadoresView = ({
  scorers,
}: {
  scorers: ReturnType<typeof topScorers>;
}) => {
  if (scorers.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-surface-2/30 py-8 text-center">
        <p className="text-xs text-muted-fg">Sin tiradores identificados</p>
      </div>
    );
  }
  const max = Math.max(...scorers.map((s) => s.goals));
  return (
    <ul className="space-y-1.5">
      {scorers.map((s, i) => (
        <li key={s.key}>
          <div className="flex items-center gap-2 p-2 rounded-md border border-border bg-surface-2/60">
            <div className="w-6 text-center font-mono text-xs text-muted-fg tabular">
              {i + 1}
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-mono text-sm font-bold tabular text-white bg-primary">
              {s.number}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{s.name}</div>
              <div className="text-[10px] text-muted-fg">
                {s.matches} {s.matches === 1 ? 'partido' : 'partidos'} · {s.shots} tiros
              </div>
              <div className="h-1.5 bg-surface rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-goal"
                  style={{ width: `${(s.goals / Math.max(1, max)) * 100}%` }}
                />
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg font-semibold tabular text-goal leading-none">
                {s.goals}
              </div>
              <div className="text-[9px] text-muted-fg uppercase tracking-widest mt-0.5">
                {s.pct}%
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
};

const PctBars = ({
  points,
}: {
  points: ReturnType<typeof toMatchPoints>;
}) => {
  const width = 320, height = 140, padX = 18, padY = 14;
  const slot = (width - padX * 2) / points.length;
  const scaleY = (v: number) => height - padY - (v / 100) * (height - padY * 2);
  const barW = slot * 0.35;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img">
      <line
        x1={padX} x2={width - padX}
        y1={scaleY(50)} y2={scaleY(50)}
        stroke="currentColor" className="text-border"
        strokeWidth={0.5}
        strokeDasharray="2 3"
      />
      <text x={width - padX + 2} y={scaleY(50) + 3} className="fill-muted-fg" fontSize="7">50%</text>
      {points.map((p, i) => {
        const xCenter = padX + slot * i + slot / 2;
        const shotX = xCenter - barW - 1;
        const gkX   = xCenter + 1;
        const shotY = scaleY(p.shotPct);
        const gkY   = scaleY(p.gkPct);
        return (
          <g key={p.id}>
            <rect x={shotX} y={shotY} width={barW} height={height - padY - shotY} fill="#10B981" opacity={0.85} rx={1} />
            <rect x={gkX}   y={gkY}   width={barW} height={height - padY - gkY}   fill="#60A5FA" opacity={0.85} rx={1} />
            <text x={xCenter} y={height - 3} className="fill-muted-fg" fontSize="7" textAnchor="middle">
              {p.label.slice(0, 6)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// ─── small ui helpers ────────────────────────────────────────────────

const ViewTab = ({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex-1 h-9 rounded-md text-xs font-medium transition-colors',
      active ? 'bg-primary/15 border border-primary/40 text-primary' : 'text-muted-fg hover:text-fg',
    )}
  >
    {label}
  </button>
);

const CompChip = ({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'px-3 py-1 rounded-full border text-[11px] transition-colors',
      active
        ? 'border-primary/40 bg-primary/15 text-primary'
        : 'border-border bg-surface-2/40 text-muted-fg hover:text-fg',
    )}
  >
    {label}
  </button>
);

const avg = (total: number, n: number): string =>
  n === 0 ? '0' : String(Math.round((total / n) * 10) / 10);

const TONE: Record<string, string> = {
  goal: 'text-goal',
  save: 'text-save',
  danger: 'text-danger',
  warning: 'text-warning',
  neutral: 'text-fg',
};

const StatTile = ({
  value, label, tone = 'neutral',
}: { value: number | string; label: string; tone?: keyof typeof TONE }) => (
  <div className="flex flex-col items-center justify-center rounded-md bg-surface-2 border border-border py-2">
    <span className={cn('font-mono text-lg font-semibold tabular leading-none', TONE[tone])}>
      {value}
    </span>
    <span className="text-[8px] uppercase tracking-widest text-muted-fg mt-1 text-center px-1 leading-tight">
      {label}
    </span>
  </div>
);
