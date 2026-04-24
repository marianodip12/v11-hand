/**
 * Domain types — Handball.
 *
 * These mirror the Supabase schema but are the source of truth for the UI.
 * See lib/supabase.ts for the DB-row types and the mappers in `events.ts`.
 */

// ─── Zones on the court ────────────────────────────────────────────────
// 9 selectable court zones, matching the original CourtView geometry,
// plus the special "long_range" zone (shot from the shooter's own half).
export type CourtZoneId =
  | 'extreme_left'   // Extremo Izq
  | 'lateral_left'   // Lateral Izq (anillo 6–9m, izq)
  | 'center_above'   // Centro (anillo 6–9m, centro)
  | 'lateral_right'  // Lateral Der (anillo 6–9m, der)
  | 'extreme_right'  // Extremo Der
  | 'near_left'      // Cerca Izq (abajo del 9m)
  | 'near_center'    // Pivote
  | 'near_right'     // Cerca Der
  | '7m'             // Penal
  | 'long_range';    // Arco-a-Arco (tirado desde la propia mitad)

// ─── Goal quadrants (9-grid inside the goal) ───────────────────────────
export type GoalQuadrantId =
  | 'tl' | 'tc' | 'tr'
  | 'ml' | 'mc' | 'mr'
  | 'bl' | 'bc' | 'br';

// Plus meta-regions for where the shot ended up, outside the 9-grid:
export type GoalZoneId = GoalQuadrantId | 'post' | 'out';
//   post  → travesaño / palo (lo tocó el arco, no entró)
//   out   → fuera del arco (disparo que no fue al 3x3 ni al palo)

// ─── Event types ────────────────────────────────────────────────────────
export type EventType =
  | 'goal'
  | 'miss'
  | 'saved'
  | 'post'
  | 'turnover'
  | 'timeout'
  | 'exclusion'   // 2 minutos
  | 'red_card'
  | 'blue_card'
  | 'yellow_card'
  | 'half_time';

// Which events involve an attempt at goal (shot-family events).
// A miss/save/post on its own is still a shot attempt.
export const SHOT_EVENTS: readonly EventType[] = ['goal', 'miss', 'saved', 'post'] as const;

export const isShotEvent = (t: EventType): boolean =>
  (SHOT_EVENTS as readonly string[]).includes(t);

// ─── Side playing ─────────────────────────────────────────────────────
export type Team = 'home' | 'away';

// ─── Situation on court ────────────────────────────────────────────────
export type Situation = 'igualdad' | 'superioridad' | 'inferioridad';

// ─── Throw style ──────────────────────────────────────────────────────
export type ThrowType = 'salto' | 'habilidad' | 'finta' | 'penetracion' | 'otro';

// ─── Person refs (embedded, denormalized in events) ───────────────────
export interface PersonRef {
  name: string;
  number: number;
}

// ─── Event domain object ──────────────────────────────────────────────
// This is the in-app shape. Mappers in events.ts convert DB rows to this.
export interface HandballEvent {
  id: string;
  min: number;                       // minute 1..60
  team: Team;
  type: EventType;

  // Spatial — present only for relevant event types
  zone?: CourtZoneId | null;
  goalZone?: GoalZoneId | null;      // cuadrante del arco o meta-region

  // Context
  situation?: Situation | null;
  throwType?: ThrowType | null;

  // Participants
  shooter?: PersonRef | null;
  goalkeeper?: PersonRef | null;
  sanctioned?: PersonRef | null;

  // Running score snapshot (set at persistence time)
  hScore: number;
  aScore: number;

  // Quick mode flag — when true, event was logged without full tagging
  quickMode: boolean;
  completed: boolean;
}

// ─── Match ─────────────────────────────────────────────────────────────
export type MatchStatus = 'idle' | 'live' | 'closed';

export interface MatchSummary {
  id: string;
  home: string;
  away: string;
  hs: number;
  as: number;
  date: string | null;
  competition: string | null;
  homeColor: string;
  awayColor: string;
  events: HandballEvent[];
}

// ─── Team & player ─────────────────────────────────────────────────────
export interface Player {
  id: string;
  name: string;
  number: number;
  position: string;
}

export interface HandballTeam {
  id: string;
  name: string;
  color: string;
  players: Player[];
}
