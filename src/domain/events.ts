import type {
  CourtZoneId,
  EventType,
  GoalZoneId,
  HandballEvent,
  MatchSummary,
  Team,
} from './types';

// ─── DB row shapes (mirror Supabase columns) ────────────────────────────
// Narrow types only. We don't import the full Database<> type generated
// by Supabase CLI here to avoid a hard dependency; callers pass rows.
export interface DbEventRow {
  id: string;
  match_id: string;
  minute: number;
  team: Team;
  type: EventType;
  zone: string | null;
  quadrant: number | null;        // legacy numeric column (0..8)
  goal_section: string | null;    // new string column (tl/tc/.../post/out)
  situation: string | null;
  throw_type: string | null;
  shooter_name: string | null;
  shooter_number: number | null;
  goalkeeper_name: string | null;
  goalkeeper_number: number | null;
  sanctioned_name: string | null;
  sanctioned_number: number | null;
  h_score: number | null;
  a_score: number | null;
  completed: boolean | null;
  quick_mode: boolean | null;
}

export interface DbMatchRow {
  id: string;
  home_name: string;
  away_name: string;
  home_score: number;
  away_score: number;
  match_date: string | null;
  competition: string | null;
  home_color: string | null;
  away_color: string | null;
  events?: DbEventRow[];
}

// ─── Quadrant number → id mapping (backwards compat with v8 schema) ────
const QUADRANT_BY_INDEX = [
  'tl', 'tc', 'tr',
  'ml', 'mc', 'mr',
  'bl', 'bc', 'br',
] as const;

const decodeGoalZone = (row: DbEventRow): GoalZoneId | null => {
  // Prefer the new string column. Fall back to the numeric quadrant.
  if (row.goal_section) {
    const s = row.goal_section as GoalZoneId;
    return s;
  }
  if (row.quadrant !== null && row.quadrant >= 0 && row.quadrant <= 8) {
    return QUADRANT_BY_INDEX[row.quadrant];
  }
  return null;
};

// ─── Mappers: DB ↔ domain ─────────────────────────────────────────────
export const mapDbEvent = (row: DbEventRow): HandballEvent => ({
  id: row.id,
  min: row.minute,
  team: row.team,
  type: row.type,
  zone: (row.zone as CourtZoneId | null) ?? null,
  goalZone: decodeGoalZone(row),
  situation: (row.situation as HandballEvent['situation']) ?? null,
  throwType: (row.throw_type as HandballEvent['throwType']) ?? null,
  shooter: row.shooter_name
    ? { name: row.shooter_name, number: row.shooter_number ?? 0 }
    : null,
  goalkeeper: row.goalkeeper_name
    ? { name: row.goalkeeper_name, number: row.goalkeeper_number ?? 0 }
    : null,
  sanctioned: row.sanctioned_name
    ? { name: row.sanctioned_name, number: row.sanctioned_number ?? 0 }
    : null,
  hScore: row.h_score ?? 0,
  aScore: row.a_score ?? 0,
  quickMode: row.quick_mode ?? false,
  completed: row.completed ?? true,
});

export const mapDbMatch = (row: DbMatchRow): MatchSummary => ({
  id: row.id,
  home: row.home_name,
  away: row.away_name,
  hs: row.home_score,
  as: row.away_score,
  date: row.match_date ?? '',
  competition: row.competition ?? '',
  homeColor: row.home_color ?? '#3B82F6',
  awayColor: row.away_color ?? '#64748B',
  events: (row.events ?? []).map(mapDbEvent).sort((a, b) => a.min - b.min),
});

// ─── Score derivation ──────────────────────────────────────────────────
/**
 * Walks the event list from the start, counting goals per team.
 *
 * Why not read the last persisted (hScore, aScore)? Because between the
 * time an event is added locally and the time it's persisted (with its
 * snapshot scores), the store may hold a pending event with 0/0 scores.
 * Recomputing is cheap and always consistent.
 */
export const computeScore = (events: HandballEvent[]): { h: number; a: number } => {
  let h = 0;
  let a = 0;
  for (const e of events) {
    if (e.type === 'goal') {
      if (e.team === 'home') h++;
      else a++;
    }
  }
  return { h, a };
};

/**
 * Predicts what the score will be IF we append this event.
 * Used when persisting a new event to fill (h_score, a_score) columns.
 */
export const calcNextScore = (
  events: HandballEvent[],
  type: EventType,
  team: Team,
): { h: number; a: number } => {
  const prev = computeScore(events);
  if (type !== 'goal') return prev;
  return team === 'home'
    ? { h: prev.h + 1, a: prev.a }
    : { h: prev.h, a: prev.a + 1 };
};

// ─── Time formatting ───────────────────────────────────────────────────
export const formatClock = (totalSeconds: number): string => {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return '00:00';
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};
