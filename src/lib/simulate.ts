import type { HandballEvent, HandballTeam, MatchSummary } from '@/domain/types';
import type { EventType, Team, CourtZoneId, GoalZoneId } from '@/domain/types';
import { newId } from '@/domain/teams';

/**
 * Builds a fully-tagged 60' match between two rosters. Realistic-ish counts:
 *   ~50-55 total shots, ~45% conversion, 6-8 exclusions, 2-3 cards, 2 TMs.
 *
 * Uses a seeded PRNG so the output is the same every time it runs —
 * this lets the dev demo always show the same distribution.
 */

// Tiny LCG so calls are deterministic
class PRNG {
  constructor(private s: number) {}
  next(): number {
    this.s = (this.s * 1103515245 + 12345) & 0x7fffffff;
    return this.s / 0x7fffffff;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  int(min: number, maxIncl: number): number {
    return min + Math.floor(this.next() * (maxIncl - min + 1));
  }
}

const ZONES: CourtZoneId[] = [
  'extreme_left', 'lateral_left', 'center_above', 'lateral_right', 'extreme_right',
  'near_left', 'near_center', 'near_right',
];
const QUADS: GoalZoneId[] = ['tl','tc','tr','ml','mc','mr','bl','bc','br'];

export interface SimulateOptions {
  home: HandballTeam;
  away: HandballTeam;
  date?: string;
  competition?: string;
  seed?: number;
}

export const simulateMatch = ({
  home,
  away,
  date = '19/04',
  competition = 'Liga',
  seed = 42,
}: SimulateOptions): MatchSummary => {
  const rng = new PRNG(seed);
  const events: HandballEvent[] = [];

  const homeField = home.players.filter((p) => !p.position.toLowerCase().startsWith('arquero'));
  const homeGK    = home.players.filter((p) =>  p.position.toLowerCase().startsWith('arquero'));
  const awayField = away.players.filter((p) => !p.position.toLowerCase().startsWith('arquero'));
  const awayGK    = away.players.filter((p) =>  p.position.toLowerCase().startsWith('arquero'));

  // Fallback: fake rival roster (only used for shooter/goalkeeper identity)
  const awayShooters = awayField.length > 0
    ? awayField.map((p) => ({ name: p.name, number: p.number }))
    : [3, 7, 8, 10, 11, 13, 15, 17].map((n) => ({ name: `#${n}`, number: n }));
  const awayGKRefs = awayGK.length > 0
    ? awayGK.map((p) => ({ name: p.name, number: p.number }))
    : [1, 16].map((n) => ({ name: `#${n}`, number: n }));

  const homeShooters = homeField.map((p) => ({ name: p.name, number: p.number }));
  const homeGKRefs   = homeGK.map((p) => ({ name: p.name, number: p.number }));

  let h = 0, a = 0;

  const pushEvent = (
    type: EventType,
    team: Team,
    extras: Partial<HandballEvent> = {},
    minute?: number,
  ) => {
    if (type === 'goal') {
      if (team === 'home') h++; else a++;
    }
    events.push({
      id: newId(),
      min: minute ?? events.length + 1,
      team,
      type,
      zone: extras.zone ?? null,
      goalZone: extras.goalZone ?? null,
      situation: null,
      throwType: null,
      shooter: extras.shooter ?? null,
      goalkeeper: extras.goalkeeper ?? null,
      sanctioned: extras.sanctioned ?? null,
      hScore: h,
      aScore: a,
      quickMode: false,
      completed: true,
    });
  };

  // Distribute ~52 shots across 60 minutes. Weights pick outcome.
  const OUTCOMES: Array<{ type: 'goal' | 'saved' | 'miss' | 'post'; weight: number }> = [
    { type: 'goal',  weight: 45 },
    { type: 'saved', weight: 30 },
    { type: 'miss',  weight: 20 },
    { type: 'post',  weight:  5 },
  ];
  const weightTotal = OUTCOMES.reduce((acc, o) => acc + o.weight, 0);
  const pickOutcome = (): 'goal' | 'saved' | 'miss' | 'post' => {
    const r = rng.next() * weightTotal;
    let cum = 0;
    for (const o of OUTCOMES) {
      cum += o.weight;
      if (r <= cum) return o.type;
    }
    return 'goal';
  };

  const totalShots = 52;
  for (let i = 0; i < totalShots; i++) {
    const minute = 1 + Math.floor((i / totalShots) * 59);
    const team: Team = rng.next() < 0.55 ? 'home' : 'away';
    const outcome = pickOutcome();

    const zone = rng.next() < 0.08 ? '7m' : rng.pick(ZONES);
    let goalZone: GoalZoneId;
    if (outcome === 'post')      goalZone = 'post';
    else if (outcome === 'miss') goalZone = rng.next() < 0.5 ? 'out' : rng.pick(QUADS);
    else                         goalZone = rng.pick(QUADS);

    const shooterPool = team === 'home' ? homeShooters : awayShooters;
    const gkPool = team === 'home' ? awayGKRefs : homeGKRefs;
    const shooter = shooterPool.length > 0 ? rng.pick(shooterPool) : null;
    const goalkeeper = (outcome === 'goal' || outcome === 'saved') && gkPool.length > 0
      ? rng.pick(gkPool)
      : null;

    pushEvent(outcome, team, { zone, goalZone, shooter, goalkeeper }, minute);
  }

  // Sprinkle non-shot events across the match
  const addScattered = (type: EventType, count: number, team: Team | null = null) => {
    for (let i = 0; i < count; i++) {
      const t = team ?? (rng.next() < 0.5 ? 'home' : 'away');
      const min = rng.int(2, 59);
      const pool = t === 'home' ? homeShooters : awayShooters;
      const person = pool.length > 0 ? rng.pick(pool) : null;
      if (type === 'exclusion' || type === 'yellow_card' || type === 'blue_card' || type === 'red_card') {
        pushEvent(type, t, { sanctioned: person }, min);
      } else if (type === 'turnover') {
        pushEvent(type, t, { shooter: person }, min);
      } else {
        pushEvent(type, t, {}, min);
      }
    }
  };

  addScattered('exclusion', 7);
  addScattered('turnover', 9);
  addScattered('timeout', 3);
  addScattered('yellow_card', 2);
  addScattered('blue_card', 1);

  // Resort by minute and recompute running scores
  events.sort((x, y) => x.min - y.min);
  let rh = 0, ra = 0;
  for (const e of events) {
    if (e.type === 'goal') {
      if (e.team === 'home') rh++; else ra++;
    }
    e.hScore = rh;
    e.aScore = ra;
  }

  return {
    id: newId(),
    home: home.name,
    away: away.name,
    hs: rh,
    as: ra,
    date,
    competition,
    homeColor: home.color,
    awayColor: away.color,
    events,
  };
};
