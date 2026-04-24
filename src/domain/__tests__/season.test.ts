import { describe, expect, it } from 'vitest';
import {
  EMPTY_SEASON_FILTER,
  computeSeasonTotals,
  filterMatches,
  rollingAverage,
  toMatchPoints,
  topScorers,
} from '../season';
import type { EventType, HandballEvent, MatchSummary, Team } from '../types';

let __id = 0;
const mkE = (p: Partial<HandballEvent> & { type: EventType; team: Team }): HandballEvent => ({
  id: `e-${++__id}`,
  min: 1,
  hScore: 0,
  aScore: 0,
  quickMode: false,
  completed: true,
  ...p,
});

const mkMatch = (over: Partial<MatchSummary>): MatchSummary => ({
  id: 'm-' + Math.random().toString(36).slice(2, 8),
  home: 'Mi Equipo',
  away: 'Rival',
  hs: 0,
  as: 0,
  date: null,
  competition: null,
  homeColor: '#000',
  awayColor: '#fff',
  events: [],
  ...over,
});

const LEO = { name: 'Leo', number: 10 };
const ANA = { name: 'Ana', number: 7 };

describe('filterMatches', () => {
  const matches = [
    mkMatch({ id: '1', home: 'Mi Equipo', away: 'A', competition: 'Liga' }),
    mkMatch({ id: '2', home: 'Mi Equipo', away: 'B', competition: 'Copa' }),
    mkMatch({ id: '3', home: 'C', away: 'Mi Equipo', competition: 'Liga' }),
    mkMatch({ id: '4', home: 'D', away: 'E', competition: 'Liga' }),
  ];

  it('returns everything with an empty filter', () => {
    expect(filterMatches(matches, EMPTY_SEASON_FILTER)).toHaveLength(4);
  });

  it('filters by myTeamName', () => {
    const r = filterMatches(matches, { ...EMPTY_SEASON_FILTER, myTeamName: 'Mi Equipo' });
    expect(r).toHaveLength(3);
    expect(r.map((m) => m.id)).toEqual(['1', '2', '3']);
  });

  it('filters by competition', () => {
    const r = filterMatches(matches, { ...EMPTY_SEASON_FILTER, competition: 'Liga' });
    expect(r).toHaveLength(3);
  });

  it('combines filters with AND', () => {
    const r = filterMatches(matches, { myTeamName: 'Mi Equipo', competition: 'Liga' });
    expect(r.map((m) => m.id)).toEqual(['1', '3']);
  });
});

describe('computeSeasonTotals', () => {
  it('returns zeros when no matches relevant', () => {
    const t = computeSeasonTotals([], EMPTY_SEASON_FILTER);
    expect(t.matchesPlayed).toBe(0);
    expect(t.wins).toBe(0);
    expect(t.shotPct).toBe(0);
  });

  it('computes wins/draws/losses from my team perspective', () => {
    const matches = [
      mkMatch({ home: 'Mi Equipo', away: 'A', hs: 10, as: 8 }),   // W
      mkMatch({ home: 'B', away: 'Mi Equipo', hs: 12, as: 12 }),  // D
      mkMatch({ home: 'Mi Equipo', away: 'C', hs: 5,  as: 9 }),   // L
    ];
    const t = computeSeasonTotals(matches, { ...EMPTY_SEASON_FILTER, myTeamName: 'Mi Equipo' });
    expect(t.matchesPlayed).toBe(3);
    expect(t.wins).toBe(1);
    expect(t.draws).toBe(1);
    expect(t.losses).toBe(1);
    expect(t.goalsFor).toBe(27);     // 10 + 12 + 5
    expect(t.goalsAgainst).toBe(29); // 8 + 12 + 9
    expect(t.goalDiff).toBe(-2);
  });

  it('computes shot stats attributed to my side', () => {
    const matches = [
      mkMatch({
        home: 'Mi Equipo', away: 'Rival', hs: 2, as: 0,
        events: [
          mkE({ type: 'goal',  team: 'home', shooter: LEO }),   // my goal
          mkE({ type: 'goal',  team: 'home', shooter: LEO }),
          mkE({ type: 'saved', team: 'home', shooter: ANA }),   // my shot saved
          mkE({ type: 'miss',  team: 'home' }),
          mkE({ type: 'saved', team: 'away' }),                  // our GK save
          mkE({ type: 'goal',  team: 'away' }),                  // rival scored on us
        ],
      }),
    ];
    const t = computeSeasonTotals(matches, { ...EMPTY_SEASON_FILTER, myTeamName: 'Mi Equipo' });
    expect(t.shots).toBe(4);
    expect(t.goals).toBe(2);
    expect(t.saved).toBe(1);
    expect(t.miss).toBe(1);
    expect(t.shotPct).toBe(50);
    expect(t.onTarget).toBe(3);
    expect(t.ourGKFaced).toBe(2);   // 1 save + 1 goal from rival
    expect(t.ourGKSaves).toBe(1);
    expect(t.ourGKPct).toBe(50);
  });

  it('handles being the away team (my team is match.away)', () => {
    const matches = [
      mkMatch({
        home: 'Rival', away: 'Mi Equipo', hs: 3, as: 5,
        events: [
          mkE({ type: 'goal',  team: 'away' }),  // my goal
          mkE({ type: 'saved', team: 'home' }),  // our GK save
        ],
      }),
    ];
    const t = computeSeasonTotals(matches, { ...EMPTY_SEASON_FILTER, myTeamName: 'Mi Equipo' });
    expect(t.goalsFor).toBe(5);
    expect(t.goalsAgainst).toBe(3);
    expect(t.wins).toBe(1);
    expect(t.goals).toBe(1);           // my team scored
    expect(t.ourGKSaves).toBe(1);
  });

  it('collects distinct competition names', () => {
    const matches = [
      mkMatch({ competition: 'Liga' }),
      mkMatch({ competition: 'Copa' }),
      mkMatch({ competition: 'Liga' }),
      mkMatch({ competition: null }),
    ];
    const t = computeSeasonTotals(matches, EMPTY_SEASON_FILTER);
    expect(t.competitions).toEqual(['Copa', 'Liga']);
  });
});

describe('toMatchPoints', () => {
  it('turns each match into a point with W/D/L and percentages', () => {
    const matches = [
      mkMatch({
        id: 'm1', home: 'Mi Equipo', away: 'A', hs: 10, as: 8,
        events: [
          mkE({ type: 'goal', team: 'home' }),
          mkE({ type: 'miss', team: 'home' }),
        ],
      }),
      mkMatch({
        id: 'm2', home: 'B', away: 'Mi Equipo', hs: 5, as: 15,
        events: [mkE({ type: 'goal', team: 'away' })],
      }),
    ];
    const pts = toMatchPoints(matches, { ...EMPTY_SEASON_FILTER, myTeamName: 'Mi Equipo' });
    expect(pts).toHaveLength(2);
    expect(pts[0]).toMatchObject({ id: 'm1', result: 'W', myScore: 10, theirScore: 8, label: 'A' });
    expect(pts[1]).toMatchObject({ id: 'm2', result: 'W', myScore: 15, theirScore: 5, label: 'B' });
  });
});

describe('topScorers', () => {
  it('aggregates goals across matches, sorted desc', () => {
    const matches = [
      mkMatch({
        home: 'Mi Equipo', away: 'A',
        events: [
          mkE({ type: 'goal', team: 'home', shooter: LEO }),
          mkE({ type: 'goal', team: 'home', shooter: LEO }),
          mkE({ type: 'goal', team: 'home', shooter: ANA }),
          mkE({ type: 'miss', team: 'home', shooter: LEO }),
        ],
      }),
      mkMatch({
        home: 'B', away: 'Mi Equipo',
        events: [
          mkE({ type: 'goal', team: 'away', shooter: ANA }),
          mkE({ type: 'goal', team: 'away', shooter: ANA }),
        ],
      }),
    ];
    const scorers = topScorers(matches, { ...EMPTY_SEASON_FILTER, myTeamName: 'Mi Equipo' });
    expect(scorers).toHaveLength(2);
    // Ana: 3 goals in 2 matches; Leo: 2 goals in 1 match
    expect(scorers[0].name).toBe('Ana');
    expect(scorers[0].goals).toBe(3);
    expect(scorers[0].matches).toBe(2);
    expect(scorers[0].avgPerMatch).toBe(1.5);
    expect(scorers[1].name).toBe('Leo');
    expect(scorers[1].goals).toBe(2);
    expect(scorers[1].pct).toBe(67); // 2 of 3 shots
  });

  it('limit truncates the list', () => {
    const matches = [
      mkMatch({
        home: 'Mi Equipo', away: 'A',
        events: [
          mkE({ type: 'goal', team: 'home', shooter: { name: 'P1', number: 1 } }),
          mkE({ type: 'goal', team: 'home', shooter: { name: 'P2', number: 2 } }),
          mkE({ type: 'goal', team: 'home', shooter: { name: 'P3', number: 3 } }),
        ],
      }),
    ];
    const s = topScorers(matches, { ...EMPTY_SEASON_FILTER, myTeamName: 'Mi Equipo' }, 2);
    expect(s).toHaveLength(2);
  });
});

describe('rollingAverage', () => {
  it('returns a copy when window is 1', () => {
    expect(rollingAverage([1, 2, 3], 1)).toEqual([1, 2, 3]);
  });

  it('averages a sliding window', () => {
    // window=3: [1], [1,2], [1,2,3], [2,3,4], [3,4,5]
    expect(rollingAverage([1, 2, 3, 4, 5], 3)).toEqual([1, 1.5, 2, 3, 4]);
  });

  it('works for shorter series than window', () => {
    expect(rollingAverage([10, 20], 5)).toEqual([10, 15]);
  });
});
