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
  players: Player[];
  /**
   * Ad-hoc players already tagged during this live match (used for the
   * opposing team when no roster is loaded — lets the user re-select
   * the same #7 they used minutes ago instead of typing it again).
   */
  adhocPlayers?: PersonRef[];
  teamColor: string;
  teamName: string;
  kind: PickerKind;
  allowSkip?: boolean;
}

export const PlayerPicker = ({
  open,
  onClose,
  onPick,
  players,
  adhocPlayers = [],
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

  // Dedup by number — most recent tag wins (keeps the name fresh).
  const adhocDeduped = useMemo(() => {
    const byNumber = new Map<number, PersonRef>();
    for (const p of adhocPlayers) byNumber.set(p.number, p);
    return Array.from(byNumber.values()).sort((a, b) => a.number - b.number);
  }, [adhocPlayers]);

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

  const hasRoster = players.length > 0;

  return (
    <Dialog open={open} onClose={onClose} title={title} description={description}>
      {hasRoster ? (
        <div className="flex flex-col gap-2">
          {Object.entries(grouped).map(([position, ps]) => (
            <section key={position}>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-fg mb-1">
                {position}
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {ps.map((p) => (
                  <JerseyButton
                    key={p.id}
                    number={p.number}
                    name={p.name}
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
          {adhocDeduped.length > 0 && (
            <section>
              <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-fg mb-1">
                Ya cargados en este partido
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {adhocDeduped.map((p) => (
                  <JerseyButton
                    key={p.number}
                    number={p.number}
                    name={p.name}
                    color={teamColor}
                    onClick={() => onPick(p)}
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-fg mb-1">
              Nuevo
            </div>
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <div>
                <Label>Número</Label>
                <Input
                  type="number"
                  min={1}
                  max={99}
                  value={freeNumber}
                  onChange={(e) => setFreeNumber(e.target.value)}
                  className="mt-1 font-mono w-20"
                  autoFocus
                />
              </div>
              <div>
                <Label>Nombre (opcional)</Label>
                <Input
                  value={freeName}
                  onChange={(e) => setFreeName(e.target.value)}
                  placeholder="—"
                  className="mt-1"
                />
              </div>
            </div>
            <Button onClick={handleFreeText} disabled={!freeNumber} className="mt-2 w-full">
              Agregar
            </Button>
          </section>
        </div>
      )}

      <DialogFooter className={cn('sm:justify-between', !hasRoster && 'mt-3')}>
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

const JerseyButton = ({
  number,
  name,
  color,
  onClick,
}: {
  number: number;
  name: string;
  color: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex flex-col items-center gap-0.5 p-1 rounded-md border border-border bg-surface-2',
      'hover:border-primary/60 hover:bg-primary/10 active:scale-[0.97]',
      'transition-colors duration-fast',
    )}
  >
    <div className="relative w-8 h-8 flex items-center justify-center">
      <svg viewBox="0 0 40 40" width="32" height="32" aria-hidden="true" className="absolute inset-0">
        <path
          d="M 10 6 L 14 3 L 16 5 Q 20 8 24 5 L 26 3 L 30 6 L 34 10 L 31 14 L 28 12 L 28 36 L 12 36 L 12 12 L 9 14 L 6 10 Z"
          fill={color}
          opacity="0.9"
        />
      </svg>
      <span className="relative font-mono text-[11px] font-bold tabular text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
        {number}
      </span>
    </div>
    <span className="text-[9px] text-fg truncate w-full text-center leading-tight">
      {name.startsWith('#') ? name : name.split(' ')[0]}
    </span>
  </button>
);
