import { useEffect, useState } from 'react';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GOAL_QUADRANTS, COURT_ZONES } from '@/domain/constants';
import type { CourtZoneId, GoalZoneId } from '@/domain/types';
import { cn } from '@/lib/cn';

export type ShotOutcome = 'goal' | 'saved' | 'miss' | 'post';

export interface ShotOutcomeDialogProps {
  open: boolean;
  onClose: () => void;
  goalZone: GoalZoneId | null;
  courtZone: CourtZoneId | null;
  onConfirm: (outcome: ShotOutcome) => void;
}

const OUTCOME_META: Record<ShotOutcome, { label: string; emoji: string; tone: string }> = {
  goal:  { label: 'Gol',     emoji: '⚽', tone: 'bg-goal text-white' },
  saved: { label: 'Atajada', emoji: '🧤', tone: 'bg-save text-white' },
  miss:  { label: 'Errado',  emoji: '❌', tone: 'bg-surface-2 text-fg border border-border' },
  post:  { label: 'Palo',    emoji: '🪵', tone: 'bg-warning/20 text-warning border border-warning/40' },
};

export const ShotOutcomeDialog = ({
  open,
  onClose,
  goalZone,
  courtZone,
  onConfirm,
}: ShotOutcomeDialogProps) => {
  const [picked, setPicked] = useState<ShotOutcome | null>(null);

  useEffect(() => {
    if (!open) setPicked(null);
  }, [open]);

  const goalLabel = labelForGoalZone(goalZone);
  const courtLabel = labelForCourtZone(courtZone);

  if (picked) {
    const meta = OUTCOME_META[picked];
    return (
      <Dialog open={open} onClose={onClose} title="¿Confirmás?">
        <div className="flex items-center justify-center gap-2 mb-4 text-xs text-muted-fg">
          {courtLabel && (
            <span className="px-2 py-1 rounded-md bg-surface-2 border border-border text-fg">
              {courtLabel}
            </span>
          )}
          <span>→</span>
          {goalLabel && (
            <span className="px-2 py-1 rounded-md border bg-primary/15 border-primary/40 text-primary">
              {goalLabel}
            </span>
          )}
        </div>

        <div className={cn('rounded-lg py-6 flex flex-col items-center gap-1', meta.tone)}>
          <div className="text-4xl">{meta.emoji}</div>
          <div className="text-lg font-semibold">{meta.label}</div>
        </div>

        <DialogFooter className="sm:justify-end">
          <Button variant="ghost" onClick={() => setPicked(null)}>Cambiar</Button>
          <Button onClick={() => onConfirm(picked)}>Confirmar</Button>
        </DialogFooter>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title="¿Qué pasó?">
      <div className="flex items-center justify-center gap-2 mb-4 text-xs text-muted-fg">
        {courtLabel && (
          <span className="px-2 py-1 rounded-md bg-surface-2 border border-border text-fg">
            {courtLabel}
          </span>
        )}
        <span>→</span>
        {goalLabel && (
          <span className={cn(
            'px-2 py-1 rounded-md border',
            goalZone === 'post' ? 'bg-warning/15 border-warning/40 text-warning' :
            goalZone === 'out'  ? 'bg-surface-2 border-border text-muted-fg' :
                                  'bg-primary/15 border-primary/40 text-primary',
          )}>
            {goalLabel}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <Button variant="success" onClick={() => setPicked('goal')} className="h-14 text-base">
          ⚽ Gol
        </Button>
        <Button onClick={() => setPicked('saved')} className="h-14 text-base bg-save hover:bg-save/90">
          🧤 Atajada
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => setPicked('miss')} className="h-11 text-sm">
          ❌ Errado
        </Button>
        <Button
          variant="secondary"
          onClick={() => setPicked('post')}
          className="h-11 text-sm text-warning border-warning/40 bg-warning/10"
        >
          🪵 Palo
        </Button>
      </div>
    </Dialog>
  );
};

const labelForGoalZone = (z: GoalZoneId | null): string | null => {
  if (!z) return null;
  if (z === 'post') return 'Palo';
  if (z === 'out')  return 'Fuera';
  return `${GOAL_QUADRANTS[z].arrow} ${GOAL_QUADRANTS[z].label}`;
};

const labelForCourtZone = (z: CourtZoneId | null): string | null => {
  if (!z) return null;
  return COURT_ZONES[z].label;
};
