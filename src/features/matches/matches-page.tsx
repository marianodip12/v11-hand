import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/feedback';
import { MaxWidthContainer, ResponsiveGrid, Stack } from '@/components/ui/responsive-grid';
import { computeScore } from '@/domain/events';
import { selectHomeTeam, useMatchStore } from '@/lib/store';
import { LiveBanner, MatchCard } from './match-cards';
import { NewMatchDialog, type NewMatchValues } from './new-match-dialog';
import { SeasonSummary } from './season-summary';

export const MatchesPage = () => {
  const navigate = useNavigate();
  const [showNewMatch, setShowNewMatch] = useState(false);

  const teams       = useMatchStore((s) => s.teams);
  const homeTeam    = useMatchStore(selectHomeTeam);
  const status      = useMatchStore((s) => s.status);
  const liveMatch   = useMatchStore((s) => s.liveMatch);
  const liveEvents  = useMatchStore((s) => s.liveEvents);
  const completed   = useMatchStore((s) => s.completed);
  const startLive   = useMatchStore((s) => s.startLive);
  const removeCompleted = useMatchStore((s) => s.removeCompleted);

  const myTeamName = homeTeam?.name ?? 'Mi equipo';
  const liveScore = useMemo(() => computeScore(liveEvents), [liveEvents]);
  const seasonYear = new Date().getFullYear();

  const handleStartMatch = (v: NewMatchValues) => {
    const team = teams.find((t) => t.id === v.teamId);
    if (!team) return;
    startLive({
      home: team.name,
      away: v.awayName,
      homeColor: team.color,
      awayColor: '#64748B', // rivals default to neutral gray; can be edited later
      competition: v.competition,
      round: v.round || null,
      date: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
    });
    setShowNewMatch(false);
    navigate('/live');
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Eliminar este partido?')) removeCompleted(id);
  };

  return (
    <MaxWidthContainer>
      <Stack gap="lg" className="pb-4">
        <header className="flex items-start justify-between flex-col md:flex-row md:gap-4">
          <div>
            <div className="text-[10px] font-semibold tracking-[3px] uppercase text-primary mb-1">
              Handball Pro
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold leading-tight">🤾 Partidos</h1>
            <p className="text-xs text-muted-fg mt-1">Temporada {seasonYear}</p>
          </div>
          {status === 'idle' && (
            teams.length === 0 ? (
              <Button size="sm" variant="secondary" onClick={() => navigate('/teams')}>
                Cargar equipo
              </Button>
            ) : (
              <Button size="sm" onClick={() => setShowNewMatch(true)}>
                <PlusIcon /> Nuevo
              </Button>
            )
          )}
        </header>

      {completed.length > 0 && (
        <SeasonSummary
          completedMatches={completed}
          myTeamName={myTeamName}
        />
      )}

      {status === 'live' && (
        <LiveBanner
          home={liveMatch.home}
          away={liveMatch.away}
          homeScore={liveScore.h}
          awayScore={liveScore.a}
          onResume={() => navigate('/live')}
        />
      )}

      {status === 'idle' && completed.length === 0 && (
        teams.length === 0 ? (
          <EmptyState
            icon={<BallIcon />}
            title="Primero cargá tu equipo"
            description="Para registrar partidos necesitás tener al menos un equipo. Creá el tuyo en la pantalla de Equipos."
            action={
              <Button onClick={() => navigate('/teams')}>
                Ir a Equipos
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<BallIcon />}
            title="Sin partidos aún"
            description="Empezá registrando tu primer partido. Los datos se sincronizan con Supabase automáticamente."
            action={
              <Button onClick={() => setShowNewMatch(true)}>
                <PlusIcon /> Nuevo partido
              </Button>
            }
          />
        )
      )}

      {completed.length > 0 && (
        <section>
          <div className="text-[10px] font-semibold tracking-[2px] uppercase text-muted-fg mb-3">
            Historial
          </div>
          <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 2 }} gap="md">
            {completed.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                myTeamName={myTeamName}
                onAnalyze={() => navigate(`/analysis/${m.id}`)}
                onViewEvolution={() => navigate(`/evolution?match=${m.id}`)}
                onReopen={() => {
                  // In a later milestone this will re-open the match for editing.
                  // For now, just navigate to /live as a stub.
                  navigate('/live');
                }}
                onDelete={() => handleDelete(m.id)}
              />
            ))}
          </ResponsiveGrid>
        </section>
      )}

      <NewMatchDialog
        open={showNewMatch}
        onClose={() => setShowNewMatch(false)}
        teams={teams}
        onStart={handleStartMatch}
      />
      </Stack>
    </MaxWidthContainer>
  );
};

// ─── Inline icons (no emoji per design system) ────────────────────────
const PlusIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const BallIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4" />
  </svg>
);
