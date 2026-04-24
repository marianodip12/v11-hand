import { describe, expect, it } from 'vitest';
import {
  keyMoments,
  longestRun,
  resultFor,
  scoreTimeline,
  seasonTimeline,
  seasonTotals,
} from '../evolution';
import type { HandballEvent, EventType, Team, MatchSummary } from '../types';

const mk = (p: Partial<HandballEvent> & { type: EventType; team: Team; min: number }): HandballEvent => ({
  id: crypto.randomUUID(),
  hScore: 0,
  aScore: 0,
  quickMode: false,
  completed: true,
  ...p,
});

const match = (p: Partial<MatchSummary> & { home: string; away: string; hs: number; as: number }): MatchSummary => ({
  id: crypto.randomUUID(),
  date: '01/01',
  competition: 'Liga',
  homeColor: '#000',
  awayColor: '#fff',
  events: [],
  ...p,
});

describe('scoreTimeline', () => {
  it('starts at (0,0) and extends at least to 60', () => {
    const t = scoreTimeline([]);
    expect(t[0]).toEqual({ minute: 0, home: 0, away: 0, diff: 0 });
    expect(t[t.length - 1].minute).toBe(60);
  });

  it('accumulates only goals, one per minute', () => {
    const t = scoreTimeline([
      mk({ type: 'goal', team: 'home', min: 5 }),
      mk({ type: 'saved', team: 'home', min: 7 }),   // ignored
      mk({ type: 'goal', team: 'away', min: 10 }),
      mk({ type: 'goal', team: 'home', min: 10 }),
      mk({ type: 'turnover', team: 'home', min: 20 }),  // ignored
    ]);
    expect(t[5]).toEqual({ minute: 5, home: 1, away: 0, diff: 1 });
    expect(t[9]).toEqual({ minute: 9, home: 1, away: 0, diff: 1 });
    expect(t[10]).toEqual({ minute: 10, home: 2, away: 1, diff: 1 });
    expect(t[60].home).toBe(2);
    expect(t[60].away).toBe(1);
  });

  it('extends past 60 when a later event exists', () => {
    const t = scoreTimeline([mk({ type: 'goal', team: 'home', min: 63 })]);
    expect(t.some((p) => p.minute === 63)).toBe(true);
    expect(t[63].home).toBe(1);
  });

  it('is robust to unsorted input', () => {
    const a = scoreTimeline([
      mk({ type: 'goal', team: 'home', min: 30 }),
      mk({ type: 'goal', team: 'home', min: 10 }),
    ]);
    const b = scoreTimeline([
      mk({ type: 'goal', team: 'home', min: 10 }),
      mk({ type: 'goal', team: 'home', min: 30 }),
    ]);
    expect(a[31].home).toBe(b[31].home);
    expect(a[11].home).toBe(b[11].home);
  });
});

describe('longestRun', () => {
  it('returns null for no goals', () => {
    expect(longestRun([])).toBeNull();
  });

  it('finds the longest consecutive-team streak', () => {
    const run = longestRun([
      mk({ type: 'goal', team: 'home', min: 1 }),
      mk({ type: 'goal', team: 'home', min: 3 }),
      mk({ type: 'goal', team: 'away', min: 5 }),
      mk({ type: 'goal', team: 'home', min: 10 }),
      mk({ type: 'goal', team: 'home', min: 12 }),
      mk({ type: 'goal', team: 'home', min: 14 }),
    ]);
    expect(run?.team).toBe('home');
    expect(run?.count).toBe(3);
    expect(run?.startMin).toBe(10);
    expect(run?.endMin).toBe(14);
  });

  it('breaks ties by keeping the earlier run', () => {
    const run = longestRun([
      mk({ type: 'goal', team: 'home', min: 1 }),
      mk({ type: 'goal', team: 'home', min: 2 }),
      mk({ type: 'goal', team: 'away', min: 3 }),
      mk({ type: 'goal', team: 'away', min: 4 }),
    ]);
    // We keep the first one (count 2) because we use "strictly greater"
    expect(run?.team).toBe('home');
    expect(run?.count).toBe(2);
  });
});

describe('keyMoments', () => {
  it('reports score at 15, 30, 45, 60', () => {
    const ev = [
      mk({ type: 'goal', team: 'home', min: 5 }),
      mk({ type: 'goal', team: 'away', min: 20 }),
      mk({ type: 'goal', team: 'home', min: 40 }),
      mk({ type: 'goal', team: 'away', min: 55 }),
    ];
    const km = keyMoments(ev);
    expect(km.map((k) => k.minute)).toEqual([15, 30, 45, 60]);
    expect(km[0]).toMatchObject({ home: 1, away: 0 });     // at 15
    expect(km[1]).toMatchObject({ home: 1, away: 1 });     // at 30
    expect(km[2]).toMatchObject({ home: 2, away: 1 });     // at 45
    expect(km[3]).toMatchObject({ home: 2, away: 2 });     // at 60
  });
});

describe('resultFor', () => {
  it('returns win/draw/loss based on my team perspective', () => {
    const m = match({ home: 'A', away: 'B', hs: 20, as: 18 });
    expect(resultFor(m, 'A')).toBe('win');
    expect(resultFor(m, 'B')).toBe('loss');
    expect(resultFor({ ...m, hs: 15, as: 15 }, 'A')).toBe('draw');
  });
});

describe('seasonTimeline / seasonTotals', () => {
  const myTeam = 'GEI';
  const matches = [
    match({ home: 'GEI', away: 'Vilo', hs: 25, as: 20 }),   // win
    match({ home: 'Arg', away: 'GEI', hs: 22, as: 18 }),    // loss
    match({ home: 'GEI', away: 'LU',  hs: 17, as: 17 }),    // draw
  ];

  it('seasonTimeline yields chronological running totals', () => {
    const t = seasonTimeline(matches, myTeam);
    expect(t).toHaveLength(3);
    expect(t[0]).toMatchObject({ result: 'win', runningPoints: 3, runningWins: 1 });
    expect(t[1]).toMatchObject({ result: 'loss', runningPoints: 3, runningLosses: 1 });
    expect(t[2]).toMatchObject({ result: 'draw', runningPoints: 4, runningDraws: 1 });
  });

  it('seasonTimeline exposes opponent and my goals correctly whether home or away', () => {
    const t = seasonTimeline(matches, myTeam);
    expect(t[0]).toMatchObject({ opponent: 'Vilo', myGoals: 25, theirGoals: 20 });
    expect(t[1]).toMatchObject({ opponent: 'Arg', myGoals: 18, theirGoals: 22 });
  });

  it('seasonTotals aggregates correctly', () => {
    const s = seasonTotals(matches, myTeam);
    expect(s).toMatchObject({
      played: 3,
      wins: 1,
      draws: 1,
      losses: 1,
      goalsFor: 25 + 18 + 17,
      goalsAgainst: 20 + 22 + 17,
      points: 4,
    });
    expect(s.avgFor).toBeCloseTo(20, 1);
  });

  it('seasonTotals handles empty season', () => {
    expect(seasonTotals([], myTeam)).toMatchObject({ played: 0, points: 0, avgFor: 0 });
  });
});
