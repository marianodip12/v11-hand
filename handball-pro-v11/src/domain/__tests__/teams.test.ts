import { describe, expect, it } from 'vitest';
import {
  hasErrors,
  sortedPlayers,
  validatePlayer,
  validateTeam,
} from '../teams';
import type { HandballTeam, Player } from '../types';

const mkPlayer = (p: Partial<Player> & { name: string; number: number }): Player => ({
  id: crypto.randomUUID(),
  position: 'Campo',
  ...p,
});

const mkTeam = (p: Partial<HandballTeam> & { name: string }): HandballTeam => ({
  id: crypto.randomUUID(),
  color: '#3B82F6',
  players: [],
  ...p,
});

describe('validatePlayer', () => {
  it('accepts a valid draft', () => {
    const errors = validatePlayer(
      { name: 'Leo', number: 10, position: 'Lateral Izq.' },
      [],
    );
    expect(hasErrors(errors)).toBe(false);
  });

  it('rejects empty name', () => {
    expect(
      validatePlayer({ name: '   ', number: 1, position: 'Campo' }, []).name,
    ).toBeDefined();
  });

  it('rejects name over 40 chars', () => {
    expect(
      validatePlayer({ name: 'x'.repeat(41), number: 1, position: 'Campo' }, []).name,
    ).toBeDefined();
  });

  it('rejects null or NaN number', () => {
    expect(
      validatePlayer({ name: 'Ok', number: null, position: 'Campo' }, []).number,
    ).toBeDefined();
    expect(
      validatePlayer({ name: 'Ok', number: NaN, position: 'Campo' }, []).number,
    ).toBeDefined();
  });

  it('rejects non-integer numbers', () => {
    expect(
      validatePlayer({ name: 'Ok', number: 7.5, position: 'Campo' }, []).number,
    ).toBeDefined();
  });

  it('rejects numbers outside 1..99', () => {
    expect(
      validatePlayer({ name: 'Ok', number: 0, position: 'Campo' }, []).number,
    ).toBeDefined();
    expect(
      validatePlayer({ name: 'Ok', number: 100, position: 'Campo' }, []).number,
    ).toBeDefined();
    expect(
      validatePlayer({ name: 'Ok', number: 1, position: 'Campo' }, []).number,
    ).toBeUndefined();
    expect(
      validatePlayer({ name: 'Ok', number: 99, position: 'Campo' }, []).number,
    ).toBeUndefined();
  });

  it('rejects duplicate jersey number', () => {
    const existing = [mkPlayer({ name: 'Juan', number: 10 })];
    const errors = validatePlayer(
      { name: 'Pedro', number: 10, position: 'Campo' },
      existing,
    );
    expect(errors.number).toContain('Juan');
  });

  it('allows keeping own number when editing', () => {
    const existing = [
      mkPlayer({ id: 'p1', name: 'Juan', number: 10 }),
      mkPlayer({ id: 'p2', name: 'Ana',  number: 7  }),
    ];
    const errors = validatePlayer(
      { name: 'Juan', number: 10, position: 'Campo' },
      existing,
      'p1',  // excluding self
    );
    expect(errors.number).toBeUndefined();
  });

  it('rejects empty position', () => {
    expect(
      validatePlayer({ name: 'Ok', number: 1, position: '' }, []).position,
    ).toBeDefined();
  });
});

describe('validateTeam', () => {
  it('accepts a valid draft', () => {
    expect(
      hasErrors(validateTeam({ name: 'Atlético', color: '#3B82F6' }, [])),
    ).toBe(false);
  });

  it('rejects empty name', () => {
    expect(
      validateTeam({ name: '', color: '#3B82F6' }, []).name,
    ).toBeDefined();
  });

  it('rejects duplicate name (case-insensitive, trimmed)', () => {
    const existing = [mkTeam({ name: 'Atlético' })];
    expect(
      validateTeam({ name: '  atlético  ', color: '#EF4444' }, existing).name,
    ).toBeDefined();
  });

  it('allows keeping own name when editing', () => {
    const existing = [mkTeam({ id: 't1', name: 'Atlético' })];
    expect(
      validateTeam({ name: 'Atlético', color: '#EF4444' }, existing, 't1').name,
    ).toBeUndefined();
  });

  it('rejects malformed color', () => {
    expect(validateTeam({ name: 'Ok', color: 'red'       }, []).color).toBeDefined();
    expect(validateTeam({ name: 'Ok', color: '#ABC'      }, []).color).toBeDefined();
    expect(validateTeam({ name: 'Ok', color: '#ZZZZZZ'   }, []).color).toBeDefined();
    expect(validateTeam({ name: 'Ok', color: '#3b82f6'   }, []).color).toBeUndefined();
  });
});

describe('sortedPlayers', () => {
  it('sorts ascending by jersey number', () => {
    const input = [
      mkPlayer({ name: 'C', number: 22 }),
      mkPlayer({ name: 'A', number: 3  }),
      mkPlayer({ name: 'B', number: 10 }),
    ];
    expect(sortedPlayers(input).map((p) => p.number)).toEqual([3, 10, 22]);
  });

  it('ties broken by name', () => {
    const input = [
      mkPlayer({ name: 'Zoe',   number: 7 }),
      mkPlayer({ name: 'Ana',   number: 7 }),
      mkPlayer({ name: 'Bruno', number: 7 }),
    ];
    expect(sortedPlayers(input).map((p) => p.name)).toEqual(['Ana', 'Bruno', 'Zoe']);
  });

  it('does not mutate the input', () => {
    const input = [mkPlayer({ name: 'B', number: 10 }), mkPlayer({ name: 'A', number: 3 })];
    const snapshot = [...input];
    sortedPlayers(input);
    expect(input).toEqual(snapshot);
  });
});
