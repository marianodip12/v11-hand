import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/feedback';
import {
  keyMoments,
  longestRun,
  resultFor,
  scoreTimeline,
  seasonTimeline,
  seasonTotals,
} from '@/domain/evolution';
import type { MatchSummary } from '@/domain/types';
import { selectHomeTeam, useMatchStore } from '@/lib/store';
import { cn } from '@/lib/cn';

type ViewKind = 'season' | 'match';

export const EvolutionPage = () => {
  const navigate = useNavigate();
  const completed = useMatchStore((s) => s.completed);
  const myTeam = useMatchStore(selectHomeTeam);

  const [view, setView] = useState<ViewKind>('season');
  const [selectedId, setSelectedId] = useState<string | null>(
    completed.length > 0 ? completed[0].id : null,
  );

  // Sort matches by date ascending for the season curve
  const sorted = useMemo(
    () => [...completed].sort((a, b) => sortableDate(a.date ?? '') - sortableDate(b.date ?? '')),
    [completed],
  );

  if (!myTeam) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold leading-tight">📈 Evolución</h1>
          <p className="text-xs text-muted-fg mt-1">Tu evolución a lo largo de la temporada.</p>
        </header>
        <EmptyState
          title="Sin equipo propio"
          description="Definí tu equipo en Equipos para ver tu evolución en la temporada."
          action={<Button onClick={() => navigate('/teams')}>Ir a Equipos</Button>}
        />
      </div>
    );
  }

  if (completed.length === 0) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold leading-tight">📈 Evolución</h1>
        </header>
        <EmptyState
          title="Sin partidos completados"
          description="Completá al menos un partido para ver la evolución."
          action={<Button onClick={() => navigate('/')}>Ir a Partidos</Button>}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      <header>
        <div className="text-[10px] font-semibold tracking-[3px] uppercase text-primary mb-1">
          Evolución
        </div>
        <h1 className="text-2xl font-semibold leading-tight">📈 {myTeam.name}</h1>
      </header>

      {/* View tabs */}
      <div className="rounded-lg border border-border bg-surface p-1 flex gap-1">
        <ViewTab label="🏆 Temporada" active={view === 'season'} onClick={() => setView('season')} />
        <ViewTab label="🎯 Por partido" active={view === 'match'} onClick={() => setView('match')} />
      </div>

      {view === 'season' ? (
        <SeasonView matches={sorted} myTeamName={myTeam.name} myColor={myTeam.color} onOpenMatch={(id) => {
          setSelectedId(id);
          setView('match');
        }} />
      ) : (
        <MatchView
          matches={sorted}
          selectedId={selectedId}
          onSelect={setSelectedId}
          myTeamName={myTeam.name}
          myColor={myTeam.color}
        />
      )}
    </div>
  );
};

// ─── Season view ─────────────────────────────────────────────────────

const SeasonView = ({
  matches,
  myTeamName,
  myColor,
  onOpenMatch,
}: {
  matches: MatchSummary[];
  myTeamName: string;
  myColor: string;
  onOpenMatch: (id: string) => void;
}) => {
  const timeline = useMemo(() => seasonTimeline(matches, myTeamName), [matches, myTeamName]);
  const totals = useMemo(() => seasonTotals(matches, myTeamName), [matches, myTeamName]);

  return (
    <div className="space-y-3">
      {/* Totals */}
      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-4 gap-2 mb-2">
            <SeasonTile value={totals.played}  label="PJ"  />
            <SeasonTile value={totals.wins}    label="PG"  tone="goal" />
            <SeasonTile value={totals.draws}   label="PE"  tone="warning" />
            <SeasonTile value={totals.losses}  label="PP"  tone="danger" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <SeasonTile value={totals.goalsFor}       label="GF" />
            <SeasonTile value={totals.goalsAgainst}   label="GC" />
            <SeasonTile value={signed(totals.goalDiff)} label="DIF" tone={totals.goalDiff >= 0 ? 'goal' : 'danger'} />
            <SeasonTile value={totals.points}         label="PTS" tone="primary" big />
          </div>
          <div className="text-[10px] text-muted-fg mt-2 text-center">
            Promedio: {totals.avgFor} a favor · {totals.avgAgainst} en contra
          </div>
        </CardContent>
      </Card>

      {/* Results strip */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg mb-1.5">
          Últimos resultados
        </div>
        <div className="flex gap-1 flex-wrap">
          {timeline.map((p) => (
            <span
              key={p.matchId}
              title={`${p.opponent} ${p.myGoals}-${p.theirGoals}`}
              className={cn(
                'inline-flex items-center justify-center w-6 h-6 rounded font-mono text-[10px] font-bold tabular',
                p.result === 'win'  && 'bg-goal/20 text-goal border border-goal/40',
                p.result === 'draw' && 'bg-warning/20 text-warning border border-warning/40',
                p.result === 'loss' && 'bg-danger/20 text-danger border border-danger/40',
              )}
            >
              {p.result === 'win' ? 'G' : p.result === 'draw' ? 'E' : 'P'}
            </span>
          ))}
        </div>
      </div>

      {/* Match-by-match chart: diff bars */}
      <Card>
        <CardContent className="p-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg mb-2">
            Diferencia de gol por partido
          </div>
          <DiffBarChart timeline={timeline} myColor={myColor} />
        </CardContent>
      </Card>

      {/* Points progression */}
      <Card>
        <CardContent className="p-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg mb-2">
            Puntos acumulados
          </div>
          <PointsLine timeline={timeline} myColor={myColor} />
        </CardContent>
      </Card>

      {/* Match list */}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg mb-1.5">
          Partidos
        </div>
        <ul className="space-y-1.5">
          {[...timeline].reverse().map((p) => (
            <li key={p.matchId}>
              <button
                type="button"
                onClick={() => onOpenMatch(p.matchId)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-surface hover:bg-surface-2 transition-colors text-left"
              >
                <span className="font-mono text-xs tabular text-muted-fg w-8">{p.date}</span>
                <span className="flex-1 min-w-0 text-xs font-medium truncate">
                  vs {p.opponent}
                </span>
                <span className="font-mono text-sm tabular text-fg">
                  {p.myGoals}–{p.theirGoals}
                </span>
                <ResultBadge result={p.result} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// ─── Match view ──────────────────────────────────────────────────────

const MatchView = ({
  matches,
  selectedId,
  onSelect,
  myTeamName,
  myColor,
}: {
  matches: MatchSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  myTeamName: string;
  myColor: string;
}) => {
  const match = matches.find((m) => m.id === selectedId) ?? matches[0];
  const timeline = useMemo(() => scoreTimeline(match.events), [match]);
  const moments = useMemo(() => keyMoments(match.events), [match]);
  const run = useMemo(() => longestRun(match.events), [match]);
  const isHome = match.home === myTeamName;
  const result = resultFor(match, myTeamName);

  return (
    <div className="space-y-3">
      {/* Match selector */}
      <select
        value={match.id}
        onChange={(e) => onSelect(e.target.value)}
        className={cn(
          'w-full h-9 px-3 rounded-md bg-surface-2 border border-border',
          'text-sm text-fg focus:outline-none focus:ring-2 focus:ring-primary/50',
        )}
      >
        {matches.map((m) => (
          <option key={m.id} value={m.id}>
            {m.date} · {m.home} {m.hs}–{m.as} {m.away}
          </option>
        ))}
      </select>

      {/* Score header */}
      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-3 items-center gap-2">
            <TeamHead name={match.home} color={match.homeColor} align="left" />
            <div className="flex flex-col items-center">
              <div className="font-mono text-3xl font-semibold tabular leading-none">
                {match.hs}–{match.as}
              </div>
              <div className="mt-1">
                <ResultBadge result={result} />
              </div>
            </div>
            <TeamHead name={match.away} color={match.awayColor} align="right" />
          </div>
        </CardContent>
      </Card>

      {/* Score evolution chart */}
      <Card>
        <CardContent className="p-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg mb-2">
            Marcador por minuto
          </div>
          <ScoreChart
            timeline={timeline}
            homeColor={match.homeColor}
            awayColor={match.awayColor}
          />
        </CardContent>
      </Card>

      {/* Diff chart */}
      <Card>
        <CardContent className="p-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg mb-2">
            Diferencia ({isHome ? match.home : match.away})
          </div>
          <DiffChart
            timeline={timeline}
            myColor={myColor}
            invert={!isHome}
          />
        </CardContent>
      </Card>

      {/* Key moments */}
      <div className="grid grid-cols-4 gap-2">
        {moments.map((m) => (
          <Card key={m.minute} className="text-center">
            <CardContent className="p-2">
              <div className="text-[9px] uppercase tracking-wider text-muted-fg">{m.label}</div>
              <div className="font-mono text-sm font-semibold tabular mt-1">{m.home}–{m.away}</div>
              <div className={cn(
                'text-[10px] font-semibold mt-0.5',
                (isHome ? m.diff : -m.diff) > 0  ? 'text-goal' :
                (isHome ? m.diff : -m.diff) < 0  ? 'text-danger' :
                                                   'text-muted-fg',
              )}>
                {signed(isHome ? m.diff : -m.diff)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Longest run */}
      {run && (
        <Card>
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-fg">Racha más larga</div>
              <div className="text-sm font-medium text-fg mt-0.5">
                {run.team === 'home' ? match.home : match.away}
              </div>
              <div className="text-[11px] text-muted-fg mt-0.5">
                min {run.startMin}–{run.endMin}
              </div>
            </div>
            <div className="font-mono text-2xl font-semibold tabular text-primary">
              ×{run.count}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ─── Chart primitives (SVG) ──────────────────────────────────────────

interface ScorePoint {
  minute: number;
  home: number;
  away: number;
  diff: number;
}

const ScoreChart = ({
  timeline,
  homeColor,
  awayColor,
}: {
  timeline: ScorePoint[];
  homeColor: string;
  awayColor: string;
}) => {
  const width = 320, height = 140, padX = 28, padY = 12;
  const maxMin = timeline[timeline.length - 1]?.minute ?? 60;
  const maxY = Math.max(5, ...timeline.map((p) => Math.max(p.home, p.away)));
  const scaleX = (m: number) => padX + ((m / maxMin) * (width - padX * 2));
  const scaleY = (v: number) => height - padY - ((v / maxY) * (height - padY * 2));

  const homePath = timeline.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.minute)} ${scaleY(p.home)}`).join(' ');
  const awayPath = timeline.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.minute)} ${scaleY(p.away)}`).join(' ');

  // Horizontal gridlines every 5 goals
  const gridSteps: number[] = [];
  for (let v = 0; v <= maxY; v += 5) gridSteps.push(v);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Marcador por minuto">
      {/* Grid */}
      {gridSteps.map((v) => (
        <line
          key={v}
          x1={padX} x2={width - padX}
          y1={scaleY(v)} y2={scaleY(v)}
          stroke="currentColor"
          className="text-border"
          strokeWidth={0.5}
          strokeDasharray="2 4"
        />
      ))}
      {gridSteps.map((v) => (
        <text
          key={v}
          x={padX - 4} y={scaleY(v) + 3}
          className="fill-muted-fg"
          fontSize="8"
          textAnchor="end"
        >
          {v}
        </text>
      ))}
      {/* Half-time marker */}
      <line
        x1={scaleX(30)} x2={scaleX(30)}
        y1={padY} y2={height - padY}
        stroke="currentColor" className="text-muted-fg/40"
        strokeWidth={0.5}
        strokeDasharray="3 3"
      />
      {/* Lines */}
      <path d={homePath} fill="none" stroke={homeColor} strokeWidth={1.8} strokeLinecap="round" />
      <path d={awayPath} fill="none" stroke={awayColor} strokeWidth={1.8} strokeLinecap="round" />
      {/* X-axis labels */}
      {[0, 15, 30, 45, 60].filter((m) => m <= maxMin).map((m) => (
        <text key={m} x={scaleX(m)} y={height - 2} className="fill-muted-fg" fontSize="8" textAnchor="middle">
          {m}'
        </text>
      ))}
    </svg>
  );
};

const DiffChart = ({
  timeline,
  myColor,
  invert,
}: {
  timeline: ScorePoint[];
  myColor: string;
  invert: boolean;
}) => {
  const width = 320, height = 110, padX = 24, padY = 10;
  const maxMin = timeline[timeline.length - 1]?.minute ?? 60;
  const mapped = timeline.map((p) => ({
    minute: p.minute,
    v: invert ? -p.diff : p.diff,
  }));
  const absMax = Math.max(5, ...mapped.map((p) => Math.abs(p.v)));
  const scaleX = (m: number) => padX + ((m / maxMin) * (width - padX * 2));
  const scaleY = (v: number) => {
    const mid = height / 2;
    return mid - (v / absMax) * (mid - padY);
  };

  // Build filled area path
  const topPath = mapped.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.minute)} ${scaleY(p.v)}`).join(' ');
  const areaPath = `${topPath} L ${scaleX(maxMin)} ${scaleY(0)} L ${scaleX(0)} ${scaleY(0)} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Diferencia">
      {/* Zero axis */}
      <line
        x1={padX} x2={width - padX}
        y1={scaleY(0)} y2={scaleY(0)}
        stroke="currentColor"
        className="text-border"
        strokeWidth={0.5}
      />
      <path d={areaPath} fill={myColor} opacity={0.25} />
      <path d={topPath} fill="none" stroke={myColor} strokeWidth={1.8} />
      {[0, 15, 30, 45, 60].filter((m) => m <= maxMin).map((m) => (
        <text key={m} x={scaleX(m)} y={height - 2} className="fill-muted-fg" fontSize="8" textAnchor="middle">
          {m}'
        </text>
      ))}
    </svg>
  );
};

const DiffBarChart = ({
  timeline,
  myColor,
}: {
  timeline: { index: number; diff: number; opponent: string }[];
  myColor: string;
}) => {
  if (timeline.length === 0) return null;
  const width = 320, height = 110, padX = 16, padY = 12;
  const absMax = Math.max(3, ...timeline.map((p) => Math.abs(p.diff)));
  const slot = (width - padX * 2) / timeline.length;
  const mid = height / 2;
  const scaleY = (v: number) => mid - (v / absMax) * (mid - padY);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img">
      <line
        x1={padX} x2={width - padX}
        y1={mid} y2={mid}
        stroke="currentColor"
        className="text-border"
        strokeWidth={0.5}
      />
      {timeline.map((p) => {
        const x = padX + slot * (p.index - 1) + slot * 0.15;
        const w = slot * 0.7;
        const y = p.diff >= 0 ? scaleY(p.diff) : mid;
        const h = Math.abs(scaleY(p.diff) - mid);
        const fill = p.diff >= 0 ? myColor : '#EF6461';
        return (
          <g key={p.index}>
            <rect x={x} y={y} width={w} height={h} fill={fill} opacity={0.85} rx={1} />
            <text x={x + w / 2} y={p.diff >= 0 ? y - 2 : y + h + 8} className="fill-muted-fg" fontSize="7" textAnchor="middle">
              {signed(p.diff)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const PointsLine = ({
  timeline,
  myColor,
}: {
  timeline: { index: number; runningPoints: number }[];
  myColor: string;
}) => {
  if (timeline.length === 0) return null;
  const width = 320, height = 100, padX = 20, padY = 10;
  const maxIdx = timeline.length;
  const maxPts = Math.max(3, timeline[timeline.length - 1].runningPoints);
  const scaleX = (i: number) => padX + ((i - 1) / Math.max(1, maxIdx - 1)) * (width - padX * 2);
  const scaleY = (v: number) => height - padY - (v / maxPts) * (height - padY * 2);
  const path = timeline.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.index)} ${scaleY(p.runningPoints)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img">
      <path d={path} fill="none" stroke={myColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {timeline.map((p) => (
        <circle key={p.index} cx={scaleX(p.index)} cy={scaleY(p.runningPoints)} r={2.5} fill={myColor} />
      ))}
    </svg>
  );
};

// ─── Small components ────────────────────────────────────────────────

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

const ResultBadge = ({ result }: { result: 'win' | 'draw' | 'loss' }) => {
  const label = result === 'win' ? 'Victoria' : result === 'draw' ? 'Empate' : 'Derrota';
  const tone: 'goal' | 'warning' | 'danger' = result === 'win' ? 'goal' : result === 'draw' ? 'warning' : 'danger';
  return <Badge tone={tone}>{label}</Badge>;
};

const SEASON_TONE: Record<string, string> = {
  goal: 'text-goal',
  danger: 'text-danger',
  warning: 'text-warning',
  primary: 'text-primary',
  neutral: 'text-fg',
};

const SeasonTile = ({
  value, label, tone = 'neutral', big = false,
}: {
  value: number | string;
  label: string;
  tone?: keyof typeof SEASON_TONE;
  big?: boolean;
}) => (
  <div className="flex flex-col items-center justify-center rounded-md bg-surface-2 border border-border py-1.5">
    <span className={cn('font-mono font-semibold tabular leading-none', SEASON_TONE[tone], big ? 'text-xl' : 'text-base')}>
      {value}
    </span>
    <span className="text-[8px] uppercase tracking-widest text-muted-fg mt-1">{label}</span>
  </div>
);

const TeamHead = ({
  name, color, align,
}: { name: string; color: string; align: 'left' | 'right' }) => (
  <div className={cn('min-w-0', align === 'right' ? 'text-right' : 'text-left')}>
    <div className={cn(
      'flex items-center gap-1.5 text-xs font-medium text-fg truncate',
      align === 'right' && 'justify-end',
    )}>
      {align === 'left' && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />}
      <span className="truncate">{name}</span>
      {align === 'right' && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />}
    </div>
  </div>
);

// ─── Helpers ─────────────────────────────────────────────────────────

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/**
 * Converts "DD/MM" to a rough sortable number for chronological ordering.
 * Doesn't assume year since we don't store it — just orders within what
 * looks like a single season.
 */
const sortableDate = (d: string): number => {
  if (!d) return 0;
  const [dd, mm] = d.split('/').map((x) => parseInt(x, 10));
  if (Number.isNaN(dd) || Number.isNaN(mm)) return 0;
  return mm * 100 + dd;
};
