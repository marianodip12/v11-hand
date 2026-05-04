import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CourtView } from '@/components/handball/court-view';
import { GoalGrid } from '@/components/handball/goal-grid';
import { computeScore } from '@/domain/events';
import {
  EMPTY_DRAFT,
  buildEvent,
  rosterKindFor,
  splitRoster,
  type EventDraft,
} from '@/domain/live';
import type {
  CourtZoneId,
  EventType,
  GoalZoneId,
  HandballEvent,
  PersonRef,
  Team,
} from '@/domain/types';
import { useMatchStore } from '@/lib/store';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { Scoreboard } from './scoreboard';
import { PlayerPicker, type PickerKind } from './player-picker';
import { LiveStats } from './live-stats';
import { EventTimeline } from './event-timeline';
import { ShotOutcomeDialog, type ShotOutcome } from './shot-outcome-dialog';
import { EventEditDialog } from './event-edit-dialog';
import { eventChangesPossession, otherTeam } from '@/domain/recommendations';
/**
 * TODO: Para usar el responsive layout en live-match-page:
 *
 * 1. Extractar cada sección en una variable:
 *    const controlSection = (<> ... scoreboard + attacker + mode ... </>)
 *    const goalSection = (<GoalGrid ... />)
 *    const courtSection = (<CourtView ... /> + button)
 *    const statsSection = (<LiveStats ... />)
 *    const timelineSection = (<EventTimeline ... />)
 *
 * 2. Reemplazar el return con:
 *    return (
 *      <LiveMatchLayout
 *        control={controlSection}
 *        goalZone={goalSection}
 *        court={courtSection}
 *        stats={statsSection}
 *        timeline={timelineSection}
 *      />
 *    )
 *
 * Esto activa automáticamente:
 * - Mobile: stack vertical
 * - Tablet (768px+): 2 columnas (control+arco izq, stats+timeline derecha)
 * - Desktop (1024px+): 3 columnas compactas con scroll lateral
 */


/**
 * Collects people (shooters + sanctioned) already tagged for `team` in this
 * match. Dedups by number — later taggings override the name so if the
 * user upgraded "#7" to "Carlos #7" later, the upgraded version wins.
 */
const adhocPlayersFor = (events: HandballEvent[], team: Team): PersonRef[] => {
  const byNumber = new Map<number, PersonRef>();
  for (const e of events) {
    if (e.team !== team) continue;
    const refs: (PersonRef | null | undefined)[] = [e.shooter, e.sanctioned];
    for (const r of refs) {
      if (!r) continue;
      byNumber.set(r.number, r);
    }
  }
  return Array.from(byNumber.values()).sort((a, b) => a.number - b.number);
};

/**
 * Goalkeepers already tagged for `gkTeam`. A goalkeeper shows up in events
 * where the attacking team is the OPPOSITE of the GK's team — when we
 * attacked, the GK who defended is the rival's.
 */
const adhocGoalkeepersFor = (events: HandballEvent[], gkTeam: Team): PersonRef[] => {
  const attackingTeam: Team = gkTeam === 'home' ? 'away' : 'home';
  const byNumber = new Map<number, PersonRef>();
  for (const e of events) {
    if (e.team !== attackingTeam) continue;
    if (!e.goalkeeper) continue;
    byNumber.set(e.goalkeeper.number, e.goalkeeper);
  }
  return Array.from(byNumber.values()).sort((a, b) => a.number - b.number);
};

type Mode = 'quick' | 'full';

// Shot flow state: once the user taps a goal quadrant, we enter the
// "pending shot" state. Steps: outcome → shooter → (maybe) goalkeeper.
interface PendingShot {
  draft: EventDraft;
  step: 'outcome' | 'shooter' | 'goalkeeper';
  outcome?: ShotOutcome;
  shooterPicked?: PersonRef | null;
}

interface PendingTagged {
  type: Exclude<EventType, 'goal' | 'miss' | 'saved' | 'post' | 'timeout' | 'half_time'>;
  team: Team;
}

export const LiveMatchPage = () => {
  const navigate = useNavigate();
  const t = useT();

  const status      = useMatchStore((s) => s.status);
  const match       = useMatchStore((s) => s.liveMatch);
  const events      = useMatchStore((s) => s.liveEvents);
  const clock       = useMatchStore((s) => s.liveClock);
  const setClock    = useMatchStore((s) => s.setLiveClock);
  const addEvent    = useMatchStore((s) => s.addLiveEvent);
  const updateEvent = useMatchStore((s) => s.updateLiveEvent);
  const removeEvent = useMatchStore((s) => s.removeLiveEvent);
  const finishLive  = useMatchStore((s) => s.finishLive);
  const closeLive   = useMatchStore((s) => s.closeLive);
  const teams       = useMatchStore((s) => s.teams);
  const autoSwitch  = useMatchStore((s) => s.autoSwitchAttacker);
  const setAutoSwitch = useMatchStore((s) => s.setAutoSwitchAttacker);

  const [mode, setMode] = useState<Mode>('full');
  const [attacker, setAttacker] = useState<Team>('home');
  const [draft, setDraft] = useState<EventDraft>(EMPTY_DRAFT);
  const [pendingShot, setPendingShot] = useState<PendingShot | null>(null);
  const [pendingTagged, setPendingTagged] = useState<PendingTagged | null>(null);
  const [editingEvent, setEditingEvent] = useState<HandballEvent | null>(null);

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

  const setAttackerAndReset = (t: Team) => {
    setAttacker(t);
    setDraft({ ...EMPTY_DRAFT, team: t });
  };

  /**
   * After registering an event, optionally rotate attacker to the other team.
   * Only fires for shot/turnover events when the user has the toggle enabled.
   */
  const maybeAutoSwitch = (type: EventType, attackingTeam: Team) => {
    if (!autoSwitch) return;
    if (!eventChangesPossession(type)) return;
    setAttackerAndReset(otherTeam(attackingTeam));
  };

  /**
   * Core UX decision: tapping a goal quadrant is the trigger to OPEN THE
   * OUTCOME POPUP, not a plain selection. This removes the need for
   * separate "Gol/Atajada" buttons because tapping a quadrant already
   * implies the shot hit that specific location.
   *
   * If the same quadrant is tapped twice, we treat the second tap as a
   * deselect — toggle behavior preserved for accidental taps.
   */
  const handleGoalZoneTap = (z: GoalZoneId | null) => {
    if (z === null || draft.goalZone === z) {
      setDraft((d) => ({ ...d, team: attacker, goalZone: null }));
      return;
    }
    const nextDraft: EventDraft = { ...draft, team: attacker, goalZone: z };
    setDraft(nextDraft);
    if (mode === 'quick') return;
    // If court zone already picked, go straight to outcome. Otherwise wait
    // for the user to pick the court zone too.
    if (nextDraft.courtZone) {
      setPendingShot({ draft: nextDraft, step: 'outcome' });
    }
  };

  const handleCourtZoneTap = (z: CourtZoneId | null) => {
    if (z === null || draft.courtZone === z) {
      setDraft((d) => ({ ...d, team: attacker, courtZone: null }));
      return;
    }
    const nextDraft: EventDraft = { ...draft, team: attacker, courtZone: z };
    setDraft(nextDraft);
    if (mode === 'quick') return;
    // If goal zone already picked (arco → cancha order), fire outcome now.
    if (nextDraft.goalZone) {
      setPendingShot({ draft: nextDraft, step: 'outcome' });
    }
  };

  const handleShotOutcomePicked = (outcome: ShotOutcome) => {
    if (!pendingShot) return;
    setPendingShot({ ...pendingShot, step: 'shooter', outcome });
  };

  const handleShotShooterPicked = (shooter: PersonRef | null) => {
    if (!pendingShot || !pendingShot.outcome) return;
    const { draft: d, outcome } = pendingShot;

    const reachedGoal = outcome === 'goal' || outcome === 'saved';
    if (!reachedGoal) {
      addEvent(buildEvent({
        type: outcome,
        draft: { ...d, shooter },
        clock,
        quickMode: false,
      }));
      setPendingShot(null);
      setDraft({ ...EMPTY_DRAFT, team: attacker });
      maybeAutoSwitch(outcome, d.team);
      return;
    }

    // Always go through the PlayerPicker for GK — no native prompt.
    setPendingShot({ ...pendingShot, step: 'goalkeeper', shooterPicked: shooter });
  };

  const handleShotGkPicked = (gk: PersonRef | null) => {
    if (!pendingShot || !pendingShot.outcome) return;
    const { draft: d, outcome, shooterPicked } = pendingShot;
    addEvent(buildEvent({
      type: outcome,
      draft: { ...d, shooter: shooterPicked ?? null, goalkeeper: gk },
      clock,
      quickMode: false,
    }));
    setPendingShot(null);
    setDraft({ ...EMPTY_DRAFT, team: attacker });
    maybeAutoSwitch(outcome, d.team);
  };

  const handleNonShotCta = (type: EventType, team: Team) => {
    const kind = rosterKindFor(type);
    if (kind === 'none' || mode === 'quick') {
      addEvent(buildEvent({
        type,
        draft: { ...EMPTY_DRAFT, team },
        clock,
        quickMode: mode === 'quick',
      }));
      maybeAutoSwitch(type, team);
      return;
    }
    setPendingTagged({
      type: type as PendingTagged['type'],
      team,
    });
  };

  const handleTaggedPicked = (p: PersonRef | null) => {
    if (!pendingTagged) return;
    const { type, team } = pendingTagged;
    const kind = rosterKindFor(type);
    addEvent(buildEvent({
      type,
      draft: {
        ...EMPTY_DRAFT,
        team,
        shooter: kind === 'possession' ? p : null,
      },
      clock,
      quickMode: false,
      sanctioned: kind === 'sanctioned' ? p : null,
    }));
    setPendingTagged(null);
    maybeAutoSwitch(type, team);
  };

  // ─── Picker context: resolves roster & title for the current step ───
  const pickerContext = useMemo(() => {
    if (pendingShot && pendingShot.step === 'shooter') {
      const { draft: d } = pendingShot;
      const teamObj = teams.find(
        (t) => t.name === (d.team === 'home' ? match.home : match.away),
      );
      const players = teamObj?.players ?? [];
      const { fieldPlayers } = splitRoster(players);
      const adhoc = adhocPlayersFor(events, d.team);
      return {
        open: true,
        kind: 'shooter' as PickerKind,
        players: fieldPlayers,
        adhocPlayers: adhoc,
        teamColor: d.team === 'home' ? match.homeColor : match.awayColor,
        teamName: d.team === 'home' ? match.home : match.away,
        priorityZone: d.courtZone, // ← recomendación por zona
        onPick: handleShotShooterPicked,
      };
    }

    if (pendingShot && pendingShot.step === 'goalkeeper') {
      const { draft: d } = pendingShot;
      const gkIsOurs = d.team === 'away';
      const gkTeamName = gkIsOurs ? match.home : match.away;
      const gkColor = gkIsOurs ? match.homeColor : match.awayColor;
      const gkTeam: Team = gkIsOurs ? 'home' : 'away';
      const teamObj = teams.find((t) => t.name === gkTeamName);
      const players = teamObj?.players ?? [];
      const { goalkeepers } = splitRoster(players);
      return {
        open: true,
        kind: 'goalkeeper' as PickerKind,
        players: goalkeepers,
        adhocPlayers: adhocGoalkeepersFor(events, gkTeam),
        teamColor: gkColor,
        teamName: gkTeamName,
        onPick: handleShotGkPicked,
      };
    }

    if (pendingTagged) {
      const { team } = pendingTagged;
      const teamObj = teams.find(
        (t) => t.name === (team === 'home' ? match.home : match.away),
      );
      const players = teamObj?.players ?? [];
      const adhoc = adhocPlayersFor(events, team);
      return {
        open: true,
        kind: 'sanctioned' as PickerKind,
        players,
        adhocPlayers: adhoc,
        teamColor: team === 'home' ? match.homeColor : match.awayColor,
        teamName: team === 'home' ? match.home : match.away,
        onPick: handleTaggedPicked,
      };
    }

    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingShot, pendingTagged, teams, match, events]);

  const handleFinish = () => {
    if (window.confirm(t.live_finish_confirm)) {
      finishLive();
      navigate('/');
    }
  };
  const handleDiscard = () => {
    if (window.confirm(t.live_discard_confirm)) {
      closeLive();
      navigate('/');
    }
  };

  const longRangeActive = draft.courtZone === 'long_range';

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

      {/* Attacker selector — arriba de todo para controlar stats y carga */}
      <div className="rounded-lg border border-border bg-surface p-1 flex gap-1">
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
                'flex-1 h-9 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 truncate px-2',
                active ? 'bg-primary/15 border border-primary/40 text-primary' : 'text-muted-fg hover:text-fg',
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      <LiveStats
        events={events}
        home={match.home}
        away={match.away}
        homeColor={match.homeColor}
        awayColor={match.awayColor}
        focus={attacker}
      />

      {/* Mode + auto-switch */}
      <div className="flex gap-2">
        <div className="rounded-lg border border-border bg-surface p-1 flex flex-1">
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
              {m === 'full' ? t.live_mode_full : t.live_mode_quick}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setAutoSwitch(!autoSwitch)}
          className={cn(
            'rounded-lg border px-3 h-10 text-[10px] font-medium transition-colors flex items-center gap-1.5',
            autoSwitch
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border bg-surface text-muted-fg',
          )}
          title="Cambia automáticamente al otro equipo después de un tiro o pérdida"
        >
          <span aria-hidden>⇄</span>
          <span>Auto: {autoSwitch ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      {/* Step 1: arco — tapping a quadrant triggers the outcome popup */}
      <section>
        <div className="flex items-center gap-2 mb-1.5">
          <StepNumber n={1} />
          <h3 className="text-xs font-medium text-fg">{t.live_step1}</h3>
        </div>
        <div className="max-w-sm md:max-w-md mx-auto">
          <GoalGrid
            selected={draft.goalZone}
            onSelect={handleGoalZoneTap}
          />
        </div>
        <div className="grid grid-cols-2 gap-1.5 mt-2 max-w-sm md:max-w-md mx-auto">
          <OutcomeExtraButton
            label={t.live_fuera}
            active={false}
            tone="neutral"
            onClick={() => {
              // "Fuera / Falta" is a shortcut for a missed shot — commit directly
              if (mode === 'quick') {
                addEvent(buildEvent({
                  type: 'miss',
                  draft: { ...draft, team: attacker, goalZone: 'out' },
                  clock,
                  quickMode: true,
                }));
                setDraft({ ...EMPTY_DRAFT, team: attacker });
                maybeAutoSwitch('miss', attacker);
                return;
              }
              const next: EventDraft = { ...draft, team: attacker, goalZone: 'out' };
              setDraft(next);
              setPendingShot({ draft: next, step: 'shooter', outcome: 'miss' });
            }}
          />
          <OutcomeExtraButton
            label={t.live_palo}
            active={false}
            tone="warning"
            onClick={() => {
              if (mode === 'quick') {
                addEvent(buildEvent({
                  type: 'post',
                  draft: { ...draft, team: attacker, goalZone: 'post' },
                  clock,
                  quickMode: true,
                }));
                setDraft({ ...EMPTY_DRAFT, team: attacker });
                maybeAutoSwitch('post', attacker);
                return;
              }
              const next: EventDraft = { ...draft, team: attacker, goalZone: 'post' };
              setDraft(next);
              setPendingShot({ draft: next, step: 'shooter', outcome: 'post' });
            }}
          />
        </div>
      </section>

      {/* Step 2: cancha */}
      <section>
        <div className="flex items-center gap-2 mb-1.5">
          <StepNumber n={2} />
          <h3 className="text-xs font-medium text-fg">{t.live_step2}</h3>
        </div>
        <div className="max-w-sm md:max-w-md mx-auto">
          <CourtView
            selectedZone={draft.courtZone === 'long_range' ? null : draft.courtZone}
            onZoneSelect={handleCourtZoneTap}
          />
          <button
            type="button"
            onClick={() => handleCourtZoneTap(longRangeActive ? null : 'long_range')}
            className={cn(
              'mt-2 w-full h-10 rounded-md border text-xs font-medium transition-colors duration-fast touch-target',
              longRangeActive
                ? 'border-card/60 bg-card/20 text-card'
                : 'border-card/30 bg-card/5 text-card/80 hover:bg-card/10',
            )}
          >
            {t.live_arco_a_arco}
          </button>
        </div>
      </section>

      {/* Non-shot events (no big shot CTAs anymore) */}
      <section>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg mb-1.5">
          {t.live_other_events}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleNonShotCta('turnover', attacker)}
            className="h-10 text-xs"
          >
            🔄 Pérdida
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleNonShotCta('exclusion', attacker)}
            className="h-10 text-xs text-exclusion"
          >
            ⏱ 2'
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleNonShotCta('timeout', attacker)}
            className="h-10 text-xs"
          >
            ✋ T.M.
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              addEvent(buildEvent({
                type: 'half_time',
                draft: { ...EMPTY_DRAFT, team: attacker },
                clock,
                quickMode: false,
              }));
            }}
            className="h-10 text-xs"
          >
            ⏸ Descanso
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1.5 mt-1.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleNonShotCta('yellow_card', attacker)}
            className="h-9 text-xs text-warning"
          >
            🟨 Amarilla
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleNonShotCta('blue_card', attacker)}
            className="h-9 text-xs text-primary"
          >
            🟦 Azul
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleNonShotCta('red_card', attacker)}
            className="h-9 text-xs text-danger"
          >
            🟥 Roja
          </Button>
        </div>
      </section>

      <EventTimeline
        events={events}
        homeColor={match.homeColor}
        awayColor={match.awayColor}
        onDelete={removeEvent}
        onEdit={(ev) => setEditingEvent(ev)}
      />

      <section className="flex gap-2 pt-2">
        <Button variant="danger" size="sm" onClick={handleDiscard} className="flex-1">
          {t.live_discard}
        </Button>
        <Button onClick={handleFinish} className="flex-[2]">
          {t.live_finish}
        </Button>
      </section>

      {/* Dialogs */}
      <ShotOutcomeDialog
        open={!!pendingShot && pendingShot.step === 'outcome'}
        onClose={() => {
          setPendingShot(null);
          setDraft((d) => ({ ...d, goalZone: null }));
        }}
        goalZone={draft.goalZone}
        courtZone={draft.courtZone}
        onConfirm={handleShotOutcomePicked}
      />

      <EventEditDialog
        open={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        event={editingEvent}
        homeName={match.home}
        awayName={match.away}
        onSave={(patch) => {
          if (!editingEvent) return;
          updateEvent(editingEvent.id, patch);
        }}
        onDelete={() => {
          if (!editingEvent) return;
          removeEvent(editingEvent.id);
        }}
      />

      {pickerContext && (
        <PlayerPicker
          open={pickerContext.open}
          onClose={() => {
            setPendingShot(null);
            setPendingTagged(null);
            setDraft((d) => ({ ...d, goalZone: null }));
          }}
          onPick={pickerContext.onPick}
          players={pickerContext.players}
          adhocPlayers={pickerContext.adhocPlayers}
          teamColor={pickerContext.teamColor}
          teamName={pickerContext.teamName}
          kind={pickerContext.kind}
          priorityZone={'priorityZone' in pickerContext ? pickerContext.priorityZone : null}
        />
      )}
    </div>
  );
};

const StepNumber = ({ n }: { n: number }) => (
  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-fg text-[11px] font-semibold">
    {n}
  </span>
);

const OutcomeExtraButton = ({
  label,
  active,
  tone,
  onClick,
}: {
  label: string;
  active: boolean;
  tone: 'neutral' | 'warning';
  onClick: () => void;
}) => {
  const base = 'h-9 text-xs font-medium rounded-md border transition-colors duration-fast touch-target';
  const tones = {
    neutral: active
      ? 'border-fg/40 bg-surface-2 text-fg'
      : 'border-border bg-surface-2/50 text-muted-fg hover:text-fg',
    warning: active
      ? 'border-warning/60 bg-warning/20 text-warning'
      : 'border-warning/30 bg-warning/5 text-warning/80 hover:bg-warning/10',
  };
  return (
    <button type="button" onClick={onClick} className={cn(base, tones[tone])}>
      {label}
    </button>
  );
};
