import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CourtView } from '@/components/handball/court-view';
import { GoalGrid } from '@/components/handball/goal-grid';
import {
  EMPTY_FILTER,
  activeChips,
  applyFilter,
  isEmptyFilter,
  perQuadrant,
  perShooter,
  perZone,
  summarize,
  toggleQuadrant,
  toggleTeam,
  toggleZone,
  toggleShooter,
  type FilterLabels,
  type MatchFilter,
} from '@/domain/analysis';
import { COURT_ZONES, EVENT_TYPES, GOAL_QUADRANTS } from '@/domain/constants';
import { computeMatchStats } from '@/domain/stats';
import type { CourtZoneId, GoalQuadrantId } from '@/domain/types';
import { selectHomeTeam, useMatchStore } from '@/lib/store';
import { cn } from '@/lib/cn';
import { PlayersPanel } from './players-panel';
import { CompareBar } from '@/features/live-match/live-stats';

export const MatchAnalysisPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const completed = useMatchStore((s) => s.completed);
  const myTeam = useMatchStore(selectHomeTeam);

  const match = useMemo(
    () => completed.find((m) => m.id === id) ?? null,
    [completed, id],
  );

  const [filter, setFilter] = useState<MatchFilter>(EMPTY_FILTER);

  if (!match) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold leading-tight">📊 Análisis</h1>
        </header>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-fg mb-3">
              No encontré ese partido. Puede que lo hayas eliminado o que el enlace esté roto.
            </p>
            <Button onClick={() => navigate('/')}>Volver a Partidos</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const events = match.events;
  const filtered = applyFilter(events, filter);
  const summary = summarize(filtered);
  const matchStats = computeMatchStats(events);

  // Dimensional aggregates — these respect the OTHER filters, always showing
  // meaningful counts regardless of which dimension is active.
  const zoneCounts = perZone(events, filter);
  const quadCounts = perQuadrant(events, filter);
  const shooters = perShooter(events, filter);

  // Resolve labels for active filter chips (domain is label-free)
  const labels: FilterLabels = {
    team: (t) => (t === 'home' ? match.home : match.away),
    zone: (z) => COURT_ZONES[z].label,
    quadrant: (q) => GOAL_QUADRANTS[q].label,
    shooter: (key) => {
      const s = shooters.find((sh) => sh.key === key);
      return s ? `${s.name} #${s.number}` : key;
    },
    type: (t) => EVENT_TYPES[t].label,
  };

  const chips = activeChips(filter, labels);

  const myGoals = match.home === myTeam?.name ? match.hs : match.as;
  const theirGoals = match.home === myTeam?.name ? match.as : match.hs;

  return (
    <div className="space-y-3 pb-4">
      {/* Header: match info + score */}
      <header>
        <div className="flex items-center justify-between mb-1">
          <div className="text-[10px] font-semibold tracking-[3px] uppercase text-primary">
            📊 Análisis
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-[11px] text-muted-fg hover:text-fg"
          >
            ← Volver
          </button>
        </div>
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-semibold leading-tight truncate">
            {match.home} <span className="text-muted-fg font-mono tabular">{match.hs}</span>
            <span className="text-muted-fg"> – </span>
            <span className="text-muted-fg font-mono tabular">{match.as}</span> {match.away}
          </h1>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {match.date && <span className="text-[11px] text-muted-fg">{match.date}</span>}
          {match.competition && <Badge tone="primary">{match.competition}</Badge>}
          {myTeam && (
            <Badge tone={myGoals > theirGoals ? 'goal' : myGoals === theirGoals ? 'warning' : 'danger'}>
              {myGoals > theirGoals ? 'Victoria' : myGoals === theirGoals ? 'Empate' : 'Derrota'}
            </Badge>
          )}
        </div>
      </header>

      {/* Team selector */}
      <div className="rounded-lg border border-border bg-surface p-1 flex gap-1">
        <FilterTeamButton
          label={`Ambos (${events.length})`}
          active={filter.team === null}
          onClick={() => setFilter({ ...filter, team: null })}
        />
        <FilterTeamButton
          label={match.home}
          color={match.homeColor}
          active={filter.team === 'home'}
          onClick={() => setFilter((f) => toggleTeam(f, 'home'))}
        />
        <FilterTeamButton
          label={match.away}
          color={match.awayColor}
          active={filter.team === 'away'}
          onClick={() => setFilter((f) => toggleTeam(f, 'away'))}
        />
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setFilter(c.remove(filter))}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/40 bg-primary/15 text-[11px] font-medium text-primary hover:bg-primary/25 transition-colors"
            >
              {c.label}
              <span className="opacity-60 hover:opacity-100 text-xs leading-none">✕</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFilter(EMPTY_FILTER)}
            className="inline-flex items-center px-2.5 py-1 rounded-full border border-border bg-surface-2 text-[11px] text-muted-fg hover:text-fg"
          >
            Limpiar todo
          </button>
        </div>
      )}

      {/* Filtered summary card — gold accent when filter is active */}
      <Card
        className={cn(
          isEmptyFilter(filter) ? '' : 'border-warning/40 bg-warning/5',
        )}
      >
        <CardContent className="p-3">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <SummaryTile value={summary.shots}     label="Lanzam."  tone="neutral" big />
            <SummaryTile value={summary.goals}     label="Goles"    tone="goal"    big />
            <SummaryTile value={`${summary.pct}%`} label="Efect."   tone="goal"    big />
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <SummaryTile value={summary.saved} label="Atajadas" tone="save" />
            <SummaryTile value={summary.post}  label="Palos"    tone="warning" />
            <SummaryTile value={summary.out}   label="Fuera"    tone="neutral" />
            <SummaryTile value={summary.miss - summary.out} label="Errados" tone="neutral" />
          </div>
          <div className="text-[10px] text-muted-fg mt-2 text-center">
            {isEmptyFilter(filter)
              ? `${events.length} ${events.length === 1 ? 'evento' : 'eventos'} en total`
              : `${summary.events} ${summary.events === 1 ? 'evento coincide' : 'eventos coinciden'} con el filtro`}
          </div>
        </CardContent>
      </Card>

      {/* Arco — tap quadrants to filter */}
      <section>
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-medium text-fg">🎯 Arco</h3>
          <span className="text-[10px] text-muted-fg">
            Tocá un cuadrante para filtrar
          </span>
        </div>
        <GoalGrid
          counts={quadCounts}
          selected={filter.quadrant}
          onSelect={(z) => {
            // Only quadrants are filter-eligible here — ignore post/out
            if (!z) {
              setFilter((f) => ({ ...f, quadrant: null }));
              return;
            }
            if (z === 'post' || z === 'out') return;
            setFilter((f) => toggleQuadrant(f, z as GoalQuadrantId));
          }}
        />
      </section>

      {/* Cancha — tap zones to filter */}
      <section>
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-medium text-fg">🏐 Cancha</h3>
          <span className="text-[10px] text-muted-fg">
            Tocá una zona para filtrar
          </span>
        </div>
        <CourtView
          heatmap={zoneCounts}
          selectedZone={filter.zone}
          onZoneSelect={(z) => {
            if (!z) {
              setFilter((f) => ({ ...f, zone: null }));
              return;
            }
            if (z === 'long_range') return; // handled below
            setFilter((f) => toggleZone(f, z as CourtZoneId));
          }}
        />
        {zoneCounts.long_range !== undefined && zoneCounts.long_range > 0 && (
          <button
            type="button"
            onClick={() => setFilter((f) => toggleZone(f, 'long_range'))}
            className={cn(
              'mt-2 w-full h-10 rounded-md border text-xs font-medium transition-colors duration-fast',
              filter.zone === 'long_range'
                ? 'border-card/60 bg-card/20 text-card'
                : 'border-card/30 bg-card/5 text-card/80 hover:bg-card/10',
            )}
          >
            🎯 Arco a Arco ({zoneCounts.long_range})
          </button>
        )}
      </section>

      {/* Players */}
      <section>
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-medium text-fg">👥 Jugadores</h3>
          <span className="text-[10px] text-muted-fg">
            {shooters.length} {shooters.length === 1 ? 'tirador' : 'tiradores'}
          </span>
        </div>
        <PlayersPanel
          shooters={shooters}
          selectedKey={filter.shooterKey}
          homeColor={match.homeColor}
          awayColor={match.awayColor}
          onToggle={(key) => setFilter((f) => toggleShooter(f, key))}
        />
      </section>

      {/* Filtered events list */}
      <section>
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-medium text-fg">📋 Eventos</h3>
          <span className="text-[10px] text-muted-fg">{filtered.length}</span>
        </div>
        <Card>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <p className="text-center text-xs text-muted-fg py-6">
                No hay eventos con el filtro actual
              </p>
            ) : (
              <ul className="divide-y divide-border max-h-[320px] overflow-y-auto">
                {[...filtered]
                  .sort((a, b) => b.min - a.min)
                  .map((e) => {
                    const typeMeta = EVENT_TYPES[e.type];
                    const color = e.team === 'home' ? match.homeColor : match.awayColor;
                    return (
                      <li
                        key={e.id}
                        className="flex items-center gap-2 px-3 py-2 text-xs"
                      >
                        <span className="font-mono tabular text-muted-fg w-8">{e.min}'</span>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                        <span className="flex-1 min-w-0 truncate">
                          <span className="text-fg font-medium">{typeMeta.label}</span>
                          {e.shooter && (
                            <span className="text-muted-fg"> · {e.shooter.name} #{e.shooter.number}</span>
                          )}
                          {!e.shooter && e.sanctioned && (
                            <span className="text-muted-fg"> · {e.sanctioned.name} #{e.sanctioned.number}</span>
                          )}
                        </span>
                        {e.zone && (
                          <span className="text-[10px] text-muted-fg">{COURT_ZONES[e.zone].short}</span>
                        )}
                      </li>
                    );
                  })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Comparativa total del partido — última sección */}
      <section>
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-medium text-fg">⚔️ Comparativa final</h3>
          <span className="text-[10px] text-muted-fg">sin filtros</span>
        </div>
        <Card>
          <CardContent className="p-3 space-y-2">
            <CompareBar
              label="Goles"
              mine={matchStats.homeGoals}
              theirs={matchStats.awayGoals}
              myColor={match.homeColor}
              theirColor={match.awayColor}
              tone="goal"
            />
            <CompareBar
              label="Tiros totales"
              mine={matchStats.homeShots}
              theirs={matchStats.awayShots}
              myColor={match.homeColor}
              theirColor={match.awayColor}
              tone="neutral"
            />
            <CompareBar
              label="Atajadas"
              mine={matchStats.homeGKSaved}
              theirs={matchStats.rivalGKSaved}
              myColor={match.homeColor}
              theirColor={match.awayColor}
              tone="neutral"
            />
            <CompareBar
              label="Exclusiones"
              mine={matchStats.homeExcl}
              theirs={matchStats.awayExcl}
              myColor={match.homeColor}
              theirColor={match.awayColor}
              tone="exclusion"
            />
            <CompareBar
              label="Pérdidas"
              mine={matchStats.homeTurnover}
              theirs={matchStats.awayTurnover}
              myColor={match.homeColor}
              theirColor={match.awayColor}
              tone="danger"
            />
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────

const FilterTeamButton = ({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex-1 h-9 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 truncate px-2',
      active ? 'bg-primary/15 border border-primary/40 text-primary' : 'text-muted-fg hover:text-fg',
    )}
  >
    {color && (
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
    )}
    <span className="truncate">{label}</span>
  </button>
);

const TONE: Record<string, string> = {
  goal: 'text-goal',
  save: 'text-save',
  warning: 'text-warning',
  neutral: 'text-fg',
};

const SummaryTile = ({
  value,
  label,
  tone,
  big = false,
}: {
  value: number | string;
  label: string;
  tone: 'goal' | 'save' | 'warning' | 'neutral';
  big?: boolean;
}) => (
  <div className="flex flex-col items-center justify-center rounded-md bg-surface-2/50 border border-border py-1.5">
    <span className={cn(
      'font-mono font-semibold tabular leading-none',
      TONE[tone],
      big ? 'text-xl' : 'text-base',
    )}>
      {value}
    </span>
    <span className="text-[8px] uppercase tracking-widest text-muted-fg mt-1">
      {label}
    </span>
  </div>
);
