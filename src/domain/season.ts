import type { HandballEvent, MatchSummary, Team } from './types';
import { isShotEvent } from './types';
import { shooterKeyOf } from './analysis';

/**
 * Season-level aggregates.
 *
 * These derive views across all completed matches. We also expose a
 * filter by "myTeam" — the user's home team, as configured in settings —
 * so the numbers reflect only matches involving that team.
 */

export interface SeasonFilter {
  /** Name of the user's primary team. Matches not involving this team are excluded. */
  myTeamName: string | null;
  /** Optional competition filter. null = all. */
  competition: string | null;
}

export const EMPTY_SEASON_FILTER: SeasonFilter = {
  myTeamName: null,
  competition: null,
};

// ─── Season totals ───────────────────────────────────────────────────────

export interface SeasonTotals {
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  shots: number;
  goals: number;
  saved: number;              // our shots saved by rival GK (errors we made)
  miss: number;
  post: number;
  shotPct: number;            // goals / shots
  onTarget: number;           // goal + saved
  onTargetPct: number;        // onTarget / shots
  ourGKSaves: number;         // our GK saved rival shots
  ourGKFaced: number;         // rival shots on target
  ourGKPct: number;
  competitions: string[];     // distinct competition names across matches
}

/**
 * Figures out which team the user was in a given match ("home" or "away"),
 * or null if myTeamName didn't play this match.
 */
const sideOf = (match: MatchSummary, myTeamName: string | null): Team | null => {
  if (!myTeamName) return null;
  if (match.home === myTeamName) return 'home';
  if (match.away === myTeamName) return 'away';
  return null;
};

export const filterMatches = (
  matches: MatchSummary[],
  f: SeasonFilter,
): MatchSummary[] =>
  matches.filter((m) => {
    if (f.myTeamName && sideOf(m, f.myTeamName) === null) return false;
    if (f.competition && m.competition !== f.competition) return false;
    return true;
  });

export const computeSeasonTotals = (
  matches: MatchSummary[],
  f: SeasonFilter,
): SeasonTotals => {
  const relevant = filterMatches(matches, f);
  const competitions = Array.from(
    new Set(matches.map((m) => m.competition).filter((c): c is string => !!c)),
  ).sort();

  let wins = 0, draws = 0, losses = 0;
  let goalsFor = 0, goalsAgainst = 0;
  let shots = 0, goals = 0, saved = 0, miss = 0, post = 0;
  let ourGKSaves = 0, ourGKFaced = 0;

  for (const m of relevant) {
    const me = sideOf(m, f.myTeamName);
    // When no myTeam filter, attribute stats to 'home' side for comparability.
    const mySide: Team = me ?? 'home';
    const myScore = mySide === 'home' ? m.hs : m.as;
    const theirScore = mySide === 'home' ? m.as : m.hs;

    if (myScore > theirScore)      wins++;
    else if (myScore < theirScore) losses++;
    else                           draws++;
    goalsFor += myScore;
    goalsAgainst += theirScore;

    for (const e of m.events) {
      // Shot stats for my side
      if (isShotEvent(e.type) && e.team === mySide) {
        shots++;
        if (e.type === 'goal')       goals++;
        else if (e.type === 'saved') saved++;
        else if (e.type === 'miss')  miss++;
        else if (e.type === 'post')  post++;
      }
      // Our GK faces shots from the OTHER side that reach the goal
      if ((e.type === 'goal' || e.type === 'saved') && e.team !== mySide) {
        ourGKFaced++;
        if (e.type === 'saved') ourGKSaves++;
      }
    }
  }

  const onTarget = goals + saved;
  return {
    matchesPlayed: relevant.length,
    wins, draws, losses,
    goalsFor, goalsAgainst,
    goalDiff: goalsFor - goalsAgainst,
    shots, goals, saved, miss, post,
    shotPct: shots === 0 ? 0 : Math.round((goals / shots) * 100),
    onTarget,
    onTargetPct: shots === 0 ? 0 : Math.round((onTarget / shots) * 100),
    ourGKSaves,
    ourGKFaced,
    ourGKPct: ourGKFaced === 0 ? 0 : Math.round((ourGKSaves / ourGKFaced) * 100),
    competitions,
  };
};

// ─── Per-match point in the evolution timeline ───────────────────────────

export interface MatchPoint {
  id: string;
  label: string;            // short label (opponent name)
  date: string | null;      // dd/mm format from MatchSummary
  result: 'W' | 'D' | 'L';
  myScore: number;
  theirScore: number;
  goalDiff: number;
  shotPct: number;          // our shot conversion %
  gkPct: number;            // our GK save %
  shots: number;
  goals: number;
  competition: string | null;
}

export const toMatchPoints = (
  matches: MatchSummary[],
  f: SeasonFilter,
): MatchPoint[] => {
  const relevant = filterMatches(matches, f);
  return relevant.map((m) => {
    const me = sideOf(m, f.myTeamName) ?? 'home';
    const myScore = me === 'home' ? m.hs : m.as;
    const theirScore = me === 'home' ? m.as : m.hs;
    const opp = me === 'home' ? m.away : m.home;

    let shots = 0, goals = 0, gkFaced = 0, gkSaves = 0;
    for (const e of m.events) {
      if (isShotEvent(e.type) && e.team === me) {
        shots++;
        if (e.type === 'goal') goals++;
      }
      if ((e.type === 'goal' || e.type === 'saved') && e.team !== me) {
        gkFaced++;
        if (e.type === 'saved') gkSaves++;
      }
    }

    return {
      id: m.id,
      label: opp,
      date: m.date,
      result: myScore > theirScore ? 'W' : myScore < theirScore ? 'L' : 'D',
      myScore,
      theirScore,
      goalDiff: myScore - theirScore,
      shotPct: shots === 0 ? 0 : Math.round((goals / shots) * 100),
      gkPct: gkFaced === 0 ? 0 : Math.round((gkSaves / gkFaced) * 100),
      shots,
      goals,
      competition: m.competition,
    };
  });
};

// ─── Top scorers across the season ───────────────────────────────────────

export interface SeasonScorer {
  key: string;
  name: string;
  number: number;
  matches: number;
  shots: number;
  goals: number;
  pct: number;
  avgPerMatch: number;
}

export const topScorers = (
  matches: MatchSummary[],
  f: SeasonFilter,
  limit = 10,
): SeasonScorer[] => {
  const relevant = filterMatches(matches, f);
  const acc = new Map<string, SeasonScorer & { matchIds: Set<string> }>();

  for (const m of relevant) {
    const me = sideOf(m, f.myTeamName) ?? 'home';
    for (const e of m.events) {
      if (!isShotEvent(e.type) || e.team !== me || !e.shooter) continue;
      const key = shooterKeyOf(e);
      if (!key) continue;
      let s = acc.get(key);
      if (!s) {
        s = {
          key,
          name: e.shooter.name,
          number: e.shooter.number,
          matches: 0,
          shots: 0,
          goals: 0,
          pct: 0,
          avgPerMatch: 0,
          matchIds: new Set(),
        };
        acc.set(key, s);
      }
      s.matchIds.add(m.id);
      s.shots++;
      if (e.type === 'goal') s.goals++;
    }
  }

  const arr = Array.from(acc.values()).map((s) => {
    s.matches = s.matchIds.size;
    s.pct = s.shots === 0 ? 0 : Math.round((s.goals / s.shots) * 100);
    s.avgPerMatch = s.matches === 0 ? 0 : Math.round((s.goals / s.matches) * 10) / 10;
    return s as SeasonScorer;
  });

  arr.sort((a, b) => b.goals - a.goals || b.pct - a.pct || a.name.localeCompare(b.name));
  return arr.slice(0, limit);
};

/**
 * Rolling average — used in the evolution view to smooth noisy per-match
 * numbers. Returns the average of the last `window` values up to and
 * including the current index.
 */
export const rollingAverage = (values: number[], window: number): number[] => {
  if (window <= 1) return values.slice();
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    out.push(Math.round(avg * 10) / 10);
  }
  return out;
};

/** Re-export useful for consumer UIs that need the HandballEvent type */
export type { HandballEvent };
