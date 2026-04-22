import { create } from 'zustand';
import type {
  HandballEvent,
  HandballTeam,
  MatchStatus,
  MatchSummary,
} from '@/domain/types';
import type { Competition } from '@/domain/constants';

interface LiveMatchInfo {
  id: string | null;
  home: string;
  away: string;
  competition: Competition | string;
  round: string | null;
  date: string | null;
}

const EMPTY_LIVE: LiveMatchInfo = {
  id: null,
  home: '',
  away: '',
  competition: 'Liga',
  round: null,
  date: null,
};

interface MatchStoreState {
  // Teams
  teams: HandballTeam[];
  selectedTeamId: string | null;
  setTeams: (teams: HandballTeam[]) => void;
  selectTeam: (id: string | null) => void;
  upsertTeam: (team: HandballTeam) => void;

  // Live match
  status: MatchStatus;
  liveMatch: LiveMatchInfo;
  liveEvents: HandballEvent[];
  setLiveEvents: (events: HandballEvent[]) => void;
  startLive: (info: LiveMatchInfo) => void;
  closeLive: () => void;

  // Completed history
  completed: MatchSummary[];
  setCompleted: (matches: MatchSummary[]) => void;
  addCompleted: (m: MatchSummary) => void;
  removeCompleted: (id: string) => void;
}

export const useMatchStore = create<MatchStoreState>((set) => ({
  teams: [],
  selectedTeamId: null,
  setTeams: (teams) =>
    set((s) => ({
      teams,
      selectedTeamId: s.selectedTeamId ?? teams[0]?.id ?? null,
    })),
  selectTeam: (id) => set({ selectedTeamId: id }),
  upsertTeam: (team) =>
    set((s) => ({
      teams: s.teams.some((t) => t.id === team.id)
        ? s.teams.map((t) => (t.id === team.id ? team : t))
        : [...s.teams, team],
    })),

  status: 'idle',
  liveMatch: EMPTY_LIVE,
  liveEvents: [],
  setLiveEvents: (events) => set({ liveEvents: events }),
  startLive: (info) =>
    set({ status: 'live', liveMatch: info, liveEvents: [] }),
  closeLive: () =>
    set({ status: 'idle', liveMatch: EMPTY_LIVE, liveEvents: [] }),

  completed: [],
  setCompleted: (completed) => set({ completed }),
  addCompleted: (m) => set((s) => ({ completed: [m, ...s.completed] })),
  removeCompleted: (id) =>
    set((s) => ({ completed: s.completed.filter((m) => m.id !== id) })),
}));

// Selectors — stable refs so React doesn't over-render.
export const selectHomeTeam = (s: MatchStoreState): HandballTeam | null =>
  s.teams.find((t) => t.id === s.selectedTeamId) ?? s.teams[0] ?? null;
