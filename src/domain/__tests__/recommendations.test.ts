import { describe, it, expect } from 'vitest';
import {
  recommendedPlayersForZone,
  eventChangesPossession,
  otherTeam,
} from '../recommendations';
import type { Player } from '../types';

const mkPlayer = (id: string, name: string, number: number, position: string): Player => ({
  id,
  name,
  number,
  position,
});

describe('recommendedPlayersForZone', () => {
  const roster: Player[] = [
    mkPlayer('1', 'Arquero',     1,  'Arquero'),
    mkPlayer('2', 'Armador1',    7,  'Armador'),
    mkPlayer('3', 'Armador2',    11, 'Armador'),
    mkPlayer('4', 'LatIzq1',     5,  'Lateral Izq.'),
    mkPlayer('5', 'LatIzq2',     12, 'Lateral Izq.'),
    mkPlayer('6', 'LatDer',      8,  'Lateral Der.'),
    mkPlayer('7', 'ExtIzq',      4,  'Extremo Izq.'),
    mkPlayer('8', 'ExtDer',      9,  'Extremo Der.'),
    mkPlayer('9', 'Pivote',      6,  'Pivote'),
    mkPlayer('10','Campo',       3,  'Campo'),
  ];

  it('returns nothing recommended when zone is null', () => {
    const { recommended, rest } = recommendedPlayersForZone(roster, null);
    expect(recommended).toEqual([]);
    expect(rest).toHaveLength(roster.length);
  });

  it('extremo_left → only the left wing', () => {
    const { recommended } = recommendedPlayersForZone(roster, 'extreme_left');
    expect(recommended.map((p) => p.id)).toEqual(['7']);
  });

  it('extremo_right → only the right wing', () => {
    const { recommended } = recommendedPlayersForZone(roster, 'extreme_right');
    expect(recommended.map((p) => p.id)).toEqual(['8']);
  });

  it('lateral_left → first laterals (sorted by number), then armadores (sorted by number)', () => {
    const { recommended } = recommendedPlayersForZone(roster, 'lateral_left');
    // LI #5 (id 4), LI #12 (id 5), then Armador #7 (id 2), Armador #11 (id 3)
    expect(recommended.map((p) => p.id)).toEqual(['4', '5', '2', '3']);
  });

  it('center_above → armadores first, then laterals', () => {
    const { recommended } = recommendedPlayersForZone(roster, 'center_above');
    // Armador #7, Armador #11, LI #5, LI #12, LD #8
    expect(recommended.map((p) => p.id)).toEqual(['2', '3', '4', '5', '6']);
  });

  it('near_center (pivote) → only pivote', () => {
    const { recommended } = recommendedPlayersForZone(roster, 'near_center');
    expect(recommended.map((p) => p.id)).toEqual(['9']);
  });

  it('7m and long_range → no preference (everyone in rest)', () => {
    expect(recommendedPlayersForZone(roster, '7m').recommended).toEqual([]);
    expect(recommendedPlayersForZone(roster, 'long_range').recommended).toEqual([]);
  });

  it('rest contains everyone not in recommended', () => {
    const { recommended, rest } = recommendedPlayersForZone(roster, 'lateral_left');
    const all = new Set([...recommended.map((p) => p.id), ...rest.map((p) => p.id)]);
    expect(all.size).toBe(roster.length);
    // No duplicates between groups
    const recIds = new Set(recommended.map((p) => p.id));
    expect(rest.every((p) => !recIds.has(p.id))).toBe(true);
  });

  it('handles empty roster', () => {
    const { recommended, rest } = recommendedPlayersForZone([], 'lateral_left');
    expect(recommended).toEqual([]);
    expect(rest).toEqual([]);
  });
});

describe('eventChangesPossession', () => {
  it('shot events change possession', () => {
    expect(eventChangesPossession('goal')).toBe(true);
    expect(eventChangesPossession('miss')).toBe(true);
    expect(eventChangesPossession('saved')).toBe(true);
    expect(eventChangesPossession('post')).toBe(true);
  });

  it('turnover changes possession', () => {
    expect(eventChangesPossession('turnover')).toBe(true);
  });

  it('non-shot game-state events do NOT change possession', () => {
    expect(eventChangesPossession('timeout')).toBe(false);
    expect(eventChangesPossession('exclusion')).toBe(false);
    expect(eventChangesPossession('red_card')).toBe(false);
    expect(eventChangesPossession('blue_card')).toBe(false);
    expect(eventChangesPossession('yellow_card')).toBe(false);
    expect(eventChangesPossession('half_time')).toBe(false);
  });
});

describe('otherTeam', () => {
  it('flips home and away', () => {
    expect(otherTeam('home')).toBe('away');
    expect(otherTeam('away')).toBe('home');
  });
});
