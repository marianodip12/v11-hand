import { useT } from '@/lib/i18n';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GOAL_QUADRANTS, COURT_ZONES } from '@/domain/constants';
import type { CourtZoneId, GoalZoneId } from '@/domain/types';
import { cn } from '@/lib/cn';

export type ShotOutcome = 'goal' | 'saved' | 'miss' | 'post';

export interface ShotOutcomeDialogProps {
  open: boolean; onClose: () => void;
  goalZone: GoalZoneId | null; courtZone: CourtZoneId | null;
  onConfirm: (outcome: ShotOutcome) => void;
}

export const ShotOutcomeDialog = ({ open, onClose, goalZone, courtZone, onConfirm }: ShotOutcomeDialogProps) => {
  const t = useT();
  const goalLabel = goalZone === 'post' ? t.live_palo : goalZone === 'out' ? t.live_fuera
    : goalZone ? `${GOAL_QUADRANTS[goalZone].arrow} ${GOAL_QUADRANTS[goalZone].label}` : null;
  const courtLabel = courtZone ? COURT_ZONES[courtZone].label : null;

  return (
    <Dialog open={open} onClose={onClose} title={t.outcome_title}>
      <div className="flex items-center justify-center gap-2 mb-4 text-xs text-muted-fg">
        {courtLabel && <span className="px-2 py-1 rounded-md bg-surface-2 border border-border text-fg">{courtLabel}</span>}
        <span>→</span>
        {goalLabel && (
          <span className={cn('px-2 py-1 rounded-md border',
            goalZone === 'post' ? 'bg-warning/15 border-warning/40 text-warning' :
            goalZone === 'out'  ? 'bg-surface-2 border-border text-muted-fg' :
                                  'bg-primary/15 border-primary/40 text-primary')}>
            {goalLabel}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <Button variant="success" onClick={() => onConfirm('goal')} className="h-14 text-base">{t.outcome_goal}</Button>
        <Button onClick={() => onConfirm('saved')} className="h-14 text-base bg-save hover:bg-save/90">{t.outcome_saved}</Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => onConfirm('miss')} className="h-11 text-sm">{t.outcome_miss}</Button>
        <Button variant="secondary" onClick={() => onConfirm('post')} className="h-11 text-sm text-warning border-warning/40 bg-warning/10">{t.outcome_post}</Button>
      </div>
    </Dialog>
  );
};
