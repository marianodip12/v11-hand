import type { HandballEvent, MatchSummary, Team } from './types';

/**
 * Evolución — pure aggregates for the Evolution page.
 *
 * Scoped to a single match OR to the season (a list of matches).
 */

// ─── Score timeline within one match ───────────────────────────────────

export interface ScorePoint {
  minute: number;    // 0..60
  home: number;
  away: number;
  diff: number;      // home - away
}

/**
 * Builds a per-minute score timeline for one match. Starts at (0,0,0) and
 * includes every minute through the last event (clamped to 60).
 *
 * The events array can arrive in any order; we sort by minute first.
 */
export const scoreTimeline = (events: HandballEvent[]): ScorePoint[] => {
  const sorted = [...events].sort((a, b) => a.min - b.min);
  // Final minute: at least 60 to cover full-time, but never below last event
  const last = sorted.length > 0 ? sorted[sorted.length - 1].min : 0;
  const maxMinute = Math.max(60, last);

  const points: ScorePoint[] = [{ minute: 0, home: 0, away: 0, diff: 0 }];
  let h = 0, a = 0;
  let idx = 0;

  for (let m = 1; m <= maxMinute; m++) {
    while (idx < sorted.length && sorted[idx].min <= m) {
      const e = sorted[idx];
      if (e.type === 'goal') {
        if (e.team === 'home') h++; else a++;
      }
      idx++;
    }
    points.push({ minute: m, home: h, away: a, diff: h - a });
  }

  return points;
};

// ─── Longest lead / run of scoring ─────────────────────────────────────

export interface MaxRun {
  team: Team;
  count: number;            // consecutive goals by that team
  startMin: number;
  endMin: number;
}

/**
 * Finds the longest consecutive scoring run by either team in the match.
 * Returns null if there were no goals.
 */
export const longestRun = (events: HandballEvent[]): MaxRun | null => {
  const goals = events
    .filter((e) => e.type === 'goal')
    .sort((a, b) => a.min - b.min);

  if (goals.length === 0) return null;

  let best: MaxRun = {
    team: goals[0].team,
    count: 1,
    startMin: goals[0].min,
    endMin: goals[0].min,
  };
  let current: MaxRun = { ...best };

  for (let i = 1; i < goals.length; i++) {
    const g = goals[i];
    if (g.team === current.team) {
      current.count++;
      current.endMin = g.min;
    } else {
      if (current.count > best.count) best = current;
      current = { team: g.team, count: 1, startMin: g.min, endMin: g.min };
    }
  }
  if (current.count > best.count) best = current;
  return best;
};

// ─── Momentum: diff at key moments ─────────────────────────────────────

export interface MomentumSnapshot {
  minute: number;
  label: string;
  home: number;
  away: number;
  diff: number;
}

export const keyMoments = (events: HandballEvent[]): MomentumSnapshot[] => {
  const t = scoreTimeline(events);
  const at = (min: number): ScorePoint =>
    t.find((p) => p.minute === min) ?? t[t.length - 1];
  const mins = [15, 30, 45, 60];
  return mins.map((m) => {
    const p = at(m);
    const label =
      m === 15 ? 'Min 15' :
      m === 30 ? 'Descanso' :
      m === 45 ? 'Min 45' :
                 'Final';
    return { minute: m, label, home: p.home, away: p.away, diff: p.diff };
  });
};

// ─── Season-level aggregates ───────────────────────────────────────────

export type MatchResult = 'win' | 'draw' | 'loss';

export const resultFor = (m: MatchSummary, myTeamName: string): MatchResult => {
  const mine = m.home === myTeamName ? m.hs : m.as;
  const theirs = m.home === myTeamName ? m.as : m.hs;
  if (mine > theirs) return 'win';
  if (mine < theirs) return 'loss';
  return 'draw';
};

export interface SeasonPoint {
  matchId: string;
  index: number;                // 1-based chronological index
  date: string | null;
  opponent: string;
  myGoals: number;
  theirGoals: number;
  diff: number;
  result: MatchResult;
  runningWins: number;          // cumulative wins up to and including this match
  runningDraws: number;
  runningLosses: number;
  runningPoints: number;        // 3W + 1D
}

/**
 * Chronological series of results for a team's season.
 * matches are taken as-is — the caller decides the order.
 */
export const seasonTimeline = (
  matches: MatchSummary[],
  myTeamName: string,
): SeasonPoint[] => {
  let w = 0, d = 0, l = 0;
  return matches.map((m, i) => {
    const isHome = m.home === myTeamName;
    const myGoals = isHome ? m.hs : m.as;
    const theirGoals = isHome ? m.as : m.hs;
    const result = resultFor(m, myTeamName);
    if (result === 'win')  w++;
    else if (result === 'draw') d++;
    else l++;
    return {
      matchId: m.id,
      index: i + 1,
      date: m.date,
      opponent: isHome ? m.away : m.home,
      myGoals,
      theirGoals,
      diff: myGoals - theirGoals,
      result,
      runningWins: w,
      runningDraws: d,
      runningLosses: l,
      runningPoints: w * 3 + d,
    };
  });
};

export interface SeasonTotals {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  avgFor: number;
  avgAgainst: number;
}

export const seasonTotals = (
  matches: MatchSummary[],
  myTeamName: string,
): SeasonTotals => {
  let w = 0, d = 0, l = 0, gf = 0, ga = 0;
  for (const m of matches) {
    const isHome = m.home === myTeamName;
    const mine = isHome ? m.hs : m.as;
    const theirs = isHome ? m.as : m.hs;
    gf += mine;
    ga += theirs;
    const r = resultFor(m, myTeamName);
    if (r === 'win') w++;
    else if (r === 'draw') d++;
    else l++;
  }
  const played = matches.length;
  return {
    played,
    wins: w,
    draws: d,
    losses: l,
    goalsFor: gf,
    goalsAgainst: ga,
    goalDiff: gf - ga,
    points: w * 3 + d,
    avgFor: played === 0 ? 0 : Math.round((gf / played) * 10) / 10,
    avgAgainst: played === 0 ? 0 : Math.round((ga / played) * 10) / 10,
  };
};
