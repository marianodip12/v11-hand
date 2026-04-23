import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import type { PersonRef, Player } from '@/domain/types';
import { cn } from '@/lib/cn';

export type PickerKind = 'shooter' | 'goalkeeper' | 'sanctioned';

export interface PlayerPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (p: PersonRef | null) => void;
  /** Players available to pick from (pre-filtered by position). */
  players: Player[];
  /** Color of the team whose roster is being shown — used for jersey color. */
  teamColor: string;
  /** Name of that team (for the header). */
  teamName: string;
  /** What role we're picking for — changes the title and allows "no player". */
  kind: PickerKind;
  /**
   * When true, show a "sin datos" shortcut that returns null (no player tagged).
   * Always shown for shooter/goalkeeper on empty rosters.
   */
  allowSkip?: boolean;
}

/**
 * Popup for picking a player during event tagging.
 *
 *  - If the roster is empty, offer a free-text number input (useful for
 *    opposing team when we don't have their roster loaded).
 *  - If the roster has players, show a jersey-number grid, grouped by
 *    position. Tap a jersey → returns the PersonRef.
 *  - "Sin datos" button at the bottom skips player tagging entirely.
 */
export const PlayerPicker = ({
  open,
  onClose,
  onPick,
  players,
  teamColor,
  teamName,
  kind,
  allowSkip = true,
}: PlayerPickerProps) => {
  const [freeNumber, setFreeNumber] = useState('');
  const [freeName, setFreeName] = useState('');

  useEffect(() => {
    if (!open) return;
    setFreeNumber('');
    setFreeName('');
  }, [open]);

  const grouped = useMemo(() => {
    const byPos: Record<string, Player[]> = {};
    for (const p of players) {
      const key = p.position || 'Otros';
      if (!byPos[key]) byPos[key] = [];
      byPos[key].push(p);
    }
    Object.values(byPos).forEach((ps) =>
      ps.sort((a, b) => a.number - b.number),
    );
    return byPos;
  }, [players]);

  const title =
    kind === 'goalkeeper' ? '¿Qué arquero?' :
    kind === 'sanctioned' ? '¿A qué jugador?' :
                            '¿Quién tiró?';

  const description = teamName
    ? `${teamName}${players.length > 0 ? ` · ${players.length} ${players.length === 1 ? 'jugador' : 'jugadores'}` : ''}`
    : undefined;

  const handleFreeText = () => {
    const n = Number(freeNumber);
    if (!Number.isFinite(n) || n < 1 || n > 99) return;
    onPick({ name: freeName.trim() || `#${n}`, number: n });
  };

  return (
    <Dialog open={open} onClose={onClose} title={title} description={description}>
      {players.length > 0 ? (
        <div className="flex flex-col gap-4">
          {Object.entries(grouped).map(([position, ps]) => (
            <section key={position}>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg mb-2">
                {position}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {ps.map((p) => (
                  <JerseyButton
                    key={p.id}
                    player={p}
                    color={teamColor}
                    onClick={() => onPick({ name: p.name, number: p.number })}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-fg">
            No hay jugadores cargados. Ingresá solo el número:
          </p>
          <div className="grid grid-cols-[auto_1fr] gap-3">
            <div>
              <Label>Número</Label>
              <Input
                type="number"
                min={1}
                max={99}
                value={freeNumber}
                onChange={(e) => setFreeNumber(e.target.value)}
                className="mt-2 font-mono w-20"
                autoFocus
              />
            </div>
            <div>
              <Label>Nombre (opcional)</Label>
              <Input
                value={freeName}
                onChange={(e) => setFreeName(e.target.value)}
                placeholder="—"
                className="mt-2"
              />
            </div>
          </div>
          <Button onClick={handleFreeText} disabled={!freeNumber} className="mt-2">
            Confirmar
          </Button>
        </div>
      )}

      <DialogFooter className="sm:justify-between">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        {allowSkip && (
          <Button variant="secondary" onClick={() => onPick(null)}>
            Sin datos
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
};

// ─── Jersey button ─────────────────────────────────────────────────────

const JerseyButton = ({
  player,
  color,
  onClick,
}: {
  player: Player;
  color: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex flex-col items-center gap-1 p-1.5 rounded-md border border-border bg-surface-2',
      'hover:border-primary/60 hover:bg-primary/10 active:scale-[0.97]',
      'transition-colors duration-fast touch-target',
    )}
  >
    {/* Jersey icon with number */}
    <div className="relative w-11 h-11 flex items-center justify-center">
      <svg
        viewBox="0 0 40 40"
        width="40"
        height="40"
        aria-hidden="true"
        className="absolute inset-0"
      >
        {/* Jersey shape: body + shoulder cut-outs */}
        <path
          d="M 10 6 L 14 3 L 16 5 Q 20 8 24 5 L 26 3 L 30 6 L 34 10 L 31 14 L 28 12 L 28 36 L 12 36 L 12 12 L 9 14 L 6 10 Z"
          fill={color}
          opacity="0.85"
        />
      </svg>
      <span className="relative font-mono text-sm font-bold tabular text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
        {player.number}
      </span>
    </div>
    <span className="text-[10px] text-fg truncate w-full text-center leading-tight">
      {player.name.split(' ')[0]}
    </span>
  </button>
);
