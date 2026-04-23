import { Dialog } from '@/components/ui/dialog';
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

export const ShotOutcomeDialog = ({
  open,
  onClose,
  goalZone,
  courtZone,
  onConfirm,
}: ShotOutcomeDialogProps) => {
  const goalLabel = labelForGoalZone(goalZone);
  const courtLabel = labelForCourtZone(courtZone);

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
        <Button variant="success" onClick={() => onConfirm('goal')} className="h-14 text-base">
          ⚽ Gol
        </Button>
        <Button onClick={() => onConfirm('saved')} className="h-14 text-base bg-save hover:bg-save/90">
          🧤 Atajada
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => onConfirm('miss')} className="h-11 text-sm">
          ❌ Errado
        </Button>
        <Button
          variant="secondary"
          onClick={() => onConfirm('post')}
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
