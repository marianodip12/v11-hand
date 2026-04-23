import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CourtView } from '@/components/handball/court-view';
import { GoalGrid } from '@/components/handball/goal-grid';
import { Badge } from '@/components/ui/badge';
import { computeScore } from '@/domain/events';
import {
  EMPTY_DRAFT,
  buildEvent,
  rosterKindFor,
  splitRoster,
  type EventDraft,
} from '@/domain/live';
import { EVENT_TYPES } from '@/domain/constants';
import type {
  CourtZoneId,
  EventType,
  GoalZoneId,
  PersonRef,
  Team,
} from '@/domain/types';
import { useMatchStore } from '@/lib/store';
import { cn } from '@/lib/cn';
import { Scoreboard } from './scoreboard';
import { PlayerPicker, type PickerKind } from './player-picker';
import { LiveStats } from './live-stats';
import { EventTimeline } from './event-timeline';

type Mode = 'quick' | 'full';

// Context for an in-progress player picker (shooter → maybe GK → commit).
interface PendingShot {
  type: 'goal' | 'miss' | 'saved' | 'post';
  draft: EventDraft;
  // Step of the picker flow: pick shooter first, then (for some shots) GK.
  step: 'shooter' | 'goalkeeper';
  shooterPicked?: PersonRef | null;
}

// Context for a non-shot event that needs a player (sanction, turnover).
interface PendingTagged {
  type: Exclude<EventType, 'goal' | 'miss' | 'saved' | 'post' | 'timeout' | 'half_time'>;
  team: Team;
}

export const LiveMatchPage = () => {
  const navigate = useNavigate();

  const status      = useMatchStore((s) => s.status);
  const match       = useMatchStore((s) => s.liveMatch);
  const events      = useMatchStore((s) => s.liveEvents);
  const clock       = useMatchStore((s) => s.liveClock);
  const setClock    = useMatchStore((s) => s.setLiveClock);
  const addEvent    = useMatchStore((s) => s.addLiveEvent);
  const removeEvent = useMatchStore((s) => s.removeLiveEvent);
  const finishLive  = useMatchStore((s) => s.finishLive);
  const closeLive   = useMatchStore((s) => s.closeLive);
  const teams       = useMatchStore((s) => s.teams);

  const [mode, setMode] = useState<Mode>('full');
  const [attacker, setAttacker] = useState<Team>('home');
  const [draft, setDraft] = useState<EventDraft>(EMPTY_DRAFT);
  const [pendingShot, setPendingShot] = useState<PendingShot | null>(null);
  const [pendingTagged, setPendingTagged] = useState<PendingTagged | null>(null);

  // Bail out if no live match exists (e.g. user navigated directly)
  if (status !== 'live' || !match.home) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">En vivo</h1>
          <p className="text-xs text-muted-fg mt-1">No hay ningún partido en curso.</p>
        </header>
        <div className="rounded-lg border border-dashed border-border bg-surface p-6 text-center">
          <p className="text-sm text-muted-fg mb-3">
            Empezá un partido desde la pantalla de Partidos.
          </p>
          <Button onClick={() => navigate('/')}>Ir a Partidos</Button>
        </div>
      </div>
    );
  }

  const score = computeScore(events);

  // When the attacker changes, reset the draft so zones don't carry over.
  const setAttackerAndReset = (t: Team) => {
    setAttacker(t);
    setDraft({ ...EMPTY_DRAFT, team: t });
  };

  // Handlers for the zone selectors. Keep draft.team in sync with current attacker.
  const handleGoalZone = (z: GoalZoneId | null) =>
    setDraft((d) => ({ ...d, team: attacker, goalZone: z }));

  const handleCourtZone = (z: CourtZoneId | null) =>
    setDraft((d) => ({ ...d, team: attacker, courtZone: z }));

  // ─── Main CTA: commit a shot ─────────────────────────────────────────
  const handleShotCta = (type: 'goal' | 'miss' | 'saved' | 'post') => {
    // In quick mode, skip the picker and commit immediately.
    if (mode === 'quick') {
      addEvent(buildEvent({
        type,
        draft: { ...draft, team: attacker },
        clock,
        quickMode: true,
      }));
      setDraft({ ...EMPTY_DRAFT, team: attacker });
      return;
    }

    // In full mode, open the shooter picker.
    setPendingShot({
      type,
      draft: { ...draft, team: attacker },
      step: 'shooter',
    });
  };

  // ─── Non-shot CTAs ───────────────────────────────────────────────────
  const handleNonShotCta = (type: EventType, team: Team) => {
    const kind = rosterKindFor(type);
    if (kind === 'none' || mode === 'quick') {
      // Commit right away
      addEvent(buildEvent({
        type,
        draft: { ...EMPTY_DRAFT, team },
        clock,
        quickMode: mode === 'quick',
      }));
      return;
    }
    // Open picker for the involved player
    setPendingTagged({
      type: type as PendingTagged['type'],
      team,
    });
  };

  // ─── Pending shot flow ───────────────────────────────────────────────
  //
  // Step 1: pick shooter (from attacker's roster, field players only).
  // Step 2 (only for goal/saved): pick GK from opposing team's roster.
  //         For miss/post we skip GK since there was no save attempt.
  const handleShotShooterPicked = (shooter: PersonRef | null) => {
    if (!pendingShot) return;
    const { type, draft: d } = pendingShot;
    const needsGK = type === 'goal' || type === 'saved';

    if (!needsGK) {
      addEvent(buildEvent({
        type,
        draft: { ...d, shooter },
        clock,
        quickMode: false,
      }));
      setPendingShot(null);
      setDraft({ ...EMPTY_DRAFT, team: attacker });
      return;
    }
    setPendingShot({ ...pendingShot, step: 'goalkeeper', shooterPicked: shooter });
  };

  const handleShotGkPicked = (gk: PersonRef | null) => {
    if (!pendingShot) return;
    const { type, draft: d, shooterPicked } = pendingShot;
    addEvent(buildEvent({
      type,
      draft: { ...d, shooter: shooterPicked ?? null, goalkeeper: gk },
      clock,
      quickMode: false,
    }));
    setPendingShot(null);
    setDraft({ ...EMPTY_DRAFT, team: attacker });
  };

  // ─── Pending non-shot flow ──────────────────────────────────────────
  const handleTaggedPicked = (p: PersonRef | null) => {
    if (!pendingTagged) return;
    const { type, team } = pendingTagged;
    const kind = rosterKindFor(type);

    addEvent(buildEvent({
      type,
      draft: {
        ...EMPTY_DRAFT,
        team,
        // Store under the right field based on the event kind.
        shooter: kind === 'possession' ? p : null,
      },
      clock,
      quickMode: false,
      sanctioned: kind === 'sanctioned' ? p : null,
    }));
    setPendingTagged(null);
  };

  // ─── Roster for the current picker step ─────────────────────────────
  const pickerContext = useMemo(() => {
    if (pendingShot) {
      const { step, draft: d } = pendingShot;
      const { type } = pendingShot;
      // Shooter comes from attacker's team roster (field players only).
      // GK comes from the OPPOSING team's roster (GKs only).
      if (step === 'shooter') {
        const teamObj = teams.find((t) => t.name === (d.team === 'home' ? match.home : match.away));
        const players = teamObj?.players ?? [];
        const { fieldPlayers } = splitRoster(players);
        return {
          open: true,
          kind: 'shooter' as PickerKind,
          players: fieldPlayers,
          teamColor: d.team === 'home' ? match.homeColor : match.awayColor,
          teamName: d.team === 'home' ? match.home : match.away,
          onPick: handleShotShooterPicked,
          title: `${EVENT_TYPES[type].label} · ¿Quién tiró?`,
        };
      }
      // step === 'goalkeeper' → opposing team
      const oppName = d.team === 'home' ? match.away : match.home;
      const oppColor = d.team === 'home' ? match.awayColor : match.homeColor;
      const teamObj = teams.find((t) => t.name === oppName);
      const players = teamObj?.players ?? [];
      const { goalkeepers } = splitRoster(players);
      return {
        open: true,
        kind: 'goalkeeper' as PickerKind,
        players: goalkeepers,
        teamColor: oppColor,
        teamName: oppName,
        onPick: handleShotGkPicked,
        title: '¿Qué arquero?',
      };
    }

    if (pendingTagged) {
      const { team } = pendingTagged;
      const teamObj = teams.find((t) => t.name === (team === 'home' ? match.home : match.away));
      const players = teamObj?.players ?? [];
      return {
        open: true,
        kind: 'sanctioned' as PickerKind,
        players,
        teamColor: team === 'home' ? match.homeColor : match.awayColor,
        teamName: team === 'home' ? match.home : match.away,
        onPick: handleTaggedPicked,
        title: '',
      };
    }

    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingShot, pendingTagged, teams, match]);

  // ─── Finish match ──────────────────────────────────────────────────
  const handleFinish = () => {
    if (window.confirm('¿Finalizar el partido y guardarlo?')) {
      finishLive();
      navigate('/');
    }
  };
  const handleDiscard = () => {
    if (window.confirm('¿Descartar el partido en curso? No se podrá recuperar.')) {
      closeLive();
      navigate('/');
    }
  };

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-3 pb-4">
      <Scoreboard
        home={match.home}
        away={match.away}
        homeColor={match.homeColor}
        awayColor={match.awayColor}
        homeScore={score.h}
        awayScore={score.a}
        clock={clock}
        onClockChange={setClock}
      />

      {/* Mode toggle + attacker toggle */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-surface p-1 flex">
          {(['full', 'quick'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'flex-1 h-8 text-xs font-medium rounded-md transition-colors',
                mode === m ? 'bg-primary/20 text-primary' : 'text-muted-fg hover:text-fg',
              )}
            >
              {m === 'full' ? 'Completo' : 'Rápido'}
            </button>
          ))}
        </div>
        <div className="rounded-lg border border-border bg-surface p-1 flex">
          {(['home', 'away'] as const).map((t) => {
            const active = attacker === t;
            const label = t === 'home' ? match.home : match.away;
            const color = t === 'home' ? match.homeColor : match.awayColor;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setAttackerAndReset(t)}
                className={cn(
                  'flex-1 h-8 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 truncate px-2',
                  active ? 'bg-surface-2 text-fg' : 'text-muted-fg',
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-[10px] text-muted-fg">
        {mode === 'full'
          ? 'Modo completo: taggeá arco → cancha → jugador por cada tiro.'
          : 'Modo rápido: un toque para registrar sin tagueo.'}
      </div>

      {/* Step 1: arco */}
      <section>
        <div className="flex items-center gap-2 mb-1.5">
          <StepNumber n={1} />
          <h3 className="text-xs font-medium text-fg">¿A qué cuadrante fue?</h3>
          {draft.goalZone && (
            <Badge tone="primary">{draft.goalZone}</Badge>
          )}
        </div>
        <GoalGrid
          selected={draft.goalZone}
          onSelect={handleGoalZone}
        />
        <div className="grid grid-cols-3 gap-1.5 mt-2">
          <GoalExtraButton
            label="Fuera"
            active={draft.goalZone === 'out'}
            tone="neutral"
            onClick={() => handleGoalZone(draft.goalZone === 'out' ? null : 'out')}
          />
          <GoalExtraButton
            label="Palo"
            active={draft.goalZone === 'post'}
            tone="warning"
            onClick={() => handleGoalZone(draft.goalZone === 'post' ? null : 'post')}
          />
          <GoalExtraButton
            label="Arco-Arco"
            active={draft.goalZone === 'long_range'}
            tone="card"
            onClick={() => handleGoalZone(draft.goalZone === 'long_range' ? null : 'long_range')}
          />
        </div>
      </section>

      {/* Step 2: cancha */}
      <section>
        <div className="flex items-center gap-2 mb-1.5">
          <StepNumber n={2} />
          <h3 className="text-xs font-medium text-fg">¿Desde dónde tiró?</h3>
          {draft.courtZone && (
            <Badge tone="primary">{draft.courtZone}</Badge>
          )}
        </div>
        <CourtView
          selectedZone={draft.courtZone}
          onZoneSelect={handleCourtZone}
        />
      </section>

      {/* Shot CTAs */}
      <section className="grid grid-cols-2 gap-2">
        <Button
          variant="success"
          onClick={() => handleShotCta('goal')}
          className="h-12 text-base"
        >
          Gol
        </Button>
        <Button
          onClick={() => handleShotCta('saved')}
          className="h-12 text-base bg-save hover:bg-save/90"
        >
          Atajada
        </Button>
      </section>

      <section className="grid grid-cols-4 gap-1.5">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleShotCta('miss')}
          className="h-10 text-xs"
        >
          Errado
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleShotCta('post')}
          className="h-10 text-xs text-warning"
        >
          Palo
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleNonShotCta('turnover', attacker)}
          className="h-10 text-xs"
        >
          Pérdida
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => handleNonShotCta('exclusion', attacker)}
          className="h-10 text-xs text-exclusion"
        >
          2'
        </Button>
      </section>

      <section className="grid grid-cols-4 gap-1.5">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleNonShotCta('yellow_card', attacker)}
          className="h-9 text-xs text-warning"
        >
          Amarilla
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleNonShotCta('blue_card', attacker)}
          className="h-9 text-xs text-primary"
        >
          Azul
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleNonShotCta('red_card', attacker)}
          className="h-9 text-xs text-danger"
        >
          Roja
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleNonShotCta('timeout', attacker)}
          className="h-9 text-xs"
        >
          T. muerto
        </Button>
      </section>

      {/* Live stats */}
      <LiveStats
        events={events}
        homeColor={match.homeColor}
        awayColor={match.awayColor}
      />

      {/* Timeline */}
      <EventTimeline
        events={events}
        homeColor={match.homeColor}
        awayColor={match.awayColor}
        onDelete={removeEvent}
      />

      {/* End-of-match actions */}
      <section className="flex gap-2 pt-2">
        <Button
          variant="danger"
          size="sm"
          onClick={handleDiscard}
          className="flex-1"
        >
          Descartar
        </Button>
        <Button
          onClick={handleFinish}
          className="flex-[2]"
        >
          Finalizar partido
        </Button>
      </section>

      {/* Player pickers */}
      {pickerContext && (
        <PlayerPicker
          open={pickerContext.open}
          onClose={() => {
            setPendingShot(null);
            setPendingTagged(null);
          }}
          onPick={pickerContext.onPick}
          players={pickerContext.players}
          teamColor={pickerContext.teamColor}
          teamName={pickerContext.teamName}
          kind={pickerContext.kind}
        />
      )}
    </div>
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────

const StepNumber = ({ n }: { n: number }) => (
  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-fg text-[11px] font-semibold">
    {n}
  </span>
);

const GoalExtraButton = ({
  label,
  active,
  tone,
  onClick,
}: {
  label: string;
  active: boolean;
  tone: 'neutral' | 'warning' | 'card';
  onClick: () => void;
}) => {
  const base = 'h-9 text-xs font-medium rounded-md border transition-colors duration-fast touch-target';
  const tones = {
    neutral: active ? 'border-fg/40 bg-surface-2 text-fg' : 'border-border bg-surface-2/50 text-muted-fg hover:text-fg',
    warning: active ? 'border-warning/60 bg-warning/20 text-warning' : 'border-warning/30 bg-warning/5 text-warning/80 hover:bg-warning/10',
    card:    active ? 'border-card/60 bg-card/20 text-card' : 'border-card/30 bg-card/5 text-card/80 hover:bg-card/10',
  };
  return (
    <button type="button" onClick={onClick} className={cn(base, tones[tone])}>
      {label}
    </button>
  );
};
