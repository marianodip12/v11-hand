import { useT } from '@/lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { adjustClock, clockToMinute, setClockSeconds, tickClock, type ClockState, type Half } from '@/domain/live';
import { cn } from '@/lib/cn';

export interface ScoreboardProps {
  home: string;
  away: string;
  homeColor: string;
  awayColor: string;
  homeScore: number;
  awayScore: number;
  clock: ClockState;
  onClockChange: (clock: ClockState) => void;
}

export const Scoreboard = ({ home, away, homeColor, awayColor, homeScore, awayScore, clock, onClockChange }: ScoreboardProps) => {
  const t = useT();
  const [editOpen, setEditOpen] = useState(false);

  // 1-second tick while running. Ref avoids stale closures on rapid toggles.
  const clockRef = useRef(clock);
  clockRef.current = clock;

  useEffect(() => {
    if (!clock.running) return;
    const id = window.setInterval(() => {
      onClockChange(tickClock(clockRef.current, 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [clock.running, onClockChange]);

  const minute = clockToMinute(clock);
  const mm = String(Math.floor(clock.seconds / 60)).padStart(2, '0');
  const ss = String(clock.seconds % 60).padStart(2, '0');

  const toggle = () => onClockChange({ ...clock, running: !clock.running });
  const adjust = (delta: number) => onClockChange(adjustClock(clock, delta));

  return (
    <>
      <div className="rounded-lg border border-border bg-surface p-3">
        {/* Scores row: [home score] [centered clock+half] [away score] */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <TeamSide name={home} score={homeScore} color={homeColor} align="left" />

          <div className="flex flex-col items-center min-w-[104px]">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse-live" />
              <span className="text-[9px] font-semibold uppercase tracking-widest text-danger">
                En vivo
              </span>
            </div>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="font-mono text-2xl font-semibold tabular text-fg leading-none mt-1 hover:text-primary transition-colors"
              title="Tocá para ajustar el tiempo"
            >
              {mm}:{ss}
            </button>
            <div className="mt-1.5 px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-[10px] font-medium text-primary">
              {clock.half === 1 ? '1er tiempo' : '2do tiempo'} · {minute}'
            </div>
          </div>

          <TeamSide name={away} score={awayScore} color={awayColor} align="right" />
        </div>

        {/* Clock controls */}
        <div className="flex gap-1.5 mt-3">
          <Button
            size="sm"
            variant={clock.running ? 'secondary' : 'primary'}
            onClick={toggle}
            className="flex-1 h-9 text-xs"
          >
            {clock.running ? <PauseIcon /> : <PlayIcon />}
            {clock.running ? t.live_clock_pause : t.live_clock_start}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => adjust(-30)} className="h-9 px-2.5 text-xs">
            −30s
          </Button>
          <Button size="sm" variant="ghost" onClick={() => adjust(30)} className="h-9 px-2.5 text-xs">
            +30s
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)} className="h-9 px-2.5 text-xs">
            Ajustar
          </Button>
        </div>
      </div>

      <EditClockDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        clock={clock}
        onSave={onClockChange}
      />
    </>
  );
};

const TeamSide = ({
  name,
  score,
  color,
  align,
}: {
  name: string;
  score: number;
  color: string;
  align: 'left' | 'right';
}) => (
  <div className={cn('min-w-0', align === 'right' ? 'text-right' : 'text-left')}>
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs font-medium text-fg truncate',
        align === 'right' && 'justify-end',
      )}
    >
      {align === 'left' && (
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      )}
      <span className="truncate">{name}</span>
      {align === 'right' && (
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
      )}
    </div>
    <div className="font-mono text-4xl font-semibold tabular leading-none mt-1">
      {score}
    </div>
  </div>
);

// ─── Edit-clock dialog ─────────────────────────────────────────────────

interface EditClockDialogProps {
  open: boolean;
  onClose: () => void;
  clock: ClockState;
  onSave: (clock: ClockState) => void;
}

const EditClockDialog = ({ open, onClose, clock, onSave }: EditClockDialogProps) => {
  const t = useT();
  const [minStr, setMinStr] = useState('0');
  const [secStr, setSecStr] = useState('0');
  const [half, setHalf] = useState<Half>(1);

  useEffect(() => {
    if (!open) return;
    setMinStr(String(Math.floor(clock.seconds / 60)));
    setSecStr(String(clock.seconds % 60));
    setHalf(clock.half);
  }, [open, clock]);

  const handleSave = () => {
    const m = Math.max(0, Math.min(30, Number(minStr) || 0));
    const s = Math.max(0, Math.min(59, Number(secStr) || 0));
    const next = setClockSeconds({ ...clock, half }, m * 60 + s);
    onSave(next);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Ajustar cronómetro"
      description="Corrige el tiempo si el cronómetro se desfasó."
    >
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Minutos</Label>
          <Input
            type="number"
            min={0}
            max={30}
            value={minStr}
            onChange={(e) => setMinStr(e.target.value)}
            className="mt-2 font-mono"
            autoFocus
          />
        </div>
        <div>
          <Label>Segundos</Label>
          <Input
            type="number"
            min={0}
            max={59}
            value={secStr}
            onChange={(e) => setSecStr(e.target.value)}
            className="mt-2 font-mono"
          />
        </div>
      </div>
      <div className="mt-4">
        <Label>Tiempo</Label>
        <Select
          value={String(half)}
          onChange={(e) => setHalf(Number(e.target.value) as Half)}
          className="mt-2"
        >
          <option value="1">Primer tiempo (0–30')</option>
          <option value="2">Segundo tiempo (30–60')</option>
        </Select>
      </div>
      <DialogFooter className="sm:justify-end">
        <Button variant="ghost" onClick={onClose}>{t.team_dialog_cancel}</Button>
        <Button onClick={handleSave}>{t.team_dialog_save}</Button>
      </DialogFooter>
    </Dialog>
  );
};

const PlayIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
  </svg>
);
