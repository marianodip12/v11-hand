import { GOAL_QUADRANT_ORDER } from './constants';
import { isShotEvent } from './types';
import type {
  CourtZoneId,
  GoalQuadrantId,
  HandballEvent,
  MatchSummary,
  Team,
} from './types';

// ─── Match stats (aggregates per-team) ──────────────────────────────────
export interface MatchStats {
  homeGoals: number;
  awayGoals: number;
  homeShots: number;              // all shot attempts (goal+miss+save+post)
  awayShots: number;
  homeSaved: number;              // shots saved BY the home GK (i.e. saves OF away)
  awaySaved: number;              // vice versa
  homeMiss: number;
  awayMiss: number;
  homeExcl: number;
  awayExcl: number;
  homeTm: number;
  awayTm: number;
  homeTurnover: number;
  awayTurnover: number;
  homePct: number;                // goal conversion %
  awayPct: number;
  // Goalkeeper performance
  // rivalGK* = rival GK facing OUR shots → their effectiveness
  rivalGKSaved: number;
  rivalGKTotal: number;
  rivalGKPct: number;
  // homeGK* = our GK facing THEIR shots
  homeGKSaved: number;
  homeGKTotal: number;
  homeGKPct: number;
  // 7m
  homePenals: number;
  awayPenals: number;
}

const countBy = <K extends keyof HandballEvent>(
  events: HandballEvent[],
  key: K,
  value: HandballEvent[K],
  team?: Team,
): number =>
  events.reduce((acc, e) => {
    if (e[key] !== value) return acc;
    if (team && e.team !== team) return acc;
    return acc + 1;
  }, 0);

const pct = (num: number, den: number): number =>
  den === 0 ? 0 : Math.round((num / den) * 100);

export const computeMatchStats = (events: HandballEvent[]): MatchStats => {
  const homeGoals = countBy(events, 'type', 'goal', 'home');
  const awayGoals = countBy(events, 'type', 'goal', 'away');
  const homeMiss  = countBy(events, 'type', 'miss', 'home');
  const awayMiss  = countBy(events, 'type', 'miss', 'away');
  // `saved` column is stored on the TEAM whose shot was saved (i.e. the shooter's team).
  // The GK who made the save is the OPPOSING GK.
  const homeSaved = countBy(events, 'type', 'saved', 'home');
  const awaySaved = countBy(events, 'type', 'saved', 'away');
  const homePost  = countBy(events, 'type', 'post', 'home');
  const awayPost  = countBy(events, 'type', 'post', 'away');

  const homeShots = homeGoals + homeMiss + homeSaved + homePost;
  const awayShots = awayGoals + awayMiss + awaySaved + awayPost;

  const homeExcl  = countBy(events, 'type', 'exclusion', 'home');
  const awayExcl  = countBy(events, 'type', 'exclusion', 'away');
  const homeTm    = countBy(events, 'type', 'timeout', 'home');
  const awayTm    = countBy(events, 'type', 'timeout', 'away');
  const homeTurnover = countBy(events, 'type', 'turnover', 'home');
  const awayTurnover = countBy(events, 'type', 'turnover', 'away');

  // Penals = shots taken from 7m zone
  const homePenals = events.filter((e) => e.zone === '7m' && e.team === 'home').length;
  const awayPenals = events.filter((e) => e.zone === '7m' && e.team === 'away').length;

  // GK percentages
  // "rival GK" stops home shots on target. On-target = goal + saved (not miss, not post).
  const rivalGKSaved = homeSaved;
  const rivalGKTotal = homeSaved + homeGoals;
  const homeGKSaved = awaySaved;
  const homeGKTotal = awaySaved + awayGoals;

  return {
    homeGoals, awayGoals,
    homeShots, awayShots,
    homeSaved, awaySaved,
    homeMiss, awayMiss,
    homeExcl, awayExcl,
    homeTm, awayTm,
    homeTurnover, awayTurnover,
    homePct: pct(homeGoals, homeShots),
    awayPct: pct(awayGoals, awayShots),
    rivalGKSaved,
    rivalGKTotal,
    rivalGKPct: pct(rivalGKSaved, rivalGKTotal),
    homeGKSaved,
    homeGKTotal,
    homeGKPct: pct(homeGKSaved, homeGKTotal),
    homePenals,
    awayPenals,
  };
};

// ─── Goalkeeper map (per-GK, by quadrant) ───────────────────────────────
export interface GKQuadrantBucket {
  saved: number;
  goals: number;
  miss: number;
  total: number;
}

export interface NamedGKStats {
  name: string;
  number: number;
  saved: number;
  goals: number;
  miss: number;
  total: number;
  byQuadrant: Record<GoalQuadrantId, GKQuadrantBucket>;
}

export interface GoalkeeperMap {
  named: NamedGKStats[];
  quick: GKQuadrantBucket | null;
}

const emptyBucket = (): GKQuadrantBucket => ({ saved: 0, goals: 0, miss: 0, total: 0 });
const emptyByQuadrant = (): Record<GoalQuadrantId, GKQuadrantBucket> =>
  GOAL_QUADRANT_ORDER.reduce(
    (acc, q) => {
      acc[q] = emptyBucket();
      return acc;
    },
    {} as Record<GoalQuadrantId, GKQuadrantBucket>,
  );

/**
 * Builds a goalkeeper performance map for a given team's *shots*.
 *
 * Important: we pass the TEAM OF THE SHOOTER. The GKs surfaced here are
 * the opposing team's GKs (they are who makes/breaks saves against this team).
 */
export const buildGoalkeeperMap = (
  events: HandballEvent[],
  shootingTeam: Team,
): GoalkeeperMap => {
  const namedAcc: Record<string, NamedGKStats> = {};
  const quick: GKQuadrantBucket = emptyBucket();
  let hasQuick = false;

  for (const e of events) {
    if (e.team !== shootingTeam) continue;
    if (!isShotEvent(e.type) || e.type === 'post') continue;

    const bucketKey =
      e.type === 'goal' ? 'goals' :
      e.type === 'saved' ? 'saved' : 'miss';

    if (e.quickMode || !e.goalkeeper) {
      hasQuick = true;
      quick.total++;
      quick[bucketKey]++;
      continue;
    }

    const key = e.goalkeeper.name;
    if (!namedAcc[key]) {
      namedAcc[key] = {
        name: e.goalkeeper.name,
        number: e.goalkeeper.number,
        saved: 0, goals: 0, miss: 0, total: 0,
        byQuadrant: emptyByQuadrant(),
      };
    }
    const gk = namedAcc[key];
    gk.total++;
    gk[bucketKey]++;

    // goalZone may be a quadrant or a meta-region (post/out/long_range).
    // Only aggregate into the 3x3 grid if it's an actual quadrant.
    if (e.goalZone && GOAL_QUADRANT_ORDER.includes(e.goalZone as GoalQuadrantId)) {
      const q = e.goalZone as GoalQuadrantId;
      gk.byQuadrant[q].total++;
      gk.byQuadrant[q][bucketKey]++;
    }
  }

  return {
    named: Object.values(namedAcc).sort((a, b) => b.total - a.total),
    quick: hasQuick ? quick : null,
  };
};

// ─── Heatmap counts by court zone ───────────────────────────────────────
export type HeatCounts = Partial<Record<CourtZoneId, number>>;

export const buildHeatCounts = (events: HandballEvent[]): HeatCounts => {
  const c: HeatCounts = {};
  for (const e of events) {
    if (!e.zone) continue;
    c[e.zone] = (c[e.zone] ?? 0) + 1;
  }
  return c;
};

export const buildHeatCountsByTeam = (
  events: HandballEvent[],
  team: Team,
): HeatCounts => buildHeatCounts(events.filter((e) => e.team === team));

// ─── Top scorers ────────────────────────────────────────────────────────
export interface ScorerStat {
  name: string;
  number: number;
  goals: number;
  team: Team;
}

export const buildScorers = (events: HandballEvent[]): ScorerStat[] => {
  const m: Record<string, ScorerStat> = {};
  for (const e of events) {
    if (e.type !== 'goal' || !e.shooter) continue;
    const key = `${e.team}:${e.shooter.name}`;
    if (!m[key]) {
      m[key] = {
        name: e.shooter.name,
        number: e.shooter.number,
        goals: 0,
        team: e.team,
      };
    }
    m[key].goals++;
  }
  return Object.values(m).sort((a, b) => b.goals - a.goals);
};

// ─── Season stats (across completed matches) ────────────────────────────
export interface SeasonStats {
  w: number;                 // wins
  d: number;                 // draws
  l: number;                 // losses
  gf: number;                // goals for
  ga: number;                // goals against
  pts: number;               // 2W + 1D (local handball rule in the original app)
  total: number;             // total matches
}

export const buildSeasonStats = (
  completedMatches: MatchSummary[],
  myTeamName: string,
): SeasonStats => {
  let w = 0, d = 0, l = 0, gf = 0, ga = 0;
  for (const m of completedMatches) {
    const isHome = m.home === myTeamName;
    const isAway = m.away === myTeamName;
    if (!isHome && !isAway) continue;
    const myG  = isHome ? m.hs : m.as;
    const oppG = isHome ? m.as : m.hs;
    gf += myG;
    ga += oppG;
    if (myG > oppG) w++;
    else if (myG === oppG) d++;
    else l++;
  }
  return { w, d, l, gf, ga, pts: w * 2 + d, total: w + d + l };
};
