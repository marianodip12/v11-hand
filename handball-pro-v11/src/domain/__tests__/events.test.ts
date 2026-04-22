import { describe, expect, it } from 'vitest';
import { calcNextScore, computeScore } from '../events';
import type { EventType, HandballEvent, Team } from '../types';

// Minimal event factory for tests — fills all required fields.
const mk = (partial: Partial<HandballEvent> & { type: EventType; team: Team }): HandballEvent => ({
  id: crypto.randomUUID(),
  min: 1,
  hScore: 0,
  aScore: 0,
  quickMode: false,
  completed: true,
  ...partial,
});

describe('computeScore', () => {
  it('returns 0-0 for an empty list', () => {
    expect(computeScore([])).toEqual({ h: 0, a: 0 });
  });

  it('counts only goal events, ignoring miss/save/post/cards', () => {
    const events = [
      mk({ type: 'goal', team: 'home' }),
      mk({ type: 'miss', team: 'home' }),
      mk({ type: 'saved', team: 'home' }),
      mk({ type: 'post', team: 'home' }),
      mk({ type: 'yellow_card', team: 'home' }),
      mk({ type: 'goal', team: 'away' }),
      mk({ type: 'exclusion', team: 'away' }),
    ];
    expect(computeScore(events)).toEqual({ h: 1, a: 1 });
  });

  it('attributes goals to the correct team', () => {
    const events = [
      mk({ type: 'goal', team: 'home' }),
      mk({ type: 'goal', team: 'home' }),
      mk({ type: 'goal', team: 'home' }),
      mk({ type: 'goal', team: 'away' }),
    ];
    expect(computeScore(events)).toEqual({ h: 3, a: 1 });
  });

  it('does not depend on event order', () => {
    const shuffled = [
      mk({ type: 'goal', team: 'away', min: 40 }),
      mk({ type: 'goal', team: 'home', min: 5 }),
      mk({ type: 'goal', team: 'home', min: 50 }),
    ];
    expect(computeScore(shuffled)).toEqual({ h: 2, a: 1 });
  });
});

describe('calcNextScore', () => {
  it('does not change the score for non-goal events', () => {
    const events = [mk({ type: 'goal', team: 'home' })];
    expect(calcNextScore(events, 'miss', 'home')).toEqual({ h: 1, a: 0 });
    expect(calcNextScore(events, 'saved', 'away')).toEqual({ h: 1, a: 0 });
    expect(calcNextScore(events, 'exclusion', 'home')).toEqual({ h: 1, a: 0 });
  });

  it('increments the score of the scoring team', () => {
    const events = [
      mk({ type: 'goal', team: 'home' }),
      mk({ type: 'goal', team: 'away' }),
    ];
    expect(calcNextScore(events, 'goal', 'home')).toEqual({ h: 2, a: 1 });
    expect(calcNextScore(events, 'goal', 'away')).toEqual({ h: 1, a: 2 });
  });

  it('handles the first goal from empty', () => {
    expect(calcNextScore([], 'goal', 'home')).toEqual({ h: 1, a: 0 });
    expect(calcNextScore([], 'goal', 'away')).toEqual({ h: 0, a: 1 });
  });
});
