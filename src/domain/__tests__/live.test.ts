import { describe, expect, it } from 'vitest';
import {
  INITIAL_CLOCK,
  adjustClock,
  buildEvent,
  clockToMinute,
  isGoalkeeper,
  isShotDraftComplete,
  rosterKindFor,
  setClockSeconds,
  splitRoster,
  tickClock,
  wantsCourtZone,
  wantsGoalZone,
  EMPTY_DRAFT,
} from '../live';
import type { Player } from '../types';

const mkPlayer = (p: Partial<Player> & { name: string; number: number; position: string }): Player => ({
  id: crypto.randomUUID(),
  ...p,
});

describe('clockToMinute', () => {
  it('returns 0 at kickoff (no seconds ticked, first half)', () => {
    expect(clockToMinute({ seconds: 0, half: 1, running: false })).toBe(0);
  });

  it('rounds up inside the first minute', () => {
    expect(clockToMinute({ seconds: 1,  half: 1, running: true  })).toBe(1);
    expect(clockToMinute({ seconds: 30, half: 1, running: true  })).toBe(1);
    expect(clockToMinute({ seconds: 59, half: 1, running: true  })).toBe(1);
  });

  it('advances the minute on exact 60s boundaries', () => {
    expect(clockToMinute({ seconds: 60,  half: 1, running: true  })).toBe(1);
    expect(clockToMinute({ seconds: 61,  half: 1, running: true  })).toBe(2);
    expect(clockToMinute({ seconds: 120, half: 1, running: true  })).toBe(2);
    expect(clockToMinute({ seconds: 121, half: 1, running: true  })).toBe(3);
  });

  it('offsets second half by 30 minutes', () => {
    expect(clockToMinute({ seconds: 0,    half: 2, running: false })).toBe(30);
    expect(clockToMinute({ seconds: 1,    half: 2, running: true  })).toBe(31);
    expect(clockToMinute({ seconds: 30*60, half: 2, running: true })).toBe(60);
  });
});

describe('tickClock', () => {
  it('does nothing when the clock is paused', () => {
    const paused = { seconds: 100, half: 1 as const, running: false };
    expect(tickClock(paused, 5)).toEqual(paused);
  });

  it('adds seconds when running', () => {
    expect(tickClock({ seconds: 100, half: 1, running: true }, 1).seconds).toBe(101);
  });

  it('clamps at 30 minutes per half (1800s)', () => {
    const near = { seconds: 1799, half: 1 as const, running: true };
    expect(tickClock(near, 5).seconds).toBe(1800);
  });
});

describe('adjustClock', () => {
  it('allows negative adjustments without going below zero', () => {
    expect(adjustClock({ seconds: 10, half: 1, running: false }, -60).seconds).toBe(0);
  });

  it('allows positive adjustments up to the clamp', () => {
    expect(adjustClock({ seconds: 100, half: 1, running: false }, 60).seconds).toBe(160);
    expect(adjustClock({ seconds: 1790, half: 1, running: false }, 60).seconds).toBe(1800);
  });

  it('is independent of running state', () => {
    const paused = { seconds: 100, half: 1 as const, running: false };
    const running = { ...paused, running: true };
    expect(adjustClock(paused, 30).seconds).toBe(adjustClock(running, 30).seconds);
  });
});

describe('setClockSeconds', () => {
  it('clamps to [0, 1800]', () => {
    expect(setClockSeconds(INITIAL_CLOCK, -50).seconds).toBe(0);
    expect(setClockSeconds(INITIAL_CLOCK, 99999).seconds).toBe(1800);
    expect(setClockSeconds(INITIAL_CLOCK, 450).seconds).toBe(450);
  });
});

describe('isGoalkeeper', () => {
  it('matches "Arquero" exactly', () => {
    expect(isGoalkeeper(mkPlayer({ name: 'X', number: 1, position: 'Arquero' }))).toBe(true);
  });

  it('is case-insensitive and ignores surrounding whitespace', () => {
    expect(isGoalkeeper(mkPlayer({ name: 'X', number: 1, position: '  ARQUERO ' }))).toBe(true);
    expect(isGoalkeeper(mkPlayer({ name: 'X', number: 1, position: 'arquero' }))).toBe(true);
  });

  it('matches "Arqueros" variants (starts with arquero)', () => {
    expect(isGoalkeeper(mkPlayer({ name: 'X', number: 1, position: 'Arqueros' }))).toBe(true);
  });

  it('rejects field positions', () => {
    expect(isGoalkeeper(mkPlayer({ name: 'X', number: 1, position: 'Campo' }))).toBe(false);
    expect(isGoalkeeper(mkPlayer({ name: 'X', number: 1, position: 'Lateral Izq.' }))).toBe(false);
    expect(isGoalkeeper(mkPlayer({ name: 'X', number: 1, position: 'Pivote' }))).toBe(false);
  });
});

describe('splitRoster', () => {
  it('partitions by position', () => {
    const roster = [
      mkPlayer({ name: 'Leo',   number: 10, position: 'Lateral Izq.' }),
      mkPlayer({ name: 'Ana',   number: 1,  position: 'Arquero' }),
      mkPlayer({ name: 'Beto',  number: 12, position: 'Arquero' }),
      mkPlayer({ name: 'Chica', number: 7,  position: 'Pivote' }),
    ];
    const { goalkeepers, fieldPlayers } = splitRoster(roster);
    expect(goalkeepers.map((p) => p.name)).toEqual(['Ana', 'Beto']);
    expect(fieldPlayers.map((p) => p.name)).toEqual(['Leo', 'Chica']);
  });

  it('handles an empty roster', () => {
    expect(splitRoster([])).toEqual({ goalkeepers: [], fieldPlayers: [] });
  });
});

describe('rosterKindFor', () => {
  it('maps shot events to shooter', () => {
    expect(rosterKindFor('goal')).toBe('shooter');
    expect(rosterKindFor('miss')).toBe('shooter');
    expect(rosterKindFor('saved')).toBe('shooter');
    expect(rosterKindFor('post')).toBe('shooter');
  });

  it('maps sanction events to sanctioned', () => {
    expect(rosterKindFor('exclusion')).toBe('sanctioned');
    expect(rosterKindFor('red_card')).toBe('sanctioned');
    expect(rosterKindFor('yellow_card')).toBe('sanctioned');
    expect(rosterKindFor('blue_card')).toBe('sanctioned');
  });

  it('maps turnover to possession', () => {
    expect(rosterKindFor('turnover')).toBe('possession');
  });

  it('maps meta events to none', () => {
    expect(rosterKindFor('timeout')).toBe('none');
    expect(rosterKindFor('half_time')).toBe('none');
  });
});

describe('wantsGoalZone / wantsCourtZone', () => {
  it('only shots want a goal zone', () => {
    expect(wantsGoalZone('goal')).toBe(true);
    expect(wantsGoalZone('saved')).toBe(true);
    expect(wantsGoalZone('turnover')).toBe(false);
    expect(wantsGoalZone('exclusion')).toBe(false);
  });

  it('shots and some possession events want a court zone', () => {
    expect(wantsCourtZone('goal')).toBe(true);
    expect(wantsCourtZone('turnover')).toBe(true);
    expect(wantsCourtZone('exclusion')).toBe(true);
    expect(wantsCourtZone('timeout')).toBe(false);
    expect(wantsCourtZone('half_time')).toBe(false);
  });
});

describe('isShotDraftComplete', () => {
  it('requires both a goal zone and a court zone', () => {
    expect(isShotDraftComplete(EMPTY_DRAFT)).toBe(false);
    expect(isShotDraftComplete({ ...EMPTY_DRAFT, goalZone: 'tl' })).toBe(false);
    expect(isShotDraftComplete({ ...EMPTY_DRAFT, courtZone: 'center_above' })).toBe(false);
    expect(isShotDraftComplete({
      ...EMPTY_DRAFT,
      goalZone: 'tl',
      courtZone: 'center_above',
    })).toBe(true);
  });
});

describe('buildEvent', () => {
  it('uses the clock-derived minute', () => {
    const e = buildEvent({
      type: 'goal',
      draft: { ...EMPTY_DRAFT, team: 'home', goalZone: 'tl', courtZone: 'center_above' },
      clock: { seconds: 121, half: 1, running: true },
      quickMode: false,
    });
    expect(e.min).toBe(3);
    expect(e.team).toBe('home');
    expect(e.type).toBe('goal');
    expect(e.zone).toBe('center_above');
    expect(e.goalZone).toBe('tl');
    expect(e.quickMode).toBe(false);
    expect(e.completed).toBe(true);
  });

  it('carries shooter and goalkeeper references', () => {
    const shooter = { name: 'Leo', number: 10 };
    const gk = { name: 'Ana', number: 1 };
    const e = buildEvent({
      type: 'goal',
      draft: { ...EMPTY_DRAFT, shooter, goalkeeper: gk },
      clock: INITIAL_CLOCK,
      quickMode: false,
    });
    expect(e.shooter).toEqual(shooter);
    expect(e.goalkeeper).toEqual(gk);
  });

  it('marks quickMode events correctly', () => {
    const e = buildEvent({
      type: 'goal',
      draft: EMPTY_DRAFT,
      clock: INITIAL_CLOCK,
      quickMode: true,
    });
    expect(e.quickMode).toBe(true);
  });

  it('attaches a sanctioned player for card/exclusion events', () => {
    const player = { name: 'Beto', number: 7 };
    const e = buildEvent({
      type: 'exclusion',
      draft: EMPTY_DRAFT,
      clock: { seconds: 60, half: 2, running: true },
      quickMode: false,
      sanctioned: player,
    });
    expect(e.min).toBe(31);
    expect(e.type).toBe('exclusion');
    expect(e.sanctioned).toEqual(player);
  });
});
