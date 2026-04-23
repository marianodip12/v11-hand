import { useEffect, useState } from 'react';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { TEAM_COLORS } from '@/domain/constants';
import { newId, validateTeam } from '@/domain/teams';
import type { HandballTeam } from '@/domain/types';
import { cn } from '@/lib/cn';

export interface TeamDialogProps {
  open: boolean;
  onClose: () => void;
  allTeams: HandballTeam[];
  /** If provided, we're editing. Otherwise, creating a new team. */
  editingTeam?: HandballTeam | null;
  onSave: (team: HandballTeam) => void;
}

export const TeamDialog = ({
  open,
  onClose,
  allTeams,
  editingTeam,
  onSave,
}: TeamDialogProps) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(TEAM_COLORS[0]);
  const [touched, setTouched] = useState(false);

  // Reset fields whenever the dialog opens, either for create or edit.
  useEffect(() => {
    if (!open) return;
    if (editingTeam) {
      setName(editingTeam.name);
      setColor(editingTeam.color);
    } else {
      setName('');
      setColor(TEAM_COLORS[0]);
    }
    setTouched(false);
  }, [open, editingTeam]);

  const errors = validateTeam({ name, color }, allTeams, editingTeam?.id);
  const canSave = !errors.name && !errors.color;

  const handleSave = () => {
    setTouched(true);
    if (!canSave) return;
    const team: HandballTeam = editingTeam
      ? { ...editingTeam, name: name.trim(), color }
      : { id: newId(), name: name.trim(), color, players: [] };
    onSave(team);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editingTeam ? 'Editar equipo' : 'Nuevo equipo'}
      description={editingTeam ? undefined : 'Cargá tu equipo para empezar a usar la app.'}
    >
      <div className="flex flex-col gap-5">
        <section>
          <Label htmlFor="team-name">Nombre del equipo</Label>
          <Input
            id="team-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Atlético Handball"
            className="mt-2"
            autoComplete="off"
            autoFocus
            aria-invalid={touched && !!errors.name}
          />
          {touched && errors.name && (
            <p className="text-xs text-danger mt-1.5">{errors.name}</p>
          )}
        </section>

        <section>
          <Label>Color del equipo</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {TEAM_COLORS.map((c) => {
              const active = color.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  aria-pressed={active}
                  className={cn(
                    'w-10 h-10 rounded-full transition-transform duration-fast',
                    'border-2 touch-target',
                    active
                      ? 'border-fg scale-110 shadow-lg'
                      : 'border-transparent hover:scale-105',
                  )}
                  style={{ background: c }}
                />
              );
            })}
          </div>
        </section>
      </div>

      <DialogFooter className="sm:justify-end">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave}>
          {editingTeam ? 'Guardar cambios' : 'Crear equipo'}
        </Button>
      </DialogFooter>
    </Dialog>
  );
};
