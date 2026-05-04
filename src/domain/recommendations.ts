import type { CourtZoneId, EventType, Player, Team } from './types';

/**
 * Para cada zona de cancha, qué posiciones del roster deben aparecer
 * primero en el picker, en orden de preferencia.
 *
 * Reglas:
 *   - Extremos son fijos (sólo el extremo correspondiente).
 *   - Primera línea (laterales/centro): primero el específico, después armadores.
 *   - Pivote: zona 6m centro.
 *   - 7m / arco-a-arco: sin preferencia (cualquier jugador puede tirar).
 */
export const POSITION_PRIORITY_BY_ZONE: Record<CourtZoneId, string[]> = {
  extreme_left:  ['Extremo Izq.'],
  extreme_right: ['Extremo Der.'],
  lateral_left:  ['Lateral Izq.', 'Armador'],
  lateral_right: ['Lateral Der.', 'Armador'],
  center_above:  ['Armador', 'Lateral Izq.', 'Lateral Der.'],
  near_left:     ['Lateral Izq.', 'Armador'],
  near_center:   ['Pivote'],
  near_right:    ['Lateral Der.', 'Armador'],
  '7m':          [],
  long_range:    [],
};

export interface RecommendedSplit {
  recommended: Player[]; // jugadores priorizados, en orden de preferencia
  rest: Player[];        // el resto (sin orden particular salvo número)
}

/**
 * Dado un roster y una zona, separa los jugadores en "recomendados" (los de
 * las posiciones priorizadas, en el orden de la lista) y "el resto".
 *
 * Si la zona no tiene preferencia (7m, long_range) o es null, todos van a `rest`.
 */
export const recommendedPlayersForZone = (
  players: Player[],
  zone: CourtZoneId | null,
): RecommendedSplit => {
  if (!zone) return { recommended: [], rest: [...players] };
  const priorityPositions = POSITION_PRIORITY_BY_ZONE[zone];
  if (!priorityPositions || priorityPositions.length === 0) {
    return { recommended: [], rest: [...players] };
  }

  const recommended: Player[] = [];
  const used = new Set<string>();

  // Mantener orden por posición priorizada y, dentro de cada posición, por número.
  for (const pos of priorityPositions) {
    const matches = players
      .filter((p) => !used.has(p.id) && p.position === pos)
      .sort((a, b) => a.number - b.number);
    for (const p of matches) {
      recommended.push(p);
      used.add(p.id);
    }
  }

  const rest = players.filter((p) => !used.has(p.id));
  return { recommended, rest };
};

// ─── Auto-switch logic ──────────────────────────────────────────────────

/**
 * Eventos que tras registrarse cambian la posesión al equipo contrario.
 *
 * En handball federado, tras gol/atajada/palo (que va afuera)/errado/fuera/pérdida,
 * el balón pasa al rival. Eventos como timeout, exclusión, tarjetas y descanso
 * NO cambian la posesión.
 */
export const POSSESSION_CHANGING_EVENTS: ReadonlySet<EventType> = new Set<EventType>([
  'goal',
  'miss',
  'saved',
  'post',
  'turnover',
]);

export const eventChangesPossession = (type: EventType): boolean =>
  POSSESSION_CHANGING_EVENTS.has(type);

export const otherTeam = (t: Team): Team => (t === 'home' ? 'away' : 'home');
