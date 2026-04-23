import { useMemo, useState } from 'react';
import type { GoalkeeperSummary, ShooterSummary } from '@/domain/analysis';
import type { Team } from '@/domain/types';
import { cn } from '@/lib/cn';

export type PanelKind = 'shooters' | 'goalkeepers';

export interface PlayersPanelProps {
  shooters: ShooterSummary[];
  goalkeepers: GoalkeeperSummary[];
  selectedKey: string | null;
  home: string;
  away: string;
  homeColor: string;
  awayColor: string;
  onToggle: (key: string) => void;
}

type TeamFilter = Team | 'all';

/**
 * Two-mode panel: shooters (tiradores) vs goalkeepers (arqueros).
 * Within each mode, a toggle filters by team.
 */
export const PlayersPanel = ({
  shooters,
  goalkeepers,
  selectedKey,
  home,
  away,
  homeColor,
  awayColor,
  onToggle,
}: PlayersPanelProps) => {
  const [kind, setKind] = useState<PanelKind>('shooters');
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('all');

  const filteredShooters = useMemo(
    () => (teamFilter === 'all' ? shooters : shooters.filter((s) => s.team === teamFilter)),
    [shooters, teamFilter],
  );
  const filteredGKs = useMemo(
    () => (teamFilter === 'all' ? goalkeepers : goalkeepers.filter((g) => g.team === teamFilter)),
    [goalkeepers, teamFilter],
  );

  return (
    <div className="space-y-2">
      {/* Kind tabs */}
      <div className="rounded-lg border border-border bg-surface p-1 flex gap-1">
        <KindTab label="🎯 Tiradores" count={shooters.length} active={kind === 'shooters'} onClick={() => setKind('shooters')} />
        <KindTab label="🧤 Arqueros"  count={goalkeepers.length} active={kind === 'goalkeepers'} onClick={() => setKind('goalkeepers')} />
      </div>

      {/* Team filter */}
      <div className="flex gap-1 text-[10px]">
        <TeamChip
          label="Todos"
          active={teamFilter === 'all'}
          onClick={() => setTeamFilter('all')}
        />
        <TeamChip
          label={home}
          color={homeColor}
          active={teamFilter === 'home'}
          onClick={() => setTeamFilter('home')}
        />
        <TeamChip
          label={away}
          color={awayColor}
          active={teamFilter === 'away'}
          onClick={() => setTeamFilter('away')}
        />
      </div>

      {/* List */}
      {kind === 'shooters' ? (
        <ShooterList
          shooters={filteredShooters}
          selectedKey={selectedKey}
          homeColor={homeColor}
          awayColor={awayColor}
          onToggle={onToggle}
        />
      ) : (
        <GoalkeeperList
          goalkeepers={filteredGKs}
          selectedKey={selectedKey}
          homeColor={homeColor}
          awayColor={awayColor}
          onToggle={onToggle}
        />
      )}
    </div>
  );
};

// ─── Subcomponents ───────────────────────────────────────────────────

const KindTab = ({
  label, count, active, onClick,
}: { label: string; count: number; active: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex-1 h-9 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition-colors',
      active ? 'bg-primary/15 border border-primary/40 text-primary' : 'text-muted-fg hover:text-fg',
    )}
  >
    <span>{label}</span>
    <span className="text-[10px] opacity-70">({count})</span>
  </button>
);

const TeamChip = ({
  label, color, active, onClick,
}: { label: string; color?: string; active: boolean; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'inline-flex items-center gap-1 px-2 py-1 rounded-full border transition-colors',
      active
        ? 'border-primary/40 bg-primary/15 text-primary'
        : 'border-border bg-surface-2/40 text-muted-fg hover:text-fg',
    )}
  >
    {color && <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />}
    <span className="truncate max-w-[90px]">{label}</span>
  </button>
);

const ShooterList = ({
  shooters, selectedKey, homeColor, awayColor, onToggle,
}: {
  shooters: ShooterSummary[];
  selectedKey: string | null;
  homeColor: string;
  awayColor: string;
  onToggle: (key: string) => void;
}) => {
  if (shooters.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-surface-2/30 py-6 text-center">
        <p className="text-xs text-muted-fg">Sin tiradores en este filtro</p>
      </div>
    );
  }
  return (
    <ul className="space-y-1.5">
      {shooters.map((s) => {
        const active = selectedKey === s.key;
        const color = s.team === 'home' ? homeColor : awayColor;
        return (
          <li key={s.key}>
            <button
              type="button"
              onClick={() => onToggle(s.key)}
              className={cn(
                'w-full flex items-center gap-2 p-2 rounded-md border transition-colors',
                active
                  ? 'border-fg bg-surface-2 ring-1 ring-fg/20'
                  : 'border-border bg-surface-2/60 hover:bg-surface-2',
              )}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-mono text-sm font-bold tabular text-white shrink-0"
                style={{ background: color, opacity: active ? 1 : 0.85 }}
              >
                {s.number}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-medium text-fg truncate">{s.name}</div>
                <div className="text-[10px] text-muted-fg">
                  {s.shots} {s.shots === 1 ? 'tiro' : 'tiros'}
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono tabular">
                <MiniStat label="G"  value={s.goals} tone="goal" />
                <MiniStat label="A"  value={s.saved} tone="save" />
                <MiniStat label="E"  value={s.miss}  tone="danger" />
                <MiniStat label="P"  value={s.post}  tone="warning" />
                <div className="w-12 text-right font-semibold text-fg">{s.pct}%</div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

const GoalkeeperList = ({
  goalkeepers, selectedKey, homeColor, awayColor, onToggle,
}: {
  goalkeepers: GoalkeeperSummary[];
  selectedKey: string | null;
  homeColor: string;
  awayColor: string;
  onToggle: (key: string) => void;
}) => {
  if (goalkeepers.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-surface-2/30 py-6 text-center">
        <p className="text-xs text-muted-fg">Sin arqueros identificados</p>
      </div>
    );
  }
  return (
    <ul className="space-y-1.5">
      {goalkeepers.map((g) => {
        const active = selectedKey === g.key;
        const color = g.team === 'home' ? homeColor : awayColor;
        return (
          <li key={g.key}>
            <button
              type="button"
              onClick={() => onToggle(g.key)}
              className={cn(
                'w-full flex items-center gap-2 p-2 rounded-md border transition-colors',
                active
                  ? 'border-fg bg-surface-2 ring-1 ring-fg/20'
                  : 'border-border bg-surface-2/60 hover:bg-surface-2',
              )}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-mono text-sm font-bold tabular text-white shrink-0"
                style={{ background: color, opacity: active ? 1 : 0.85 }}
              >
                {g.number}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-medium text-fg truncate">{g.name}</div>
                <div className="text-[10px] text-muted-fg">
                  {g.faced} {g.faced === 1 ? 'tiro al arco' : 'tiros al arco'}
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono tabular">
                <MiniStat label="Ata" value={g.saved}    tone="save" />
                <MiniStat label="Go"  value={g.conceded} tone="goal" />
                <div className="w-12 text-right font-semibold text-save">{g.pct}%</div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

const MiniStat = ({
  label, value, tone,
}: { label: string; value: number; tone: 'goal' | 'save' | 'danger' | 'warning' }) => {
  const toneCls =
    tone === 'goal'    ? 'text-goal' :
    tone === 'save'    ? 'text-save' :
    tone === 'warning' ? 'text-warning' :
                         'text-danger';
  return (
    <div className="flex flex-col items-center w-7">
      <span className={cn('font-semibold', toneCls)}>{value}</span>
      <span className="text-[8px] uppercase tracking-wider text-muted-fg">{label}</span>
    </div>
  );
};
