import type {
  CourtZoneId,
  GoalQuadrantId,
  GoalZoneId,
  HandballEvent,
  Team,
} from './types';
import { isShotEvent } from './types';
import { GOAL_QUADRANT_ORDER } from './constants';

/**
 * Crossfilter — Match Analysis.
 *
 * A Filter is a set of AND-ed constraints. Any field that is null means
 * "no constraint on that dimension".
 *
 * Typical UX: the user taps a zone → zone is set. They tap a player →
 * player is added. They tap a quadrant → quadrant is set. All chosen
 * dimensions narrow the result set together.
 *
 * All applyFilter logic stays pure so the UI can re-derive everything
 * on each render without memoization bugs.
 */

export interface MatchFilter {
  team: Team | null;                       // 'home' | 'away' | null (both)
  zone: CourtZoneId | null;                // court zone
  quadrant: GoalQuadrantId | null;         // goal 3x3 quadrant
  /** Exact shooter identity (name#number). */
  shooterKey: string | null;
  /** Only keep events of these types. Empty array = no constraint. */
  types: Array<HandballEvent['type']>;
}

export const EMPTY_FILTER: MatchFilter = {
  team: null,
  zone: null,
  quadrant: null,
  shooterKey: null,
  types: [],
};

/** Stable key for identifying a shooter across events. */
export const shooterKeyOf = (e: HandballEvent): string | null =>
  e.shooter ? `${e.shooter.number}#${e.shooter.name}` : null;

/** Keep only events that match all set dimensions of the filter. */
export const applyFilter = (
  events: HandballEvent[],
  f: MatchFilter,
): HandballEvent[] =>
  events.filter((e) => {
    if (f.team && e.team !== f.team) return false;
    if (f.zone && e.zone !== f.zone) return false;
    if (f.quadrant && e.goalZone !== f.quadrant) return false;
    if (f.shooterKey && shooterKeyOf(e) !== f.shooterKey) return false;
    if (f.types.length > 0 && !f.types.includes(e.type)) return false;
    return true;
  });

/** Is this filter completely empty (no active constraints)? */
export const isEmptyFilter = (f: MatchFilter): boolean =>
  f.team === null &&
  f.zone === null &&
  f.quadrant === null &&
  f.shooterKey === null &&
  f.types.length === 0;

/** Toggle a constraint value (set it if null, clear it if equal). */
export const toggleTeam = (f: MatchFilter, t: Team): MatchFilter =>
  f.team === t ? { ...f, team: null } : { ...f, team: t };

export const toggleZone = (f: MatchFilter, z: CourtZoneId): MatchFilter =>
  f.zone === z ? { ...f, zone: null } : { ...f, zone: z };

export const toggleQuadrant = (f: MatchFilter, q: GoalQuadrantId): MatchFilter =>
  f.quadrant === q ? { ...f, quadrant: null } : { ...f, quadrant: q };

export const toggleShooter = (f: MatchFilter, key: string): MatchFilter =>
  f.shooterKey === key ? { ...f, shooterKey: null } : { ...f, shooterKey: key };

// ─── Aggregates over a filtered result ─────────────────────────────────

export interface FilteredSummary {
  events: number;
  shots: number;     // shot attempts (goal + miss + saved + post)
  goals: number;
  saved: number;
  miss: number;
  post: number;
  pct: number;       // goals / shots
}

export const summarize = (events: HandballEvent[]): FilteredSummary => {
  let shots = 0, goals = 0, saved = 0, miss = 0, post = 0;
  for (const e of events) {
    if (!isShotEvent(e.type)) continue;
    shots++;
    if (e.type === 'goal')       goals++;
    else if (e.type === 'saved') saved++;
    else if (e.type === 'miss')  miss++;
    else if (e.type === 'post')  post++;
  }
  return {
    events: events.length,
    shots,
    goals,
    saved,
    miss,
    post,
    pct: shots === 0 ? 0 : Math.round((goals / shots) * 100),
  };
};

// ─── Per-dimension counts (heatmap data) ───────────────────────────────
//
// These count events grouped by a dimension, respecting the filter's
// OTHER dimensions. Semantics: if the user has a zone filter active and
// we're computing perQuadrant, we exclude the zone constraint from
// our filter before counting, so that tapping another quadrant doesn't
// get suppressed by the zone selection.
//
// In practice this keeps the "counts" always meaningful: you always see
// which options are available given the rest of your filter.

const filterExcluding =
  (f: MatchFilter, dim: keyof MatchFilter): MatchFilter => ({
    ...f,
    [dim]: dim === 'types' ? [] : null,
  });

export type ZoneCounts = Partial<Record<CourtZoneId, number>>;
export type QuadrantCounts = Partial<Record<GoalQuadrantId, number>>;

export const perZone = (
  events: HandballEvent[],
  f: MatchFilter,
): ZoneCounts => {
  const base = applyFilter(events, filterExcluding(f, 'zone'));
  const result: ZoneCounts = {};
  for (const e of base) {
    if (!e.zone) continue;
    result[e.zone] = (result[e.zone] ?? 0) + 1;
  }
  return result;
};

export const perQuadrant = (
  events: HandballEvent[],
  f: MatchFilter,
): QuadrantCounts => {
  const base = applyFilter(events, filterExcluding(f, 'quadrant'));
  const result: QuadrantCounts = {};
  for (const e of base) {
    const g = e.goalZone;
    if (!g) continue;
    if (!(GOAL_QUADRANT_ORDER as readonly string[]).includes(g)) continue;
    const q = g as GoalQuadrantId;
    result[q] = (result[q] ?? 0) + 1;
  }
  return result;
};

// ─── Per-shooter summary ───────────────────────────────────────────────

export interface ShooterSummary {
  key: string;                   // stable identity
  name: string;
  number: number;
  team: Team;
  shots: number;
  goals: number;
  pct: number;
}

export const perShooter = (
  events: HandballEvent[],
  f: MatchFilter,
): ShooterSummary[] => {
  const base = applyFilter(events, filterExcluding(f, 'shooterKey'));
  const acc = new Map<string, ShooterSummary>();
  for (const e of base) {
    if (!isShotEvent(e.type)) continue;
    const key = shooterKeyOf(e);
    if (!key || !e.shooter) continue;
    let s = acc.get(key);
    if (!s) {
      s = {
        key,
        name: e.shooter.name,
        number: e.shooter.number,
        team: e.team,
        shots: 0,
        goals: 0,
        pct: 0,
      };
      acc.set(key, s);
    }
    s.shots++;
    if (e.type === 'goal') s.goals++;
  }
  const arr = Array.from(acc.values());
  for (const s of arr) s.pct = s.shots === 0 ? 0 : Math.round((s.goals / s.shots) * 100);
  // Sort: most shots first, then alphabetical
  arr.sort((a, b) => b.shots - a.shots || a.name.localeCompare(b.name));
  return arr;
};

// ─── Filter chips: a human-readable view of active filters ─────────────

export interface ActiveFilterChip {
  kind: 'team' | 'zone' | 'quadrant' | 'shooter' | 'type';
  label: string;
  remove: (f: MatchFilter) => MatchFilter;
}

// Lazy label resolution — the UI passes in human-readable names via context
// instead of us hard-coding label lookups here. This keeps the domain
// module independent of the COURT_ZONES constants.
export interface FilterLabels {
  zone: (z: CourtZoneId) => string;
  quadrant: (q: GoalQuadrantId) => string;
  team: (t: Team) => string;
  shooter: (key: string) => string;
  type: (t: HandballEvent['type']) => string;
}

export const activeChips = (
  f: MatchFilter,
  labels: FilterLabels,
): ActiveFilterChip[] => {
  const chips: ActiveFilterChip[] = [];
  if (f.team) {
    chips.push({
      kind: 'team',
      label: labels.team(f.team),
      remove: (f) => ({ ...f, team: null }),
    });
  }
  if (f.zone) {
    chips.push({
      kind: 'zone',
      label: labels.zone(f.zone),
      remove: (f) => ({ ...f, zone: null }),
    });
  }
  if (f.quadrant) {
    chips.push({
      kind: 'quadrant',
      label: labels.quadrant(f.quadrant),
      remove: (f) => ({ ...f, quadrant: null }),
    });
  }
  if (f.shooterKey) {
    chips.push({
      kind: 'shooter',
      label: labels.shooter(f.shooterKey),
      remove: (f) => ({ ...f, shooterKey: null }),
    });
  }
  for (const t of f.types) {
    chips.push({
      kind: 'type',
      label: labels.type(t),
      remove: (f) => ({ ...f, types: f.types.filter((x) => x !== t) }),
    });
  }
  return chips;
};

/**
 * Find a match by id across completed and (if any) live match.
 * The UI uses this when routing to /analysis/:id.
 */
export const findMatchRecordId = <T extends { id: string }>(
  all: T[],
  id: string,
): T | null => all.find((m) => m.id === id) ?? null;

// Re-export the narrow type used by chip UIs.
export type { GoalZoneId };
