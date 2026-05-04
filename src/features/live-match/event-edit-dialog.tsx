import { useEffect, useState } from 'react';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EVENT_TYPES, COURT_ZONES, GOAL_QUADRANTS } from '@/domain/constants';
import type {
  EventType,
  HandballEvent,
  CourtZoneId,
  GoalZoneId,
  Team,
} from '@/domain/types';
import { cn } from '@/lib/cn';

export interface EventEditDialogProps {
  open: boolean;
  onClose: () => void;
  event: HandballEvent | null;
  homeName: string;
  awayName: string;
  onSave: (patch: Partial<Omit<HandballEvent, 'id' | 'hScore' | 'aScore'>>) => void;
  onDelete: () => void;
}

const ALL_EVENT_TYPES: EventType[] = [
  'goal', 'miss', 'saved', 'post',
  'turnover', 'timeout', 'exclusion',
  'red_card', 'blue_card', 'yellow_card',
  'half_time',
];

const ALL_COURT_ZONES: (CourtZoneId | '')[] = [
  '', 'extreme_left', 'lateral_left', 'center_above', 'lateral_right', 'extreme_right',
  'near_left', 'near_center', 'near_right', '7m', 'long_range',
];

const ALL_GOAL_ZONES: (GoalZoneId | '')[] = [
  '', 'tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br', 'post', 'out',
];

export const EventEditDialog = ({
  open,
  onClose,
  event,
  homeName,
  awayName,
  onSave,
  onDelete,
}: EventEditDialogProps) => {
  const [minute, setMinute] = useState('');
  const [team, setTeam] = useState<Team>('home');
  const [type, setType] = useState<EventType>('goal');
  const [zone, setZone] = useState<CourtZoneId | ''>('');
  const [goalZone, setGoalZone] = useState<GoalZoneId | ''>('');
  const [shooterName, setShooterName] = useState('');
  const [shooterNumber, setShooterNumber] = useState('');

  useEffect(() => {
    if (!open || !event) return;
    setMinute(String(event.min));
    setTeam(event.team);
    setType(event.type);
    setZone((event.zone as CourtZoneId) ?? '');
    setGoalZone((event.goalZone as GoalZoneId) ?? '');
    setShooterName(event.shooter?.name ?? event.sanctioned?.name ?? '');
    setShooterNumber(
      event.shooter?.number?.toString() ?? event.sanctioned?.number?.toString() ?? '',
    );
  }, [open, event]);

  if (!event) return null;

  const handleSave = () => {
    const minNum = Math.max(0, Math.min(60, Number(minute) || 0));
    const playerNum = shooterNumber.trim() === '' ? null : Number(shooterNumber);
    const playerName = shooterName.trim();
    const personRef =
      playerNum !== null && Number.isFinite(playerNum) && playerNum > 0
        ? { name: playerName || `#${playerNum}`, number: playerNum }
        : null;

    // Decide where to attach the player ref based on event type
    const isShot = type === 'goal' || type === 'miss' || type === 'saved' || type === 'post';
    const isPossession = type === 'turnover';
    const isSanctioned =
      type === 'exclusion' || type === 'red_card' || type === 'blue_card' || type === 'yellow_card';

    const patch: Partial<Omit<HandballEvent, 'id' | 'hScore' | 'aScore'>> = {
      min: minNum,
      team,
      type,
      zone: zone === '' ? null : (zone as CourtZoneId),
      goalZone: goalZone === '' ? null : (goalZone as GoalZoneId),
      shooter: isShot || isPossession ? personRef : null,
      sanctioned: isSanctioned ? personRef : null,
    };
    onSave(patch);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('¿Borrar este evento? No se puede deshacer.')) {
      onDelete();
      onClose();
    }
  };

  const showZoneFields = type === 'goal' || type === 'miss' || type === 'saved' || type === 'post' || type === 'turnover';
  const showPlayerField = type !== 'timeout' && type !== 'half_time';

  const playerLabel =
    type === 'goal' || type === 'miss' || type === 'saved' || type === 'post'
      ? 'Tirador'
      : type === 'turnover'
      ? 'Quien perdió la pelota'
      : 'Sancionado';

  return (
    <Dialog open={open} onClose={onClose} title="Editar evento">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <section>
            <Label htmlFor="ev-min">Minuto</Label>
            <Input
              id="ev-min"
              type="number"
              inputMode="numeric"
              min={0}
              max={60}
              value={minute}
              onChange={(e) => setMinute(e.target.value)}
              className="mt-1.5 font-mono"
            />
          </section>
          <section>
            <Label>Equipo</Label>
            <div className="mt-1.5 grid grid-cols-2 gap-1 rounded-md border border-border bg-surface p-1">
              {(['home', 'away'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTeam(t)}
                  className={cn(
                    'h-8 text-xs rounded transition-colors',
                    team === t
                      ? 'bg-primary/15 text-primary border border-primary/40'
                      : 'text-muted-fg hover:text-fg',
                  )}
                >
                  {t === 'home' ? homeName : awayName}
                </button>
              ))}
            </div>
          </section>
        </div>

        <section>
          <Label htmlFor="ev-type">Tipo de evento</Label>
          <Select
            id="ev-type"
            value={type}
            onChange={(e) => setType(e.target.value as EventType)}
            className="mt-1.5"
          >
            {ALL_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {EVENT_TYPES[t].label}
              </option>
            ))}
          </Select>
        </section>

        {showZoneFields && (
          <div className="grid grid-cols-2 gap-3">
            <section>
              <Label htmlFor="ev-zone">Zona de cancha</Label>
              <Select
                id="ev-zone"
                value={zone}
                onChange={(e) => setZone(e.target.value as CourtZoneId | '')}
                className="mt-1.5"
              >
                <option value="">— sin definir —</option>
                {ALL_COURT_ZONES.filter((z) => z !== '').map((z) => (
                  <option key={z} value={z}>
                    {COURT_ZONES[z as CourtZoneId].label}
                  </option>
                ))}
              </Select>
            </section>
            <section>
              <Label htmlFor="ev-goal">Zona del arco</Label>
              <Select
                id="ev-goal"
                value={goalZone}
                onChange={(e) => setGoalZone(e.target.value as GoalZoneId | '')}
                className="mt-1.5"
              >
                <option value="">— sin definir —</option>
                {ALL_GOAL_ZONES.filter((z) => z !== '').map((z) => {
                  const label =
                    z === 'post' ? 'Palo' :
                    z === 'out'  ? 'Lanzamiento con falta' :
                    GOAL_QUADRANTS[z as keyof typeof GOAL_QUADRANTS].label;
                  return (
                    <option key={z} value={z}>{label}</option>
                  );
                })}
              </Select>
            </section>
          </div>
        )}

        {showPlayerField && (
          <section>
            <Label>{playerLabel}</Label>
            <div className="mt-1.5 grid grid-cols-[80px_1fr] gap-2">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={99}
                value={shooterNumber}
                onChange={(e) => setShooterNumber(e.target.value)}
                placeholder="#"
                className="font-mono"
              />
              <Input
                value={shooterName}
                onChange={(e) => setShooterName(e.target.value)}
                placeholder="Nombre (opcional)"
              />
            </div>
            <p className="text-[10px] text-muted-fg mt-1">
              Dejá el nombre vacío si solo conocés el número.
            </p>
          </section>
        )}
      </div>

      <DialogFooter className="sm:justify-between">
        <Button variant="danger" size="sm" onClick={handleDelete}>
          Eliminar
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar</Button>
        </div>
      </DialogFooter>
    </Dialog>
  );
};
