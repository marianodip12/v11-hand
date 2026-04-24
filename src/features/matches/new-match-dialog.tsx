import { useState } from 'react';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { COMPETITIONS, type Competition } from '@/domain/constants';
import type { HandballTeam } from '@/domain/types';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/cn';

export interface NewMatchValues { teamId: string; awayName: string; competition: Competition; round: string; }
export interface NewMatchDialogProps { open: boolean; onClose: () => void; teams: HandballTeam[]; onStart: (v: NewMatchValues) => void; }

export const NewMatchDialog = ({ open, onClose, teams, onStart }: NewMatchDialogProps) => {
  const t = useT();
  const [teamId, setTeamId] = useState<string>(teams[0]?.id ?? '');
  const [awayName, setAwayName] = useState('');
  const [competition, setCompetition] = useState<Competition>('Liga');
  const [round, setRound] = useState('');

  const canStart = teamId !== '' && awayName.trim() !== '';
  const handleStart = () => { if (!canStart) return; onStart({ teamId, awayName: awayName.trim(), competition, round: round.trim() }); };

  return (
    <Dialog open={open} onClose={onClose} title={t.new_match_title}>
      <div className="flex flex-col gap-5">
        <section>
          <Label>{t.new_match_my_team}</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {teams.length === 0 ? (
              <p className="text-sm text-muted-fg">{t.teams_empty_desc}</p>
            ) : (
              teams.map((tm) => {
                const active = teamId === tm.id;
                return (
                  <button key={tm.id} type="button" onClick={() => setTeamId(tm.id)}
                    className={cn('inline-flex items-center gap-2 px-3 h-11 rounded-md border text-sm font-medium transition-colors',
                      active ? 'border-primary/60 bg-primary/15 text-primary' : 'border-border bg-surface-2 text-muted-fg hover:text-fg')}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: tm.color }} />
                    {tm.name}
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section>
          <Label htmlFor="away">{t.new_match_rival}</Label>
          <Input id="away" placeholder={t.new_match_rival} value={awayName}
            onChange={(e) => setAwayName(e.target.value)} className="mt-2" autoComplete="off" />
        </section>

        <section>
          <Label>{t.new_match_competition}</Label>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {COMPETITIONS.map((c) => (
              <button key={c} type="button" onClick={() => setCompetition(c)}
                className={cn('px-3 h-9 rounded-md border text-xs font-medium transition-colors',
                  competition === c ? 'border-primary/60 bg-primary/15 text-primary' : 'border-border bg-surface-2 text-muted-fg hover:text-fg')}>
                {c}
              </button>
            ))}
          </div>
        </section>

        <section>
          <Label htmlFor="round">{t.new_match_round}</Label>
          <Input id="round" placeholder="Ej: Jornada 5, Final" value={round}
            onChange={(e) => setRound(e.target.value)} className="mt-2" />
        </section>
      </div>

      <DialogFooter className="sm:justify-end">
        <Button variant="ghost" onClick={onClose}>{t.new_match_cancel}</Button>
        <Button onClick={handleStart} disabled={!canStart}>{t.new_match_start}</Button>
      </DialogFooter>
    </Dialog>
  );
};

