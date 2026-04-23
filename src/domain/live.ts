import type { CourtZoneId, EventType, GoalZoneId, HandballEvent, PersonRef, Player, Situation, Team, ThrowType } from './types';

// ─── Clock ──────────────────────────────────────────────────────────────

/**
 * In Argentine federation handball the match is 60 minutes, split in
 * two halves of 30. We store the clock as seconds elapsed since the
 * current half started. The minute (1..60) is always derived from
 * seconds + which half we're in.
 */
export type Half = 1 | 2;

export interface ClockState {
  /** Seconds elapsed within the current half. */
  seconds: number;
  /** Which half: 1 or 2. */
  half: Half;
  /** True if the clock is currently ticking. */
  running: boolean;
}

export const INITIAL_CLOCK: ClockState = {
  seconds: 0,
  half: 1,
  running: false,
};

/**
 * Resolve the current minute (1..60) for an event at the given clock state.
 *
 * Minute 0 doesn't exist in handball scoring — we always round UP so
 * anything during the first minute is minute 1. If you stop the clock
 * at 0 exactly, we return 0 — that's only possible before kickoff.
 */
export const clockToMinute = (clock: ClockState): number => {
  const minuteInHalf = clock.seconds === 0 ? 0 : Math.ceil(clock.seconds / 60);
  return clock.half === 1 ? minuteInHalf : 30 + minuteInHalf;
};

/**
 * Tick the clock forward N seconds (from a setInterval or similar).
 * Clamps at 30*60 = 1800s per half — we don't advance past end of half.
 */
export const tickClock = (clock: ClockState, deltaSeconds: number): ClockState => {
  if (!clock.running) return clock;
  const next = clock.seconds + deltaSeconds;
  return { ...clock, seconds: Math.min(next, 30 * 60) };
};

/**
 * Adjust the clock manually (for corrections). Clamps to [0, 1800].
 */
export const adjustClock = (clock: ClockState, deltaSeconds: number): ClockState => {
  const next = clock.seconds + deltaSeconds;
  return { ...clock, seconds: Math.max(0, Math.min(next, 30 * 60)) };
};

/**
 * Set the clock directly (used by the manual-input dialog).
 */
export const setClockSeconds = (clock: ClockState, seconds: number): ClockState => ({
  ...clock,
  seconds: Math.max(0, Math.min(seconds, 30 * 60)),
});

// ─── Event draft ────────────────────────────────────────────────────────

/**
 * A partial event the user is building on the Live screen.
 * Becomes a HandballEvent once persisted.
 *
 * Design: having a single draft lets us share the same UI state
 * regardless of whether the user taps zones in arco→cancha order
 * or anywhere in between.
 */
export interface EventDraft {
  team: Team;
  goalZone: GoalZoneId | null;
  courtZone: CourtZoneId | null;
  shooter: PersonRef | null;
  goalkeeper: PersonRef | null;
  situation: Situation | null;
  throwType: ThrowType | null;
}

export const EMPTY_DRAFT: EventDraft = {
  team: 'home',
  goalZone: null,
  courtZone: null,
  shooter: null,
  goalkeeper: null,
  situation: null,
  throwType: null,
};

/**
 * Does the draft have enough info to persist as a shot of the given type?
 * For a tagged (non-quick) shot we want both a goal zone and a court zone.
 */
export const isShotDraftComplete = (draft: EventDraft): boolean =>
  draft.goalZone !== null && draft.courtZone !== null;

// ─── Player filtering for selection popups ─────────────────────────────

/**
 * Split the roster into goalkeepers and field players.
 *
 * "Arquero" is the canonical name in our POSITIONS constant, but we
 * also handle variants case-insensitively since users type these manually.
 */
export const isGoalkeeper = (p: Player): boolean =>
  p.position.trim().toLowerCase().startsWith('arquero');

export interface RosterSplit {
  goalkeepers: Player[];
  fieldPlayers: Player[];
}

export const splitRoster = (players: Player[]): RosterSplit => {
  const goalkeepers: Player[] = [];
  const fieldPlayers: Player[] = [];
  for (const p of players) {
    if (isGoalkeeper(p)) goalkeepers.push(p);
    else fieldPlayers.push(p);
  }
  return { goalkeepers, fieldPlayers };
};

/**
 * For a given event type, return which roster we should show the popup for.
 *
 *  - goal / miss / post     → shooter (field players)
 *  - saved                  → *also* shooter (the one who shot, even though
 *                              the saver is the opposing GK)
 *  - turnover               → the player who lost possession
 *  - exclusion / cards      → the sanctioned player
 *  - timeout / half_time    → no player
 *
 * The companion `needsOpposingGK` flag tells us whether we should ALSO
 * record the opposing GK (always true for saved, optionally for goal).
 */
export type PopupRosterKind = 'shooter' | 'sanctioned' | 'possession' | 'none';

export const rosterKindFor = (type: EventType): PopupRosterKind => {
  switch (type) {
    case 'goal':
    case 'miss':
    case 'saved':
    case 'post':
      return 'shooter';
    case 'turnover':
      return 'possession';
    case 'exclusion':
    case 'red_card':
    case 'blue_card':
    case 'yellow_card':
      return 'sanctioned';
    default:
      return 'none';
  }
};

// ─── Build a HandballEvent from a draft ────────────────────────────────

export interface BuildEventInput {
  type: EventType;
  draft: EventDraft;
  clock: ClockState;
  quickMode: boolean;
  sanctioned?: PersonRef | null;
}

export const buildEvent = (input: BuildEventInput): Omit<HandballEvent, 'id' | 'hScore' | 'aScore'> => {
  const { type, draft, clock, quickMode, sanctioned } = input;
  return {
    min: clockToMinute(clock),
    team: draft.team,
    type,
    zone: draft.courtZone,
    goalZone: draft.goalZone,
    situation: draft.situation,
    throwType: draft.throwType,
    shooter: draft.shooter,
    goalkeeper: draft.goalkeeper,
    sanctioned: sanctioned ?? null,
    quickMode,
    completed: true,
  };
};

// ─── Event type → tone for visual grouping ─────────────────────────────

/**
 * Decides whether an event type benefits from having both a court zone
 * and a goal zone tagged. All shot events do; everything else uses at
 * most a court zone (or nothing).
 */
export const wantsGoalZone = (type: EventType): boolean =>
  type === 'goal' || type === 'miss' || type === 'saved' || type === 'post';

export const wantsCourtZone = (type: EventType): boolean =>
  wantsGoalZone(type) || type === 'turnover' || type === 'exclusion';
