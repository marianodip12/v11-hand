import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { MatchSummary } from '@/domain/types';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/cn';

// ─── Live banner ───────────────────────────────────────────────────────
export interface LiveBannerProps {
  home: string; away: string;
  homeScore: number; awayScore: number;
  onResume: () => void;
}

export const LiveBanner = ({ home, away, homeScore, awayScore, onResume }: LiveBannerProps) => {
  const t = useT();
  return (
    <Card className="border-danger/40 bg-danger/10">
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="w-2 h-2 rounded-full bg-danger animate-pulse-live" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-danger">
            {t.live_banner}
          </span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-3">
          <div className="text-center">
            <div className="text-[11px] font-medium text-fg truncate">{home}</div>
            <div className="font-mono text-3xl font-semibold tabular text-fg leading-none mt-1">{homeScore}</div>
          </div>
          <span className="text-xs text-muted-fg">VS</span>
          <div className="text-center">
            <div className="text-[11px] font-medium text-fg truncate">{away}</div>
            <div className="font-mono text-3xl font-semibold tabular text-fg leading-none mt-1">{awayScore}</div>
          </div>
        </div>
        <Button variant="danger" size="md" onClick={onResume}
          className="w-full bg-danger/25 hover:bg-danger/35 text-danger border border-danger/40">
          {t.live_go}
        </Button>
      </CardContent>
    </Card>
  );
};

// ─── Completed match card ──────────────────────────────────────────────
export interface MatchCardProps {
  match: MatchSummary; myTeamName: string;
  onAnalyze: () => void; onViewEvolution: () => void;
   onDelete: () => void;
}

export const MatchCard = ({ match, myTeamName, onAnalyze, onViewEvolution, onDelete }: MatchCardProps) => {
  const t = useT();
  const isHome = match.home === myTeamName;
  const isAway = match.away === myTeamName;
  const playedByMe = isHome || isAway;

  let resultKey: 'W' | 'D' | 'L' | null = null;
  if (playedByMe) {
    const mine = isHome ? match.hs : match.as;
    const opp  = isHome ? match.as : match.hs;
    resultKey = mine > opp ? 'W' : mine === opp ? 'D' : 'L';
  }

  const resultStyles = {
    W: 'border-goal/60 bg-goal/15 text-goal',
    D: 'border-warning/60 bg-warning/15 text-warning',
    L: 'border-danger/60 bg-danger/15 text-danger',
  };

  const resultLabel = { W: t.card_win, D: t.card_draw, L: t.card_loss };

  const homeWon = match.hs > match.as;
  const awayWon = match.as > match.hs;

  return (
    <Card>
      <CardContent className="p-4">
        <header className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {match.date && <span className="text-[11px] text-muted-fg">{match.date}</span>}
            {match.competition && <Badge tone="primary">{match.competition}</Badge>}
          </div>
          <div className="flex items-center gap-1.5">
            {resultKey && (
              <span
                className={cn('w-6 h-6 rounded-full border-[1.5px] flex items-center justify-center text-[10px] font-bold', resultStyles[resultKey])}
                aria-label={resultLabel[resultKey]}
              >
                {resultKey}
              </span>
            )}
            <Badge tone="goal">{t.card_final}</Badge>
          </div>
        </header>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 mb-4">
          <TeamLine name={match.home} score={match.hs} color={match.homeColor} dimmed={!homeWon && match.hs !== match.as} />
          <span className="text-[11px] text-muted-fg">–</span>
          <TeamLine name={match.away} score={match.as} color={match.awayColor} dimmed={!awayWon && match.hs !== match.as} align="right" />
        </div>

        <div className="flex gap-1.5">
          <Button variant="secondary" size="sm" onClick={onAnalyze}
            className="flex-[2] bg-primary/15 border-primary/30 text-primary hover:bg-primary/20">
            {t.card_analyze}
          </Button>
          <Button variant="secondary" size="sm" onClick={onViewEvolution} className="flex-1">
            {t.card_evolution}
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}
            className="text-danger hover:bg-danger/10" aria-label={t.card_delete}>
            <TrashIcon />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const TeamLine = ({ name, score, color, dimmed, align = 'left' }: {
  name: string; score: number; color: string; dimmed: boolean; align?: 'left' | 'right';
}) => (
  <div className={cn('min-w-0', align === 'right' ? 'text-right' : 'text-left')}>
    <div className={cn('flex items-center gap-2 text-xs font-medium truncate', align === 'right' && 'justify-end', dimmed ? 'text-muted-fg' : 'text-fg')}>
      {align === 'left' && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />}
      <span className="truncate">{name}</span>
      {align === 'right' && <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />}
    </div>
    <div className={cn('font-mono text-2xl font-semibold tabular leading-none mt-1', dimmed ? 'text-muted-fg' : 'text-fg')}>
      {score}
    </div>
  </div>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </svg>
);
