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
  perGoalkeeper,
  perQuadrant,
  perShooter,
  perZone,
  setTypeOnly,
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
import type { CourtZoneId, GoalQuadrantId, HandballEvent } from '@/domain/types';
import { selectHomeTeam, useMatchStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { PlayersPanel } from './players-panel';
import { CompareBar } from '@/features/live-match/live-stats';

// ─── Period filter ──────────────────────────────────────────────────────
type PeriodFilter = 'full' | 'first' | 'second';

const filterByPeriod = (events: HandballEvent[], period: PeriodFilter): HandballEvent[] => {
  if (period === 'full') return events;
  if (period === 'first') return events.filter((e) => e.min <= 30);
  return events.filter((e) => e.min > 30);
};

// ─── Shot type color map for the court/goal overlays ────────────────────
export const SHOT_TYPE_COLORS: Record<string, string> = {
  goal:       '#22c55e',
  saved:      '#3b82f6',
  post:       '#f59e0b',
  miss_fault: '#a855f7',
  miss:       '#ef4444',
};

// ─── Turnover zone counts ────────────────────────────────────────────────
const perTurnoverZone = (
  events: HandballEvent[],
  teamFilter: 'home' | 'away' | null,
): Partial<Record<CourtZoneId, number>> => {
  const result: Partial<Record<CourtZoneId, number>> = {};
  for (const e of events) {
    if (e.type !== 'turnover') continue;
    if (teamFilter && e.team !== teamFilter) continue;
    if (!e.zone) continue;
    result[e.zone] = (result[e.zone] ?? 0) + 1;
  }
  return result;
};

export const MatchAnalysisPage = () => {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const completed = useMatchStore((s) => s.completed);
  const myTeam = useMatchStore(selectHomeTeam);

  const match = useMemo(
    () => completed.find((m) => m.id === id) ?? null,
    [completed, id],
  );

  const [filter, setFilter] = useState<MatchFilter>(EMPTY_FILTER);
  const [fueraMode, setFueraMode] = useState<boolean>(false);
  const [period, setPeriod] = useState<PeriodFilter>('full');
  const [teamToggle, setTeamToggle] = useState<'mine' | 'rival' | 'all'>('all');

  const myTeamSide = useMemo(() => {
    if (!myTeam || !match) return null;
    if (match.home === myTeam.name) return 'home' as const;
    if (match.away === myTeam.name) return 'away' as const;
    return null;
  }, [myTeam, match]);

  const resolvedTeamFilter = useMemo((): 'home' | 'away' | null => {
    if (!myTeamSide || teamToggle === 'all') return filter.team;
    if (teamToggle === 'mine') return myTeamSide;
    return myTeamSide === 'home' ? 'away' : 'home';
  }, [teamToggle, myTeamSide, filter.team]);

  if (!match) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold leading-tight">{t.analysis_title}</h1>
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

  const allEvents = match.events;
  const periodEvents = filterByPeriod(allEvents, period);

  const effectiveFilter: MatchFilter = {
    ...filter,
    team: resolvedTeamFilter,
  };

  const baseFiltered = applyFilter(periodEvents, effectiveFilter);
  const filtered = fueraMode
    ? baseFiltered.filter((e) => e.type === 'miss' && e.goalZone === 'out')
    : baseFiltered;
  const summary = summarize(filtered);
  const matchStats = computeMatchStats(allEvents);

  const aggFilter = fueraMode ? { ...effectiveFilter, types: ['miss'] as HandballEvent['type'][] } : effectiveFilter;
  const zoneCounts = perZone(periodEvents, aggFilter);
  const quadCounts = perQuadrant(periodEvents, aggFilter);
  const shooters = perShooter(periodEvents, aggFilter);
  const goalkeepers = perGoalkeeper(periodEvents, aggFilter);

  const turnoverZoneCounts = perTurnoverZone(periodEvents, resolvedTeamFilter);

  // Per-type counts by quadrant and zone
  const buildQuadCountsByType = (): Record<string, Partial<Record<GoalQuadrantId, number>>> => {
    const acc: Record<string, Partial<Record<GoalQuadrantId, number>>> = {
      goal: {}, saved: {}, post: {}, miss_fault: {}, miss: {},
    };
    const base = applyFilter(periodEvents, { ...effectiveFilter, types: [] });
    for (const e of base) {
      const g = e.goalZone;
      if (!g || !(Object.keys(GOAL_QUADRANTS) as GoalQuadrantId[]).includes(g as GoalQuadrantId)) continue;
      const q = g as GoalQuadrantId;
      if (e.type === 'goal') acc.goal[q] = (acc.goal[q] ?? 0) + 1;
      else if (e.type === 'saved') acc.saved[q] = (acc.saved[q] ?? 0) + 1;
      else if (e.type === 'post') acc.post[q] = (acc.post[q] ?? 0) + 1;
      else if (e.type === 'miss' && e.goalZone === 'out') acc.miss_fault[q] = (acc.miss_fault[q] ?? 0) + 1;
      else if (e.type === 'miss') acc.miss[q] = (acc.miss[q] ?? 0) + 1;
    }
    return acc;
  };

  const buildZoneCountsByType = (): Record<string, Partial<Record<CourtZoneId, number>>> => {
    const acc: Record<string, Partial<Record<CourtZoneId, number>>> = {
      goal: {}, saved: {}, post: {}, miss_fault: {}, miss: {},
    };
    const base = applyFilter(periodEvents, { ...effectiveFilter, types: [] });
    for (const e of base) {
      if (!e.zone) continue;
      const z = e.zone;
      if (e.type === 'goal') acc.goal[z] = (acc.goal[z] ?? 0) + 1;
      else if (e.type === 'saved') acc.saved[z] = (acc.saved[z] ?? 0) + 1;
      else if (e.type === 'post') acc.post[z] = (acc.post[z] ?? 0) + 1;
      else if (e.type === 'miss' && e.goalZone === 'out') acc.miss_fault[z] = (acc.miss_fault[z] ?? 0) + 1;
      else if (e.type === 'miss') acc.miss[z] = (acc.miss[z] ?? 0) + 1;
    }
    return acc;
  };

  const quadCountsByType = buildQuadCountsByType();
  const zoneCountsByType = buildZoneCountsByType();

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

  const activeType = filter.types.length === 1 ? filter.types[0] : null;

  return (
    <div className="max-w-7xl mx-auto w-full px-4 md:px-6 lg:px-8 space-y-3 pb-4">
      {/* Header */}
      <header>
        <div className="flex items-center justify-between mb-1">
          <div className="text-[10px] font-semibold tracking-[3px] uppercase text-primary">
            {t.analysis_title}
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-[11px] text-muted-fg hover:text-fg"
          >
            ← Volver
          </button>
        </div>
        <div className="flex flex-col md:flex-row items-baseline gap-2">
          <h1 className="text-2xl md:text-3xl font-semibold leading-tight truncate">
            {match.home} <span className="text-muted-fg font-mono tabular">{match.hs}</span>
            <span className="text-muted-fg"> – </span>
            <span className="text-muted-fg font-mono tabular">{match.as}</span> {match.away}
          </h1>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {match.date && <span className="text-[11px] text-muted-fg">{match.date}</span>}
          {match.competition && <Badge tone="primary">{match.competition}</Badge>}
          {myTeam && (
            <Badge tone={myGoals > theirGoals ? 'goal' : myGoals === theirGoals ? 'warning' : 'danger'}>
              {myGoals > theirGoals ? 'Victoria' : myGoals === theirGoals ? 'Empate' : 'Derrota'}
            </Badge>
          )}
        </div>
      </header>

      {/* Team toggle + Period selector */}
      <div className="space-y-2">
        {myTeamSide ? (
          <div className="rounded-lg border border-border bg-surface p-1 flex gap-1">
            <TeamToggleBtn label="Ambos" active={teamToggle === 'all'} onClick={() => { setTeamToggle('all'); setFilter((f) => ({ ...f, team: null })); }} />
            <TeamToggleBtn
              label={`🏠 ${myTeam?.name ?? 'Mi equipo'}`}
              color={myTeamSide === 'home' ? match.homeColor : match.awayColor}
              active={teamToggle === 'mine'}
              onClick={() => { setTeamToggle('mine'); setFilter((f) => ({ ...f, team: null })); }}
            />
            <TeamToggleBtn
              label={`⚔️ ${myTeamSide === 'home' ? match.away : match.home}`}
              color={myTeamSide === 'home' ? match.awayColor : match.homeColor}
              active={teamToggle === 'rival'}
              onClick={() => { setTeamToggle('rival'); setFilter((f) => ({ ...f, team: null })); }}
            />
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-surface p-1 flex gap-1">
            <FilterTeamButton label={`${t.analysis_all_teams} (${periodEvents.length})`} active={filter.team === null} onClick={() => setFilter({ ...filter, team: null })} />
            <FilterTeamButton label={match.home} color={match.homeColor} active={filter.team === 'home'} onClick={() => setFilter((f) => toggleTeam(f, 'home'))} />
            <FilterTeamButton label={match.away} color={match.awayColor} active={filter.team === 'away'} onClick={() => setFilter((f) => toggleTeam(f, 'away'))} />
          </div>
        )}

        <div className="rounded-lg border border-border bg-surface p-1 flex gap-1">
          <PeriodBtn label="⏱ Partido" active={period === 'full'} onClick={() => setPeriod('full')} />
          <PeriodBtn label="1er tiempo" active={period === 'first'} onClick={() => setPeriod('first')} />
          <PeriodBtn label="2do tiempo" active={period === 'second'} onClick={() => setPeriod('second')} />
        </div>
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c, i) => (
            <button key={i} type="button" onClick={() => setFilter(c.remove(filter))}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-primary/40 bg-primary/15 text-[11px] font-medium text-primary hover:bg-primary/25 transition-colors">
              {c.label}
              <span className="opacity-60 hover:opacity-100 text-xs leading-none">✕</span>
            </button>
          ))}
          <button type="button" onClick={() => { setFilter(EMPTY_FILTER); setFueraMode(false); }}
            className="inline-flex items-center px-2.5 py-1 rounded-full border border-border bg-surface-2 text-[11px] text-muted-fg hover:text-fg">
            Limpiar todo
          </button>
        </div>
      )}

      {/* Summary card */}
      <Card className={cn(isEmptyFilter(filter) && !fueraMode ? '' : 'border-warning/40 bg-warning/5')}>
        <CardContent className="p-3">
          {/* Color legend */}
          <div className="flex flex-wrap gap-3 mb-3 text-[9px] text-muted-fg justify-center">
            {[
              { key: 'goal', label: 'Gol' },
              { key: 'saved', label: 'Atajada' },
              { key: 'post', label: 'Palo' },
              { key: 'miss_fault', label: 'Con Falta' },
              { key: 'miss', label: 'Errado' },
            ].map(({ key, label }) => (
              <span key={key} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: SHOT_TYPE_COLORS[key] }} />
                {label}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-2">
            <SummaryBigTab value={summary.shots} label={t.analysis_lanzam} color={SHOT_TYPE_COLORS.miss}
              active={filter.types.length === 0 && !fueraMode}
              onClick={() => { setFilter((f) => setTypeOnly(f, null)); setFueraMode(false); }} />
            <SummaryBigTab value={summary.goals} label={t.stats_goals} color={SHOT_TYPE_COLORS.goal}
              active={isTypeActive(filter, 'goal') && !fueraMode}
              onClick={() => { setFilter((f) => setTypeOnly(f, 'goal')); setFueraMode(false); }} />
            <SummaryBigTab value={`${summary.pct}%`} label={t.analysis_efect} color="#888"
              active={false} onClick={() => {}} readOnly />
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <SummaryTab value={summary.saved} label={t.analysis_atajadas} color={SHOT_TYPE_COLORS.saved}
              active={isTypeActive(filter, 'saved') && !fueraMode}
              onClick={() => { setFilter((f) => setTypeOnly(f, 'saved')); setFueraMode(false); }} />
            <SummaryTab value={summary.post} label={t.analysis_palos} color={SHOT_TYPE_COLORS.post}
              active={isTypeActive(filter, 'post') && !fueraMode}
              onClick={() => { setFilter((f) => setTypeOnly(f, 'post')); setFueraMode(false); }} />
            <SummaryTab value={summary.out} label={t.analysis_fuera} color={SHOT_TYPE_COLORS.miss_fault}
              active={fueraMode}
              onClick={() => {
                if (fueraMode) { setFueraMode(false); setFilter((f) => setTypeOnly(f, null)); }
                else { setFueraMode(true); setFilter((f) => setTypeOnly(f, 'miss')); }
              }} />
            <SummaryTab value={summary.miss - summary.out} label={t.analysis_errados} color={SHOT_TYPE_COLORS.miss}
              active={isTypeActive(filter, 'miss') && !fueraMode}
              onClick={() => { setFilter((f) => setTypeOnly(f, 'miss')); setFueraMode(false); }} />
          </div>
          <div className="text-[10px] text-muted-fg mt-2 text-center">
            {isEmptyFilter(filter) && !fueraMode
              ? `${periodEvents.length} ${t.analysis_event_total}`
              : `${summary.events} ${t.analysis_event_match}`}
          </div>
        </CardContent>
      </Card>

      {/* Arco */}
      <section>
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-medium text-fg">{t.analysis_arco}</h3>
          <span className="text-[10px] text-muted-fg">{t.analysis_arco_hint}</span>
        </div>
        <div className="max-w-sm md:max-w-md mx-auto">
          <GoalGrid
            counts={quadCounts}
            countsByType={quadCountsByType}
            shotColors={SHOT_TYPE_COLORS}
            activeType={activeType ?? (fueraMode ? 'miss_fault' : null)}
            selected={filter.quadrant}
            onSelect={(z) => {
              if (!z) { setFilter((f) => ({ ...f, quadrant: null })); return; }
              if (z === 'post' || z === 'out') return;
              setFilter((f) => toggleQuadrant(f, z as GoalQuadrantId));
            }}
          />
        </div>
      </section>

      {/* Cancha — lanzamientos */}
      <section>
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-medium text-fg">{t.analysis_court}</h3>
          <span className="text-[10px] text-muted-fg">{t.analysis_court_hint}</span>
        </div>
        <div className="max-w-sm md:max-w-md mx-auto">
          <CourtView
            heatmap={zoneCounts}
            countsByType={zoneCountsByType}
            shotColors={SHOT_TYPE_COLORS}
            activeType={activeType ?? (fueraMode ? 'miss_fault' : null)}
            selectedZone={filter.zone}
            onZoneSelect={(z) => {
              if (!z) { setFilter((f) => ({ ...f, zone: null })); return; }
              if (z === 'long_range') return;
              setFilter((f) => toggleZone(f, z as CourtZoneId));
            }}
          />
          {zoneCounts.long_range !== undefined && zoneCounts.long_range > 0 && (
            <button type="button" onClick={() => setFilter((f) => toggleZone(f, 'long_range'))}
              className={cn('mt-2 w-full h-10 rounded-md border text-xs font-medium transition-colors',
                filter.zone === 'long_range'
                  ? 'border-card/60 bg-card/20 text-card'
                  : 'border-card/30 bg-card/5 text-card/80 hover:bg-card/10')}>
              {t.live_arco_a_arco} ({zoneCounts.long_range})
            </button>
          )}
        </div>
      </section>

      {/* Pérdidas — court view */}
      <section>
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-medium text-fg">💔 Pérdidas por zona</h3>
          <span className="text-[10px] text-muted-fg">
            {periodEvents.filter((e) => e.type === 'turnover' && (!resolvedTeamFilter || e.team === resolvedTeamFilter)).length} pérdidas
          </span>
        </div>
        <div className="max-w-sm md:max-w-md mx-auto">
          <CourtView
            heatmap={turnoverZoneCounts}
            selectedZone={null}
            onZoneSelect={() => {}}
            turnoverMode
          />
        </div>
      </section>

      {/* Players */}
      <section>
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-medium text-fg">{t.analysis_players}</h3>
        </div>
        <PlayersPanel
          shooters={shooters}
          goalkeepers={goalkeepers}
          selectedKey={filter.shooterKey}
          home={match.home}
          away={match.away}
          homeColor={match.homeColor}
          awayColor={match.awayColor}
          onToggle={(key) => setFilter((f) => toggleShooter(f, key))}
        />
      </section>

      {/* Eventos filtrados */}
      <section>
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-medium text-fg">📋 Eventos</h3>
          <span className="text-[10px] text-muted-fg">{filtered.length}</span>
        </div>
        <Card>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <p className="text-center text-xs text-muted-fg py-6">No hay eventos con el filtro actual</p>
            ) : (
              <ul className="divide-y divide-border max-h-[320px] overflow-y-auto">
                {[...filtered].sort((a, b) => b.min - a.min).map((e) => {
                  const typeMeta = EVENT_TYPES[e.type];
                  const color = e.team === 'home' ? match.homeColor : match.awayColor;
                  return (
                    <li key={e.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                      <span className="font-mono tabular text-muted-fg w-8">{e.min}'</span>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="flex-1 min-w-0 truncate">
                        <span className="text-fg font-medium">{typeMeta.label}</span>
                        {e.shooter && <span className="text-muted-fg"> · {e.shooter.name} #{e.shooter.number}</span>}
                        {!e.shooter && e.sanctioned && <span className="text-muted-fg"> · {e.sanctioned.name} #{e.sanctioned.number}</span>}
                      </span>
                      {e.zone && <span className="text-[10px] text-muted-fg">{COURT_ZONES[e.zone].short}</span>}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Comparativa */}
      <section>
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-medium text-fg">⚔️ {t.analysis_compare}</h3>
          <span className="text-[10px] text-muted-fg">{t.analysis_no_filter}</span>
        </div>
        <Card>
          <CardContent className="p-3 space-y-2">
            <CompareBar label={t.stats_goals} mine={matchStats.homeGoals} theirs={matchStats.awayGoals} myColor={match.homeColor} theirColor={match.awayColor} tone="goal" />
            <CompareBar label={t.stats_shots} mine={matchStats.homeShots} theirs={matchStats.awayShots} myColor={match.homeColor} theirColor={match.awayColor} tone="neutral" />
            <CompareBar label={t.analysis_atajadas} mine={matchStats.homeGKSaved} theirs={matchStats.rivalGKSaved} myColor={match.homeColor} theirColor={match.awayColor} tone="neutral" />
            <CompareBar label={t.live_excl} mine={matchStats.homeExcl} theirs={matchStats.awayExcl} myColor={match.homeColor} theirColor={match.awayColor} tone="exclusion" />
            <CompareBar label={t.live_turnovers} mine={matchStats.homeTurnover} theirs={matchStats.awayTurnover} myColor={match.homeColor} theirColor={match.awayColor} tone="danger" />
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────

const FilterTeamButton = ({ label, color, active, onClick }: { label: string; color?: string; active: boolean; onClick: () => void }) => (
  <button type="button" onClick={onClick}
    className={cn('flex-1 h-9 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 truncate px-2',
      active ? 'bg-primary/15 border border-primary/40 text-primary' : 'text-muted-fg hover:text-fg')}>
    {color && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />}
    <span className="truncate">{label}</span>
  </button>
);

const TeamToggleBtn = ({ label, color, active, onClick }: { label: string; color?: string; active: boolean; onClick: () => void }) => (
  <button type="button" onClick={onClick}
    className={cn('flex-1 h-9 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 truncate px-2',
      active ? 'bg-primary/15 border border-primary/40 text-primary' : 'text-muted-fg hover:text-fg')}>
    {color && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />}
    <span className="truncate">{label}</span>
  </button>
);

const PeriodBtn = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
  <button type="button" onClick={onClick}
    className={cn('flex-1 h-8 text-[11px] font-medium rounded-md transition-colors px-2',
      active ? 'bg-primary/15 border border-primary/40 text-primary' : 'text-muted-fg hover:text-fg')}>
    {label}
  </button>
);

const isTypeActive = (f: MatchFilter, t: 'goal' | 'saved' | 'miss' | 'post'): boolean =>
  f.types.length === 1 && f.types[0] === t;

const SummaryBigTab = ({ value, label, color, active, onClick, readOnly = false }: {
  value: number | string; label: string; color: string; active: boolean; onClick: () => void; readOnly?: boolean;
}) => (
  <button type="button" onClick={onClick} disabled={readOnly}
    className={cn('flex flex-col items-center justify-center rounded-md border py-1.5 transition-colors',
      active ? 'border-primary bg-primary/15 ring-1 ring-primary/40'
        : readOnly ? 'border-border bg-surface-2/50 cursor-default'
        : 'border-border bg-surface-2/50 hover:bg-surface-2 hover:border-primary/40 active:scale-[0.98]')}>
    <span className="font-mono text-xl font-semibold tabular leading-none" style={{ color: active ? color : undefined }}>{value}</span>
    <span className="text-[8px] uppercase tracking-widest text-muted-fg mt-1">{label}</span>
  </button>
);

const SummaryTab = ({ value, label, color, active, onClick }: {
  value: number | string; label: string; color: string; active: boolean; onClick: () => void;
}) => (
  <button type="button" onClick={onClick}
    className={cn('flex flex-col items-center justify-center rounded-md border py-1.5 transition-colors',
      active ? 'border-primary bg-primary/15 ring-1 ring-primary/40'
        : 'border-border bg-surface-2/50 hover:bg-surface-2 hover:border-primary/40 active:scale-[0.98]')}>
    <span className="font-mono text-base font-semibold tabular leading-none" style={{ color: active ? color : undefined }}>{value}</span>
    <span className="text-[8px] uppercase tracking-widest text-muted-fg mt-1">{label}</span>
  </button>
);
