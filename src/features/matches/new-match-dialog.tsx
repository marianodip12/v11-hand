import { useState } from 'react';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { COMPETITIONS, type Competition } from '@/domain/constants';
import type { HandballTeam } from '@/domain/types';
import { cn } from '@/lib/cn';

export interface NewMatchValues {
  teamId: string;
  awayName: string;
  competition: Competition;
  round: string;
}

export interface NewMatchDialogProps {
  open: boolean;
  onClose: () => void;
  teams: HandballTeam[];
  onStart: (values: NewMatchValues) => void;
}

export const NewMatchDialog = ({
  open,
  onClose,
  teams,
  onStart,
}: NewMatchDialogProps) => {
  const [teamId, setTeamId] = useState<string>(teams[0]?.id ?? '');
  const [awayName, setAwayName] = useState('');
  const [competition, setCompetition] = useState<Competition>('Liga');
  const [round, setRound] = useState('');

  const canStart = teamId !== '' && awayName.trim() !== '';

  const handleStart = () => {
    if (!canStart) return;
    onStart({ teamId, awayName: awayName.trim(), competition, round: round.trim() });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nuevo partido"
      description="Configurá los datos para empezar a registrar en vivo."
    >
      <div className="flex flex-col gap-5">
        <section>
          <Label>Mi equipo</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {teams.length === 0 ? (
              <p className="text-sm text-muted-fg">
                Creá un equipo primero en la pestaña <strong>Equipos</strong>.
              </p>
            ) : (
              teams.map((t) => {
                const active = teamId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTeamId(t.id)}
                    className={cn(
                      'inline-flex items-center gap-2 px-3 h-11 rounded-md border text-sm font-medium',
                      'transition-colors duration-fast',
                      active
                        ? 'border-primary/60 bg-primary/15 text-primary'
                        : 'border-border bg-surface-2 text-muted-fg hover:text-fg',
                    )}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: t.color }}
                    />
                    {t.name}
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section>
          <Label htmlFor="away">Rival</Label>
          <Input
            id="away"
            placeholder="Nombre del equipo rival"
            value={awayName}
            onChange={(e) => setAwayName(e.target.value)}
            className="mt-2"
            autoComplete="off"
          />
        </section>

        <section>
          <Label>Competencia</Label>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {COMPETITIONS.map((c) => {
              const active = competition === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCompetition(c)}
                  className={cn(
                    'px-3 h-9 rounded-md border text-xs font-medium',
                    'transition-colors duration-fast',
                    active
                      ? 'border-primary/60 bg-primary/15 text-primary'
                      : 'border-border bg-surface-2 text-muted-fg hover:text-fg',
                  )}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <Label htmlFor="round">Jornada / fecha (opcional)</Label>
          <Input
            id="round"
            placeholder="Ej: Jornada 5, Final"
            value={round}
            onChange={(e) => setRound(e.target.value)}
            className="mt-2"
          />
        </section>
      </div>

      <DialogFooter className="sm:justify-end">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleStart} disabled={!canStart}>
          Iniciar partido
        </Button>
      </DialogFooter>
    </Dialog>
  );
};
