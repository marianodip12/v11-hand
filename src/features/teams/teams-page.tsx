import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/feedback';
import { MaxWidthContainer, Stack } from '@/components/ui/responsive-grid';
import { sortedPlayers } from '@/domain/teams';
import type { HandballTeam, Player } from '@/domain/types';
import { selectHomeTeam, useMatchStore } from '@/lib/store';
import { cn } from '@/lib/cn';
import { TeamDialog } from './team-dialog';
import { PlayerDialog } from './player-dialog';

export const TeamsPage = () => {
  const teams        = useMatchStore((s) => s.teams);
  const myTeam       = useMatchStore(selectHomeTeam);
  const selectedId   = useMatchStore((s) => s.selectedTeamId);
  const selectTeam   = useMatchStore((s) => s.selectTeam);
  const upsertTeam   = useMatchStore((s) => s.upsertTeam);
  const removeTeam   = useMatchStore((s) => s.removeTeam);
  const upsertPlayer = useMatchStore((s) => s.upsertPlayer);
  const removePlayer = useMatchStore((s) => s.removePlayer);

  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<HandballTeam | null>(null);

  const [playerDialogOpen, setPlayerDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const players = useMemo(
    () => sortedPlayers(myTeam?.players ?? []),
    [myTeam],
  );

  const openCreateTeam = () => {
    setEditingTeam(null);
    setTeamDialogOpen(true);
  };
  const openEditTeam = (team: HandballTeam) => {
    setEditingTeam(team);
    setTeamDialogOpen(true);
  };
  const handleSaveTeam = (team: HandballTeam) => {
    upsertTeam(team);
    setTeamDialogOpen(false);
  };
  const handleDeleteTeam = (team: HandballTeam) => {
    const msg =
      team.players.length > 0
        ? `¿Eliminar ${team.name}? Se borrarán también sus ${team.players.length} jugador${team.players.length === 1 ? '' : 'es'}.`
        : `¿Eliminar ${team.name}?`;
    if (window.confirm(msg)) removeTeam(team.id);
  };

  const openCreatePlayer = () => {
    setEditingPlayer(null);
    setPlayerDialogOpen(true);
  };
  const openEditPlayer = (p: Player) => {
    setEditingPlayer(p);
    setPlayerDialogOpen(true);
  };
  const handleSavePlayer = (p: Player) => {
    if (!myTeam) return;
    upsertPlayer(myTeam.id, p);
    setPlayerDialogOpen(false);
  };
  const handleDeletePlayer = (p: Player) => {
    if (!myTeam) return;
    if (window.confirm(`¿Eliminar a ${p.name}?`)) removePlayer(myTeam.id, p.id);
  };

  return (
    <MaxWidthContainer>
      <Stack gap="lg" className="pb-4">
        <header className="flex items-start justify-between flex-col md:flex-row md:gap-4">
          <div>
            <div className="text-[10px] font-semibold tracking-[3px] uppercase text-primary mb-1">
              Handball Pro
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold leading-tight">👥 Equipos</h1>
            <p className="text-xs text-muted-fg mt-1">
            {teams.length === 0
              ? 'Creá tu primer equipo para empezar'
              : `${teams.length} ${teams.length === 1 ? 'equipo' : 'equipos'}`}
          </p>
        </div>
        <Button size="sm" onClick={openCreateTeam}>
          <PlusIcon /> Nuevo
        </Button>
      </header>

      {teams.length === 0 ? (
        <EmptyState
          icon={<TeamIcon />}
          title="Sin equipos cargados"
          description="Necesitás al menos un equipo para registrar partidos. Te lleva menos de un minuto."
          action={
            <Button onClick={openCreateTeam}>
              <PlusIcon /> Crear mi primer equipo
            </Button>
          }
        />
      ) : (
        <>
          {/* Team switcher — horizontal scroll */}
          <div className="-mx-4 px-4 overflow-x-auto">
            <div className="flex gap-2 pb-1">
              {teams.map((t) => {
                const active = t.id === selectedId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTeam(t.id)}
                    className={cn(
                      'inline-flex items-center gap-2 px-3 h-10 rounded-md border text-sm font-medium whitespace-nowrap flex-shrink-0',
                      'transition-colors duration-fast',
                      active
                        ? 'border-primary/60 bg-primary/15 text-primary'
                        : 'border-border bg-surface-2 text-muted-fg hover:text-fg',
                    )}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                    {t.name}
                    <span className="text-[10px] text-muted-fg tabular">
                      {t.players.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Team detail */}
          {myTeam && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-10 h-10 rounded-full border-2 border-fg/10 flex-shrink-0"
                      style={{ background: myTeam.color }}
                    />
                    <div className="min-w-0">
                      <h2 className="text-base font-medium truncate">{myTeam.name}</h2>
                      <p className="text-xs text-muted-fg">
                        {myTeam.players.length === 0
                          ? 'Sin jugadores'
                          : `${myTeam.players.length} jugador${myTeam.players.length === 1 ? '' : 'es'}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditTeam(myTeam)}
                      aria-label="Editar equipo"
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteTeam(myTeam)}
                      className="text-danger hover:bg-danger/10"
                      aria-label="Eliminar equipo"
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                </div>

                {/* Players */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
                    Plantel
                  </h3>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={openCreatePlayer}
                    className="h-8 px-2.5 text-xs"
                  >
                    <PlusIcon /> Jugador
                  </Button>
                </div>

                {players.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border bg-surface-2/30 py-8 text-center">
                    <p className="text-sm text-muted-fg">Sin jugadores cargados</p>
                    <button
                      type="button"
                      onClick={openCreatePlayer}
                      className="mt-2 text-xs text-primary hover:underline"
                    >
                      Agregar el primero
                    </button>
                  </div>
                ) : (
                  <ul className="divide-y divide-border rounded-md border border-border overflow-hidden">
                    {players.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center gap-3 px-3 py-2.5 bg-surface-2/30"
                      >
                        <span
                          className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm font-bold tabular flex-shrink-0"
                          style={{ background: `${myTeam.color}22`, color: myTeam.color }}
                        >
                          {p.number}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-fg truncate">
                            {p.name}
                          </div>
                          <div className="text-[11px] text-muted-fg">{p.position}</div>
                        </div>
                        <div className="flex gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditPlayer(p)}
                            aria-label={`Editar ${p.name}`}
                            className="h-8 w-8"
                          >
                            <PencilIcon />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeletePlayer(p)}
                            aria-label={`Eliminar ${p.name}`}
                            className="h-8 w-8 text-danger hover:bg-danger/10"
                          >
                            <TrashIcon />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {teams.length > 0 && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Badge tone="primary">Info</Badge>
              <span className="text-sm text-fg">Tu equipo principal</span>
            </div>
            <p className="text-xs text-muted-fg">
              El equipo seleccionado es con el que se comparan las estadísticas de temporada y
              el que se registra como "local" en los partidos nuevos.
            </p>
          </CardContent>
        </Card>
      )}

      <TeamDialog
        open={teamDialogOpen}
        onClose={() => setTeamDialogOpen(false)}
        allTeams={teams}
        editingTeam={editingTeam}
        onSave={handleSaveTeam}
      />
      <PlayerDialog
        open={playerDialogOpen}
        onClose={() => setPlayerDialogOpen(false)}
        allPlayers={myTeam?.players ?? []}
        editingPlayer={editingPlayer}
        onSave={handleSavePlayer}
      />
      </Stack>
    </MaxWidthContainer>
  );
};

// ─── Inline icons ─────────────────────────────────────────────────────
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3l4 4L7 21H3v-4z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);

const TeamIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="8" r="3" />
    <circle cx="17" cy="10" r="2.5" />
    <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5M15 20c0-2 1.5-3.5 4-3.5" />
  </svg>
);
