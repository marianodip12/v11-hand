import { describe, expect, it } from 'vitest';
import {
  buildGoalkeeperMap,
  buildHeatCounts,
  buildHeatCountsByTeam,
  buildScorers,
  buildSeasonStats,
  computeMatchStats,
} from '../stats';
import type {
  CourtZoneId,
  EventType,
  HandballEvent,
  MatchSummary,
  Team,
} from '../types';

// Factory
const mk = (p: Partial<HandballEvent> & { type: EventType; team: Team }): HandballEvent => ({
  id: crypto.randomUUID(),
  min: 1,
  hScore: 0,
  aScore: 0,
  quickMode: false,
  completed: true,
  ...p,
});

const mkMatch = (p: Partial<MatchSummary> & Pick<MatchSummary, 'home' | 'away' | 'hs' | 'as'>): MatchSummary => ({
  id: crypto.randomUUID(),
  date: '01/01',
  competition: 'Liga',
  homeColor: '#3B82F6',
  awayColor: '#64748B',
  events: [],
  ...p,
});

describe('computeMatchStats', () => {
  it('returns all-zeros for an empty match', () => {
    const s = computeMatchStats([]);
    expect(s.homeGoals).toBe(0);
    expect(s.awayGoals).toBe(0);
    expect(s.homeShots).toBe(0);
    expect(s.awayShots).toBe(0);
    expect(s.homePct).toBe(0);
    expect(s.awayPct).toBe(0);
    expect(s.rivalGKPct).toBe(0);
    expect(s.homeGKPct).toBe(0);
  });

  it('counts goals, misses, saves and posts as shots', () => {
    const events = [
      mk({ type: 'goal',  team: 'home' }),
      mk({ type: 'goal',  team: 'home' }),
      mk({ type: 'miss',  team: 'home' }),
      mk({ type: 'saved', team: 'home' }),
      mk({ type: 'post',  team: 'home' }),
    ];
    const s = computeMatchStats(events);
    expect(s.homeGoals).toBe(2);
    expect(s.homeShots).toBe(5);   // 2 goals + 1 miss + 1 saved + 1 post
  });

  it('computes on-target separately from total shots', () => {
    const events = [
      mk({ type: 'goal',  team: 'home' }),
      mk({ type: 'goal',  team: 'home' }),
      mk({ type: 'saved', team: 'home' }),  // on target
      mk({ type: 'miss',  team: 'home' }),  // not on target
      mk({ type: 'post',  team: 'home' }),  // not on target
    ];
    const s = computeMatchStats(events);
    expect(s.homeOnTarget).toBe(3);        // 2 goals + 1 saved
    expect(s.homeShots).toBe(5);
    expect(s.homePost).toBe(1);
  });

  it('computes goal conversion percentage', () => {
    const events = [
      // home: 3 goals / 5 shots = 60%
      mk({ type: 'goal',  team: 'home' }),
      mk({ type: 'goal',  team: 'home' }),
      mk({ type: 'goal',  team: 'home' }),
      mk({ type: 'miss',  team: 'home' }),
      mk({ type: 'saved', team: 'home' }),
    ];
    expect(computeMatchStats(events).homePct).toBe(60);
  });

  it('rival GK % is saves / (saves + goals) against them', () => {
    // rival GK sees home shots. home took: 3 goals + 2 saved + 1 miss.
    // "on target" = goal + saved = 5. saves = 2. pct = 40%.
    const events = [
      mk({ type: 'goal',  team: 'home' }),
      mk({ type: 'goal',  team: 'home' }),
      mk({ type: 'goal',  team: 'home' }),
      mk({ type: 'saved', team: 'home' }),
      mk({ type: 'saved', team: 'home' }),
      mk({ type: 'miss',  team: 'home' }),  // not on target, excluded
    ];
    const s = computeMatchStats(events);
    expect(s.rivalGKTotal).toBe(5);
    expect(s.rivalGKSaved).toBe(2);
    expect(s.rivalGKPct).toBe(40);
  });

  it('counts 7m penalties by zone, not by type', () => {
    const events = [
      mk({ type: 'goal', team: 'home', zone: '7m' as CourtZoneId }),
      mk({ type: 'miss', team: 'home', zone: '7m' as CourtZoneId }),
      mk({ type: 'goal', team: 'away', zone: '7m' as CourtZoneId }),
      mk({ type: 'goal', team: 'home', zone: 'center_above' }),
    ];
    const s = computeMatchStats(events);
    expect(s.homePenals).toBe(2);
    expect(s.awayPenals).toBe(1);
  });

  it('counts exclusions, timeouts and turnovers per team', () => {
    const events = [
      mk({ type: 'exclusion', team: 'home' }),
      mk({ type: 'exclusion', team: 'home' }),
      mk({ type: 'exclusion', team: 'away' }),
      mk({ type: 'timeout', team: 'home' }),
      mk({ type: 'turnover', team: 'away' }),
      mk({ type: 'turnover', team: 'away' }),
    ];
    const s = computeMatchStats(events);
    expect(s.homeExcl).toBe(2);
    expect(s.awayExcl).toBe(1);
    expect(s.homeTm).toBe(1);
    expect(s.awayTm).toBe(0);
    expect(s.homeTurnover).toBe(0);
    expect(s.awayTurnover).toBe(2);
  });
});

describe('buildGoalkeeperMap', () => {
  it('returns empty result for no events', () => {
    const map = buildGoalkeeperMap([], 'home');
    expect(map.named).toEqual([]);
    expect(map.quick).toBeNull();
  });

  it('aggregates named GKs from the opposing side of shooting team', () => {
    const rivalGK = { name: 'Rival GK', number: 12 };
    const events = [
      mk({ type: 'goal',  team: 'home', goalkeeper: rivalGK, goalZone: 'tl' }),
      mk({ type: 'saved', team: 'home', goalkeeper: rivalGK, goalZone: 'tr' }),
      mk({ type: 'saved', team: 'home', goalkeeper: rivalGK, goalZone: 'tl' }),
      mk({ type: 'miss',  team: 'home', goalkeeper: rivalGK, goalZone: 'out' }),
    ];
    const { named } = buildGoalkeeperMap(events, 'home');
    expect(named).toHaveLength(1);
    expect(named[0].name).toBe('Rival GK');
    expect(named[0].total).toBe(4);
    expect(named[0].goals).toBe(1);
    expect(named[0].saved).toBe(2);
    expect(named[0].miss).toBe(1);
    // 3x3 aggregation: tl got 1 goal + 1 save, tr got 1 save
    expect(named[0].byQuadrant.tl.total).toBe(2);
    expect(named[0].byQuadrant.tl.goals).toBe(1);
    expect(named[0].byQuadrant.tl.saved).toBe(1);
    expect(named[0].byQuadrant.tr.saved).toBe(1);
    // "out" is a meta-region, not a quadrant — should NOT aggregate to any quadrant
    expect(named[0].byQuadrant.mc.total).toBe(0);
  });

  it('groups quickMode events separately', () => {
    const events = [
      mk({ type: 'goal',  team: 'home', quickMode: true }),
      mk({ type: 'saved', team: 'home', quickMode: true }),
      mk({ type: 'miss',  team: 'home', quickMode: true }),
    ];
    const map = buildGoalkeeperMap(events, 'home');
    expect(map.named).toEqual([]);
    expect(map.quick).toEqual({ goals: 1, saved: 1, miss: 1, total: 3 });
  });

  it('sorts named GKs by total shots faced, descending', () => {
    const gk1 = { name: 'GK Uno',  number: 1 };
    const gk2 = { name: 'GK Dos',  number: 2 };
    const events = [
      mk({ type: 'saved', team: 'home', goalkeeper: gk1, goalZone: 'mc' }),
      mk({ type: 'saved', team: 'home', goalkeeper: gk2, goalZone: 'mc' }),
      mk({ type: 'saved', team: 'home', goalkeeper: gk2, goalZone: 'mc' }),
      mk({ type: 'goal',  team: 'home', goalkeeper: gk2, goalZone: 'mc' }),
    ];
    const { named } = buildGoalkeeperMap(events, 'home');
    expect(named.map((g) => g.name)).toEqual(['GK Dos', 'GK Uno']);
  });

  it('ignores shots from the other team', () => {
    const gk = { name: 'GK', number: 1 };
    const events = [
      mk({ type: 'goal', team: 'home', goalkeeper: gk, goalZone: 'mc' }),
      mk({ type: 'goal', team: 'away', goalkeeper: gk, goalZone: 'mc' }),
    ];
    expect(buildGoalkeeperMap(events, 'home').named[0].total).toBe(1);
    expect(buildGoalkeeperMap(events, 'away').named[0].total).toBe(1);
  });

  it('ignores non-shot events', () => {
    const gk = { name: 'GK', number: 1 };
    const events = [
      mk({ type: 'exclusion', team: 'home', goalkeeper: gk }),
      mk({ type: 'timeout', team: 'home', goalkeeper: gk }),
      mk({ type: 'post', team: 'home', goalkeeper: gk, goalZone: 'post' }),
    ];
    expect(buildGoalkeeperMap(events, 'home').named).toEqual([]);
  });
});

describe('buildHeatCounts / buildHeatCountsByTeam', () => {
  it('counts occurrences by zone', () => {
    const events = [
      mk({ type: 'goal', team: 'home', zone: 'center_above' }),
      mk({ type: 'miss', team: 'home', zone: 'center_above' }),
      mk({ type: 'goal', team: 'home', zone: 'near_center' }),
      mk({ type: 'goal', team: 'away', zone: 'near_center' }),
    ];
    expect(buildHeatCounts(events)).toEqual({
      center_above: 2,
      near_center: 2,
    });
  });

  it('filters by team when requested', () => {
    const events = [
      mk({ type: 'goal', team: 'home', zone: 'center_above' }),
      mk({ type: 'goal', team: 'away', zone: 'center_above' }),
      mk({ type: 'goal', team: 'home', zone: 'extreme_left' }),
    ];
    expect(buildHeatCountsByTeam(events, 'home')).toEqual({
      center_above: 1,
      extreme_left: 1,
    });
    expect(buildHeatCountsByTeam(events, 'away')).toEqual({
      center_above: 1,
    });
  });

  it('ignores events without a zone', () => {
    const events = [
      mk({ type: 'timeout', team: 'home' }),  // no zone
      mk({ type: 'goal', team: 'home', zone: 'center_above' }),
    ];
    expect(buildHeatCounts(events)).toEqual({ center_above: 1 });
  });
});

describe('buildScorers', () => {
  it('aggregates goals per shooter and sorts descending', () => {
    const leo   = { name: 'Leo',   number: 10 };
    const diego = { name: 'Diego', number: 7  };
    const events = [
      mk({ type: 'goal', team: 'home', shooter: leo }),
      mk({ type: 'goal', team: 'home', shooter: leo }),
      mk({ type: 'goal', team: 'home', shooter: leo }),
      mk({ type: 'goal', team: 'home', shooter: diego }),
      mk({ type: 'miss', team: 'home', shooter: leo }),  // missed, not counted
    ];
    const scorers = buildScorers(events);
    expect(scorers.map((s) => [s.name, s.goals])).toEqual([
      ['Leo', 3],
      ['Diego', 1],
    ]);
  });

  it('keeps same-named shooters in different teams separate', () => {
    const sharedName = { name: 'Juan', number: 10 };
    const events = [
      mk({ type: 'goal', team: 'home', shooter: sharedName }),
      mk({ type: 'goal', team: 'away', shooter: sharedName }),
    ];
    expect(buildScorers(events)).toHaveLength(2);
  });

  it('skips goals without an attributed shooter', () => {
    const events = [
      mk({ type: 'goal', team: 'home', shooter: null }),
      mk({ type: 'goal', team: 'home', shooter: { name: 'X', number: 1 } }),
    ];
    expect(buildScorers(events).map((s) => s.name)).toEqual(['X']);
  });
});

describe('buildSeasonStats', () => {
  it('returns zeros for a team that has no matches', () => {
    expect(buildSeasonStats([], 'Atlético')).toEqual({
      w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, total: 0,
    });
  });

  it('tallies wins, draws and losses regardless of home/away', () => {
    const matches = [
      mkMatch({ home: 'Atlético', away: 'River', hs: 25, as: 20 }),  // W
      mkMatch({ home: 'Boca',     away: 'Atlético', hs: 22, as: 22 }), // D
      mkMatch({ home: 'Atlético', away: 'Boca', hs: 18, as: 24 }),  // L
    ];
    expect(buildSeasonStats(matches, 'Atlético')).toEqual({
      w: 1, d: 1, l: 1,
      gf: 25 + 22 + 18,
      ga: 20 + 22 + 24,
      pts: 1 * 2 + 1,
      total: 3,
    });
  });

  it('ignores matches where the team was not playing', () => {
    const matches = [
      mkMatch({ home: 'River', away: 'Boca', hs: 20, as: 18 }),
      mkMatch({ home: 'Atlético', away: 'River', hs: 30, as: 29 }),
    ];
    const s = buildSeasonStats(matches, 'Atlético');
    expect(s.total).toBe(1);
    expect(s.w).toBe(1);
  });
});
