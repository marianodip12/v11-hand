import type { HandballTeam, Player } from './types';

// ─── Validation ────────────────────────────────────────────────────────

export interface FieldErrors {
  name?: string;
  number?: string;
  position?: string;
}

export interface PlayerValidationInput {
  name: string;
  number: number | null;
  position: string;
}

/**
 * Validates a player draft against business rules.
 *
 * Rules:
 *  - name must be non-empty after trim.
 *  - number must be an integer in the range 1..99 (jersey numbers).
 *  - position must be non-empty.
 *  - `existingPlayers` is used to detect duplicate jersey numbers.
 *    When editing, pass `excludeId` so the player doesn't clash with itself.
 */
export const validatePlayer = (
  draft: PlayerValidationInput,
  existingPlayers: Player[],
  excludeId?: string,
): FieldErrors => {
  const errors: FieldErrors = {};

  if (!draft.name.trim()) {
    errors.name = 'El nombre es requerido';
  } else if (draft.name.trim().length > 40) {
    errors.name = 'Máximo 40 caracteres';
  }

  if (draft.number === null || Number.isNaN(draft.number)) {
    errors.number = 'Ingresá un número';
  } else if (!Number.isInteger(draft.number)) {
    errors.number = 'Tiene que ser un número entero';
  } else if (draft.number < 1 || draft.number > 99) {
    errors.number = 'Entre 1 y 99';
  } else {
    const clash = existingPlayers.find(
      (p) => p.number === draft.number && p.id !== excludeId,
    );
    if (clash) errors.number = `Ya lo usa ${clash.name}`;
  }

  if (!draft.position.trim()) {
    errors.position = 'Elegí una posición';
  }

  return errors;
};

export const hasErrors = (e: FieldErrors): boolean =>
  Object.values(e).some((v) => v !== undefined);

// ─── Team validation ───────────────────────────────────────────────────

export interface TeamValidationInput {
  name: string;
  color: string;
}

export interface TeamFieldErrors {
  name?: string;
  color?: string;
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export const validateTeam = (
  draft: TeamValidationInput,
  existingTeams: HandballTeam[],
  excludeId?: string,
): TeamFieldErrors => {
  const errors: TeamFieldErrors = {};

  if (!draft.name.trim()) {
    errors.name = 'El nombre es requerido';
  } else if (draft.name.trim().length > 60) {
    errors.name = 'Máximo 60 caracteres';
  } else {
    const clash = existingTeams.find(
      (t) => t.name.toLowerCase() === draft.name.trim().toLowerCase() && t.id !== excludeId,
    );
    if (clash) errors.name = 'Ya existe un equipo con ese nombre';
  }

  if (!HEX_RE.test(draft.color)) {
    errors.color = 'Color inválido';
  }

  return errors;
};

// ─── Sorting ───────────────────────────────────────────────────────────

/**
 * Sorts players by jersey number ascending, then by name for ties.
 * Pure — returns a new array.
 */
export const sortedPlayers = (players: Player[]): Player[] =>
  [...players].sort((a, b) => {
    if (a.number !== b.number) return a.number - b.number;
    return a.name.localeCompare(b.name);
  });

// ─── ID generation ─────────────────────────────────────────────────────

/**
 * Generates a UUID v4-ish string. Uses crypto.randomUUID when available
 * (all modern browsers), with a fallback for very old environments.
 */
export const newId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback — not cryptographically strong but unique enough.
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};
