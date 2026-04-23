import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GOAL_QUADRANTS } from '@/domain/constants';
import type { CourtZoneId, GoalZoneId } from '@/domain/types';
import { COURT_ZONES } from '@/domain/constants';
import { cn } from '@/lib/cn';

export type ShotOutcome = 'goal' | 'saved' | 'miss' | 'post';

export interface ShotOutcomeDialogProps {
  open: boolean;
  onClose: () => void;
  goalZone: GoalZoneId | null;
  courtZone: CourtZoneId | null;
  onPick: (outcome: ShotOutcome) => void;
}

/**
 * Dialog that opens right after the user taps a goal-zone square.
 * Asks the single question: "what happened?" with big tappable buttons.
 *
 * Why a dialog instead of the old always-visible CTA buttons:
 *  - Keeps the main screen less cluttered.
 *  - Forces the flow court → goal → outcome → player (fewer accidental taps).
 *  - Allows showing the zone context right above the buttons.
 */
export const ShotOutcomeDialog = ({
  open,
  onClose,
  goalZone,
  courtZone,
  onPick,
}: ShotOutcomeDialogProps) => {
  const goalLabel = labelForGoalZone(goalZone);
  const courtLabel = labelForCourtZone(courtZone);

  return (
    <Dialog open={open} onClose={onClose} title="¿Qué pasó?">
      {/* Context: show where the shot came from & went to */}
      <div className="flex items-center justify-center gap-2 mb-4 text-xs text-muted-fg">
        {courtLabel && (
          <span className="px-2 py-1 rounded-md bg-surface-2 border border-border text-fg">
            {courtLabel}
          </span>
        )}
        <span className="text-muted-fg">→</span>
        {goalLabel && (
          <span className={cn(
            'px-2 py-1 rounded-md border',
            goalZone === 'post'
              ? 'bg-warning/15 border-warning/40 text-warning'
              : goalZone === 'out'
                ? 'bg-surface-2 border-border text-muted-fg'
                : 'bg-primary/15 border-primary/40 text-primary',
          )}>
            {goalLabel}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <Button
          variant="success"
          onClick={() => onPick('goal')}
          className="h-14 text-base"
        >
          ⚽ Gol
        </Button>
        <Button
          onClick={() => onPick('saved')}
          className="h-14 text-base bg-save hover:bg-save/90"
        >
          🧤 Atajada
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          onClick={() => onPick('miss')}
          className="h-11 text-sm"
        >
          ❌ Errado
        </Button>
        <Button
          variant="secondary"
          onClick={() => onPick('post')}
          className="h-11 text-sm text-warning border-warning/40 bg-warning/10"
        >
          🪵 Palo
        </Button>
      </div>
    </Dialog>
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────

const labelForGoalZone = (z: GoalZoneId | null): string | null => {
  if (!z) return null;
  if (z === 'post') return 'Palo';
  if (z === 'out')  return 'Fuera';
  // Actual quadrant
  return `${GOAL_QUADRANTS[z].arrow} ${GOAL_QUADRANTS[z].label}`;
};

const labelForCourtZone = (z: CourtZoneId | null): string | null => {
  if (!z) return null;
  return COURT_ZONES[z].label;
};
