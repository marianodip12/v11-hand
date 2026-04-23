import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILTER,
  activeChips,
  applyFilter,
  isEmptyFilter,
  perQuadrant,
  perShooter,
  perZone,
  shooterKeyOf,
  summarize,
  toggleQuadrant,
  toggleShooter,
  toggleTeam,
  toggleZone,
  type FilterLabels,
} from '../analysis';
import type { HandballEvent, EventType, Team, CourtZoneId, GoalZoneId } from '../types';

const mk = (p: Partial<HandballEvent> & { type: EventType; team: Team }): HandballEvent => ({
  id: crypto.randomUUID(),
  min: 1,
  hScore: 0,
  aScore: 0,
  quickMode: false,
  completed: true,
  ...p,
});

const LEO = { name: 'Leo',   number: 10 };
const ANA = { name: 'Ana',   number: 7  };

describe('EMPTY_FILTER / isEmptyFilter', () => {
  it('the empty filter has all dimensions null', () => {
    expect(isEmptyFilter(EMPTY_FILTER)).toBe(true);
  });

  it('setting any dimension makes the filter non-empty', () => {
    expect(isEmptyFilter({ ...EMPTY_FILTER, team: 'home' })).toBe(false);
    expect(isEmptyFilter({ ...EMPTY_FILTER, zone: 'center_above' })).toBe(false);
    expect(isEmptyFilter({ ...EMPTY_FILTER, types: ['goal'] })).toBe(false);
  });
});

describe('applyFilter', () => {
  const events = [
    mk({ type: 'goal',  team: 'home', zone: 'center_above', goalZone: 'tl', shooter: LEO }),
    mk({ type: 'miss',  team: 'home', zone: 'center_above', goalZone: 'out', shooter: LEO }),
    mk({ type: 'goal',  team: 'home', zone: 'lateral_left', goalZone: 'tl', shooter: ANA }),
    mk({ type: 'saved', team: 'away', zone: 'center_above', goalZone: 'tl' }),
    mk({ type: 'goal',  team: 'away', zone: 'near_center', goalZone: 'bc' }),
  ];

  it('returns everything with an empty filter', () => {
    expect(applyFilter(events, EMPTY_FILTER)).toEqual(events);
  });

  it('filters by team', () => {
    expect(applyFilter(events, { ...EMPTY_FILTER, team: 'home' })).toHaveLength(3);
    expect(applyFilter(events, { ...EMPTY_FILTER, team: 'away' })).toHaveLength(2);
  });

  it('filters by court zone', () => {
    expect(applyFilter(events, { ...EMPTY_FILTER, zone: 'center_above' })).toHaveLength(3);
  });

  it('filters by quadrant', () => {
    expect(applyFilter(events, { ...EMPTY_FILTER, quadrant: 'tl' })).toHaveLength(3);
  });

  it('filters by shooter', () => {
    const leoKey = shooterKeyOf(events[0])!;
    expect(applyFilter(events, { ...EMPTY_FILTER, shooterKey: leoKey })).toHaveLength(2);
  });

  it('filters by types (AND between dimensions, OR inside types array)', () => {
    expect(applyFilter(events, { ...EMPTY_FILTER, types: ['goal'] })).toHaveLength(3);
    expect(applyFilter(events, { ...EMPTY_FILTER, types: ['goal', 'saved'] })).toHaveLength(4);
  });

  it('combines dimensions with AND semantics', () => {
    const f = {
      ...EMPTY_FILTER,
      team: 'home' as Team,
      zone: 'center_above' as CourtZoneId,
      quadrant: 'tl' as const,
    };
    // Home + center_above + tl quadrant → only event 0
    const r = applyFilter(events, f);
    expect(r).toHaveLength(1);
    expect(r[0].type).toBe('goal');
    expect(r[0].shooter).toEqual(LEO);
  });

  it('is pure: does not mutate the input events array', () => {
    const snapshot = [...events];
    applyFilter(events, { ...EMPTY_FILTER, team: 'home' });
    expect(events).toEqual(snapshot);
  });
});

describe('toggle*', () => {
  it('toggleTeam sets and clears', () => {
    expect(toggleTeam(EMPTY_FILTER, 'home').team).toBe('home');
    expect(toggleTeam({ ...EMPTY_FILTER, team: 'home' }, 'home').team).toBeNull();
    // Switching to a different team replaces the value, not clears it
    expect(toggleTeam({ ...EMPTY_FILTER, team: 'home' }, 'away').team).toBe('away');
  });

  it('toggleZone sets and clears', () => {
    expect(toggleZone(EMPTY_FILTER, 'center_above').zone).toBe('center_above');
    expect(toggleZone({ ...EMPTY_FILTER, zone: 'center_above' }, 'center_above').zone).toBeNull();
  });

  it('toggleQuadrant sets and clears', () => {
    expect(toggleQuadrant(EMPTY_FILTER, 'tl').quadrant).toBe('tl');
    expect(toggleQuadrant({ ...EMPTY_FILTER, quadrant: 'tl' }, 'tl').quadrant).toBeNull();
  });

  it('toggleShooter sets and clears', () => {
    expect(toggleShooter(EMPTY_FILTER, '10#Leo').shooterKey).toBe('10#Leo');
    expect(toggleShooter({ ...EMPTY_FILTER, shooterKey: '10#Leo' }, '10#Leo').shooterKey).toBeNull();
  });
});

describe('summarize', () => {
  it('returns zeros for no events', () => {
    expect(summarize([])).toEqual({
      events: 0, shots: 0, goals: 0, saved: 0, miss: 0, out: 0, post: 0, pct: 0,
    });
  });

  it('counts shots and computes %', () => {
    const evs = [
      mk({ type: 'goal',  team: 'home' }),
      mk({ type: 'goal',  team: 'home' }),
      mk({ type: 'saved', team: 'home' }),
      mk({ type: 'miss',  team: 'home' }),
      mk({ type: 'post',  team: 'home' }),
    ];
    const s = summarize(evs);
    expect(s.events).toBe(5);
    expect(s.shots).toBe(5);
    expect(s.goals).toBe(2);
    expect(s.pct).toBe(40);
  });

  it('does not count non-shot events', () => {
    const evs = [
      mk({ type: 'goal', team: 'home' }),
      mk({ type: 'timeout', team: 'home' }),
      mk({ type: 'exclusion', team: 'home' }),
    ];
    const s = summarize(evs);
    expect(s.events).toBe(3);
    expect(s.shots).toBe(1);
  });
});

describe('perZone / perQuadrant', () => {
  const events = [
    mk({ type: 'goal', team: 'home', zone: 'center_above', goalZone: 'tl', shooter: LEO }),
    mk({ type: 'goal', team: 'home', zone: 'center_above', goalZone: 'bc', shooter: LEO }),
    mk({ type: 'miss', team: 'home', zone: 'lateral_left', goalZone: 'tl', shooter: ANA }),
    mk({ type: 'goal', team: 'away', zone: 'near_center', goalZone: 'tl' }),
  ];

  it('perZone counts all events by zone with empty filter', () => {
    expect(perZone(events, EMPTY_FILTER)).toEqual({
      center_above: 2,
      lateral_left: 1,
      near_center:  1,
    });
  });

  it('perZone respects other filters but ignores zone constraint', () => {
    // Even with a zone already set, perZone shows ALL zone options so the
    // user can switch. The "team: home" filter still applies.
    const f = { ...EMPTY_FILTER, team: 'home' as Team, zone: 'center_above' as CourtZoneId };
    expect(perZone(events, f)).toEqual({
      center_above: 2,
      lateral_left: 1,
    });
  });

  it('perQuadrant counts goal quadrants', () => {
    expect(perQuadrant(events, EMPTY_FILTER)).toEqual({ tl: 3, bc: 1 });
  });

  it('perQuadrant ignores non-quadrant goal zones (out/post)', () => {
    const evs = [
      mk({ type: 'goal', team: 'home', goalZone: 'tl' }),
      mk({ type: 'miss', team: 'home', goalZone: 'out' as GoalZoneId }),
      mk({ type: 'post', team: 'home', goalZone: 'post' as GoalZoneId }),
    ];
    expect(perQuadrant(evs, EMPTY_FILTER)).toEqual({ tl: 1 });
  });
});

describe('perShooter', () => {
  const events = [
    mk({ type: 'goal',  team: 'home', shooter: LEO, zone: 'center_above' }),
    mk({ type: 'goal',  team: 'home', shooter: LEO, zone: 'lateral_left' }),
    mk({ type: 'miss',  team: 'home', shooter: LEO, zone: 'center_above' }),
    mk({ type: 'goal',  team: 'home', shooter: ANA, zone: 'center_above' }),
    mk({ type: 'saved', team: 'home', shooter: ANA, zone: 'center_above' }),
  ];

  it('aggregates shots and goals per shooter', () => {
    const r = perShooter(events, EMPTY_FILTER);
    expect(r).toHaveLength(2);
    expect(r[0].name).toBe('Leo');
    expect(r[0].shots).toBe(3);
    expect(r[0].goals).toBe(2);
    expect(r[0].pct).toBe(67);
    expect(r[1].name).toBe('Ana');
    expect(r[1].shots).toBe(2);
    expect(r[1].goals).toBe(1);
  });

  it('respects zone filter without losing shooters at that zone', () => {
    const f = { ...EMPTY_FILTER, zone: 'center_above' as CourtZoneId };
    const r = perShooter(events, f);
    const leo = r.find((s) => s.name === 'Leo')!;
    const ana = r.find((s) => s.name === 'Ana')!;
    expect(leo.shots).toBe(2); // 1 goal + 1 miss at center_above
    expect(leo.goals).toBe(1);
    expect(ana.shots).toBe(2); // 1 goal + 1 saved at center_above
  });

  it('sorts by shots descending', () => {
    const r = perShooter(events, EMPTY_FILTER);
    expect(r.map((s) => s.name)).toEqual(['Leo', 'Ana']);
  });
});

describe('activeChips', () => {
  const labels: FilterLabels = {
    zone: (z) => `Z:${z}`,
    quadrant: (q) => `Q:${q}`,
    team: (t) => `T:${t}`,
    shooter: (k) => `S:${k}`,
    type: (t) => `X:${t}`,
  };

  it('empty filter yields no chips', () => {
    expect(activeChips(EMPTY_FILTER, labels)).toEqual([]);
  });

  it('renders one chip per active dimension', () => {
    const f = {
      ...EMPTY_FILTER,
      team: 'home' as Team,
      zone: 'center_above' as CourtZoneId,
      shooterKey: '10#Leo',
      types: ['goal', 'miss'] as EventType[],
    };
    const chips = activeChips(f, labels);
    expect(chips).toHaveLength(5);   // team + zone + shooter + 2 types
    expect(chips.map((c) => c.kind)).toEqual(['team', 'zone', 'shooter', 'type', 'type']);
  });

  it('remove functions produce a filter without that dimension', () => {
    const f = { ...EMPTY_FILTER, team: 'home' as Team, zone: 'center_above' as CourtZoneId };
    const chips = activeChips(f, labels);
    const teamChip = chips.find((c) => c.kind === 'team')!;
    expect(teamChip.remove(f).team).toBeNull();
    expect(teamChip.remove(f).zone).toBe('center_above');
  });
});
