import type {
  CourtZoneId,
  EventType,
  GoalQuadrantId,
  Situation,
  ThrowType,
} from './types';

// ─── Court zones metadata ──────────────────────────────────────────────
// Keep keys ordered as they appear visually on the court (left → right, top → bottom),
// with meta-zones ("7m", "long_range") at the end.
export const COURT_ZONES: Record<
  CourtZoneId,
  { label: string; short: string }
> = {
  extreme_left:  { label: 'Extremo Izq.', short: 'EI' },
  lateral_left:  { label: 'Lateral Izq.', short: 'LI' },
  center_above:  { label: 'Centro',       short: 'CE' },
  lateral_right: { label: 'Lateral Der.', short: 'LD' },
  extreme_right: { label: 'Extremo Der.', short: 'ED' },
  near_left:     { label: 'Cerca Izq.',   short: 'CI' },
  near_center:   { label: 'Pivote',       short: 'PI' },
  near_right:    { label: 'Cerca Der.',   short: 'CD' },
  '7m':          { label: '7m (penal)',   short: '7m' },
  long_range:    { label: 'Arco a Arco',  short: 'AA' },
};

// ─── Goal quadrants metadata ────────────────────────────────────────────
export const GOAL_QUADRANTS: Record<
  GoalQuadrantId,
  { label: string; row: 0 | 1 | 2; col: 0 | 1 | 2; arrow: string }
> = {
  tl: { label: 'Arriba Izq.',  row: 0, col: 0, arrow: '↖' },
  tc: { label: 'Arriba Centro',row: 0, col: 1, arrow: '↑' },
  tr: { label: 'Arriba Der.',  row: 0, col: 2, arrow: '↗' },
  ml: { label: 'Medio Izq.',   row: 1, col: 0, arrow: '←' },
  mc: { label: 'Medio Centro', row: 1, col: 1, arrow: '·' },
  mr: { label: 'Medio Der.',   row: 1, col: 2, arrow: '→' },
  bl: { label: 'Abajo Izq.',   row: 2, col: 0, arrow: '↙' },
  bc: { label: 'Abajo Centro', row: 2, col: 1, arrow: '↓' },
  br: { label: 'Abajo Der.',   row: 2, col: 2, arrow: '↘' },
};

export const GOAL_QUADRANT_ORDER: GoalQuadrantId[] = [
  'tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br',
];

// ─── Event types metadata ──────────────────────────────────────────────
// `tone` is a CSS variable name from globals.css (without --).
export const EVENT_TYPES: Record<
  EventType,
  { label: string; tone: string }
> = {
  goal:        { label: 'Gol',          tone: 'goal' },
  miss:        { label: 'Tiro errado',  tone: 'miss' },
  saved:       { label: 'Atajada',      tone: 'save' },
  post:        { label: 'Palo',         tone: 'warning' },
  turnover:    { label: 'Pérdida',      tone: 'miss' },
  timeout:     { label: 'T. Muerto',    tone: 'warning' },
  exclusion:   { label: 'Exclusión 2\'',tone: 'exclusion' },
  red_card:    { label: 'Tarjeta Roja', tone: 'danger' },
  blue_card:   { label: 'Tarjeta Azul', tone: 'primary' },
  yellow_card: { label: 'Amarilla',     tone: 'warning' },
  half_time:   { label: 'Descanso',     tone: 'card' },
};

// ─── Other catalogs ────────────────────────────────────────────────────
export const COMPETITIONS = [
  'Liga',
  'Copa',
  'Super 8',
  'Amistoso',
  'Torneo Regional',
] as const;
export type Competition = (typeof COMPETITIONS)[number];

export const POSITIONS = [
  'Arquero',
  'Armador',
  'Lateral Izq.',
  'Lateral Der.',
  'Extremo Izq.',
  'Extremo Der.',
  'Pivote',
  'Campo',
] as const;
export type Position = (typeof POSITIONS)[number];

export const SITUATIONS: Record<Situation, { label: string }> = {
  igualdad:      { label: 'Igualdad' },
  superioridad:  { label: 'Superioridad' },
  inferioridad:  { label: 'Inferioridad' },
};

export const THROW_TYPES: Record<ThrowType, { label: string }> = {
  salto:       { label: 'Salto' },
  habilidad:   { label: 'Habilidad' },
  finta:       { label: 'Finta' },
  penetracion: { label: 'Penetración' },
  otro:        { label: 'Otro' },
};

export const TEAM_COLORS = [
  '#EF4444', '#3B82F6', '#10B981', '#F59E0B',
  '#8B5CF6', '#06B6D4', '#F97316', '#EC4899',
];

// ─── Navigation ────────────────────────────────────────────────────────
export interface NavItem {
  key: string;
  path: string;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'matches',   path: '/',          label: 'Partidos'  },
  { key: 'teams',     path: '/teams',     label: 'Equipos'   },
  { key: 'live',      path: '/live',      label: 'En Vivo'   },
  { key: 'stats',     path: '/stats',     label: 'Stats'     },
  { key: 'evolution', path: '/evolution', label: 'Evolución' },
];
