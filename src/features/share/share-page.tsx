/**
 * Página pública para ver un match compartido vía link.
 * No requiere autenticación.
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CourtView } from '@/components/handball/court-view';
import { GoalGrid } from '@/components/handball/goal-grid';
import { computeMatchStats } from '@/domain/stats';
import type { CourtZoneId, GoalQuadrantId, HandballEvent, MatchSummary } from '@/domain/types';
import { GOAL_QUADRANTS } from '@/domain/constants';
import { loadSharedMatch } from '@/lib/share';

const SHOT_TYPE_COLORS: Record<string, string> = {
  goal:       '#22c55e',
  saved:      '#3b82f6',
  post:       '#f59e0b',
  miss_fault: '#a855f7',
  miss:       '#ef4444',
};

export const SharePage = () => {
  const { token } = useParams<{ token: string }>();
  const [match, setMatch] = useState<MatchSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState<'all' | 'home' | 'away'>('all');

  useEffect(() => {
    if (!token) {
      setError('No hay token en la URL');
      setLoading(false);
      return;
    }

    loadSharedMatch(token)
      .then((data) => {
        if (!data) {
          setError('No se encontró el partido o el link expiró.');
        } else {
          setMatch(data.match);
        }
      })
      .catch(() => setError('Error al cargar el partido.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-fg flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="animate-pulse text-muted-fg">Cargando partido…</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-bg text-fg flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-3">
            <div className="text-2xl">😕</div>
            <p className="text-sm text-muted-fg">{error ?? 'Partido no encontrado.'}</p>
            <Link to="/" className="inline-block text-sm text-primary hover:underline">
              Ir a Handball Pro
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filtrar eventos por equipo
  const filteredEvents = teamFilter === 'all'
    ? match.events
    : match.events.filter((e) => e.team === teamFilter);

  const stats = computeMatchStats(match.events);

  // Quadrants y zones por tipo
  const quadCountsByType = buildQuadCountsByType(filteredEvents);
  const zoneCountsByType = buildZoneCountsByType(filteredEvents);

  return (
    <div className="min-h-screen bg-bg text-fg">
      {/* Header */}
      <header className="border-b border-border bg-surface/60 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary grid place-items-center text-[10px] font-semibold text-primary-fg">HP</div>
            <span className="text-sm font-semibold">Handball Pro</span>
            <span className="text-[9px] px-1.5 py-[1px] rounded bg-primary/15 border border-primary/30 text-primary font-semibold tracking-wider">v11</span>
          </Link>
          <Badge tone="primary">📊 Análisis compartido</Badge>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        {/* Match header */}
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="text-[10px] font-semibold tracking-[3px] uppercase text-primary">
              Resultado final
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-semibold leading-tight">
                <span style={{ color: match.homeColor }}>{match.home}</span>
                <span className="text-muted-fg font-mono tabular ml-2">{match.hs}</span>
                <span className="text-muted-fg mx-2">–</span>
                <span className="text-muted-fg font-mono tabular">{match.as}</span>
                <span style={{ color: match.awayColor }} className="ml-2">{match.away}</span>
              </h1>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              {match.date && <Badge tone="neutral">{match.date}</Badge>}
              {match.competition && <Badge tone="primary">{match.competition}</Badge>}
              <Badge tone="neutral">{match.events.length} eventos</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Team filter */}
        <div className="rounded-lg border border-border bg-surface p-1 flex gap-1">
          <FilterBtn label={`Ambos (${match.events.length})`} active={teamFilter === 'all'} onClick={() => setTeamFilter('all')} />
          <FilterBtn label={match.home} color={match.homeColor} active={teamFilter === 'home'} onClick={() => setTeamFilter('home')} />
          <FilterBtn label={match.away} color={match.awayColor} active={teamFilter === 'away'} onClick={() => setTeamFilter('away')} />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Goles"
            value={teamFilter === 'home' ? stats.homeGoals : teamFilter === 'away' ? stats.awayGoals : stats.homeGoals + stats.awayGoals}
            color={SHOT_TYPE_COLORS.goal}
          />
          <StatCard
            label="Tiros"
            value={teamFilter === 'home' ? stats.homeShots : teamFilter === 'away' ? stats.awayShots : stats.homeShots + stats.awayShots}
            color={SHOT_TYPE_COLORS.miss}
          />
          <StatCard
            label="Atajadas recibidas"
            value={teamFilter === 'home' ? stats.homeSaved : teamFilter === 'away' ? stats.awaySaved : stats.homeSaved + stats.awaySaved}
            color={SHOT_TYPE_COLORS.saved}
          />
          <StatCard
            label="Pérdidas"
            value={teamFilter === 'home' ? stats.homeTurnover : teamFilter === 'away' ? stats.awayTurnover : stats.homeTurnover + stats.awayTurnover}
            color="#a855f7"
          />
        </div>

        {/* Cancha */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold mb-3">Lanzamientos por zona</h2>
            <div className="aspect-[3/2] w-full max-w-2xl mx-auto">
              <CourtView
                onZoneSelect={() => {}}
                countsByType={zoneCountsByType}
                shotColors={SHOT_TYPE_COLORS}
              />
            </div>
            <Legend />
          </CardContent>
        </Card>

        {/* Arco */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold mb-3">Lanzamientos al arco</h2>
            <div className="aspect-[3/2] w-full max-w-md mx-auto">
              <GoalGrid
                onSelect={() => {}}
                countsByType={quadCountsByType}
                shotColors={SHOT_TYPE_COLORS}
              />
            </div>
            <Legend />
          </CardContent>
        </Card>

        {/* Footer */}
        <Card>
          <CardContent className="p-4 text-center text-xs text-muted-fg">
            Análisis generado con <Link to="/" className="text-primary hover:underline">Handball Pro v11</Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

// ============================================================================
// HELPERS
// ============================================================================
function buildQuadCountsByType(events: HandballEvent[]): Record<string, Partial<Record<GoalQuadrantId, number>>> {
  const acc: Record<string, Partial<Record<GoalQuadrantId, number>>> = {
    goal: {}, saved: {}, post: {}, miss_fault: {}, miss: {},
  };
  for (const e of events) {
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
}

function buildZoneCountsByType(events: HandballEvent[]): Record<string, Partial<Record<CourtZoneId, number>>> {
  const acc: Record<string, Partial<Record<CourtZoneId, number>>> = {
    goal: {}, saved: {}, post: {}, miss_fault: {}, miss: {},
  };
  for (const e of events) {
    if (!e.zone) continue;
    const z = e.zone;
    if (e.type === 'goal') acc.goal[z] = (acc.goal[z] ?? 0) + 1;
    else if (e.type === 'saved') acc.saved[z] = (acc.saved[z] ?? 0) + 1;
    else if (e.type === 'post') acc.post[z] = (acc.post[z] ?? 0) + 1;
    else if (e.type === 'miss' && e.goalZone === 'out') acc.miss_fault[z] = (acc.miss_fault[z] ?? 0) + 1;
    else if (e.type === 'miss') acc.miss[z] = (acc.miss[z] ?? 0) + 1;
  }
  return acc;
}

const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <Card>
    <CardContent className="p-3 text-center">
      <div className="text-2xl font-bold tabular" style={{ color }}>{value}</div>
      <div className="text-[10px] text-muted-fg uppercase tracking-wider mt-1">{label}</div>
    </CardContent>
  </Card>
);

const FilterBtn = ({ label, color, active, onClick }: {
  label: string; color?: string; active: boolean; onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
      active
        ? 'bg-primary/15 text-primary border border-primary/40'
        : 'text-muted-fg hover:text-fg'
    }`}
  >
    {color && <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />}
    <span className="truncate">{label}</span>
  </button>
);

const Legend = () => (
  <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-muted-fg justify-center">
    {[
      { key: 'goal', label: 'Gol' },
      { key: 'saved', label: 'Atajada' },
      { key: 'post', label: 'Palo' },
      { key: 'miss_fault', label: 'Con Falta' },
      { key: 'miss', label: 'Errado' },
    ].map(({ key, label }) => (
      <span key={key} className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full inline-block" style={{ background: SHOT_TYPE_COLORS[key] }} />
        {label}
      </span>
    ))}
  </div>
);
