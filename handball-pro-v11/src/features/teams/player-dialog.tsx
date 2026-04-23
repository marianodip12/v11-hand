import { useEffect, useState } from 'react';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { POSITIONS } from '@/domain/constants';
import { newId, validatePlayer } from '@/domain/teams';
import type { Player } from '@/domain/types';

export interface PlayerDialogProps {
  open: boolean;
  onClose: () => void;
  allPlayers: Player[];
  editingPlayer?: Player | null;
  onSave: (player: Player) => void;
}

export const PlayerDialog = ({
  open,
  onClose,
  allPlayers,
  editingPlayer,
  onSave,
}: PlayerDialogProps) => {
  const [name, setName] = useState('');
  const [numberStr, setNumberStr] = useState('');
  const [position, setPosition] = useState<string>(POSITIONS[0]);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingPlayer) {
      setName(editingPlayer.name);
      setNumberStr(String(editingPlayer.number));
      setPosition(editingPlayer.position);
    } else {
      setName('');
      setNumberStr('');
      setPosition(POSITIONS[0]);
    }
    setTouched(false);
  }, [open, editingPlayer]);

  const parsedNumber = numberStr.trim() === '' ? null : Number(numberStr);
  const errors = validatePlayer(
    { name, number: parsedNumber, position },
    allPlayers,
    editingPlayer?.id,
  );
  const canSave = !errors.name && !errors.number && !errors.position;

  const handleSave = () => {
    setTouched(true);
    if (!canSave || parsedNumber === null) return;
    const player: Player = editingPlayer
      ? { ...editingPlayer, name: name.trim(), number: parsedNumber, position }
      : { id: newId(), name: name.trim(), number: parsedNumber, position };
    onSave(player);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editingPlayer ? 'Editar jugador' : 'Nuevo jugador'}
    >
      <div className="flex flex-col gap-4">
        <section>
          <Label htmlFor="p-name">Nombre</Label>
          <Input
            id="p-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Leo García"
            className="mt-2"
            autoComplete="off"
            autoFocus
            aria-invalid={touched && !!errors.name}
          />
          {touched && errors.name && (
            <p className="text-xs text-danger mt-1.5">{errors.name}</p>
          )}
        </section>

        <div className="grid grid-cols-2 gap-3">
          <section>
            <Label htmlFor="p-number">Número</Label>
            <Input
              id="p-number"
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              value={numberStr}
              onChange={(e) => setNumberStr(e.target.value)}
              placeholder="10"
              className="mt-2 font-mono"
              aria-invalid={touched && !!errors.number}
            />
            {touched && errors.number && (
              <p className="text-xs text-danger mt-1.5">{errors.number}</p>
            )}
          </section>

          <section>
            <Label htmlFor="p-pos">Posición</Label>
            <Select
              id="p-pos"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="mt-2"
            >
              {POSITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
            {touched && errors.position && (
              <p className="text-xs text-danger mt-1.5">{errors.position}</p>
            )}
          </section>
        </div>
      </div>

      <DialogFooter className="sm:justify-end">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave}>
          {editingPlayer ? 'Guardar' : 'Agregar jugador'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
};
