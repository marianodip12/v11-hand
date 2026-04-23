import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  HandballEvent,
  HandballTeam,
  MatchStatus,
  MatchSummary,
  Player,
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
  removeTeam: (id: string) => void;

  // Players
  upsertPlayer: (teamId: string, player: Player) => void;
  removePlayer: (teamId: string, playerId: string) => void;

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

export const useMatchStore = create<MatchStoreState>()(
  persist(
    (set) => ({
      teams: [],
      selectedTeamId: null,
      setTeams: (teams) =>
        set((s) => ({
          teams,
          selectedTeamId: s.selectedTeamId ?? teams[0]?.id ?? null,
        })),
      selectTeam: (id) => set({ selectedTeamId: id }),
      upsertTeam: (team) =>
        set((s) => {
          const exists = s.teams.some((t) => t.id === team.id);
          return {
            teams: exists
              ? s.teams.map((t) => (t.id === team.id ? team : t))
              : [...s.teams, team],
            // First team created becomes the default selection.
            selectedTeamId: s.selectedTeamId ?? team.id,
          };
        }),
      removeTeam: (id) =>
        set((s) => {
          const filtered = s.teams.filter((t) => t.id !== id);
          return {
            teams: filtered,
            selectedTeamId:
              s.selectedTeamId === id ? (filtered[0]?.id ?? null) : s.selectedTeamId,
          };
        }),

      upsertPlayer: (teamId, player) =>
        set((s) => ({
          teams: s.teams.map((t) => {
            if (t.id !== teamId) return t;
            const exists = t.players.some((p) => p.id === player.id);
            return {
              ...t,
              players: exists
                ? t.players.map((p) => (p.id === player.id ? player : p))
                : [...t.players, player],
            };
          }),
        })),
      removePlayer: (teamId, playerId) =>
        set((s) => ({
          teams: s.teams.map((t) =>
            t.id === teamId
              ? { ...t, players: t.players.filter((p) => p.id !== playerId) }
              : t,
          ),
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
    }),
    {
      name: 'handball-pro-v11',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      // Persist everything except the currently-live match state,
      // which should reset on page reload to avoid stale clocks.
      partialize: (s) => ({
        teams: s.teams,
        selectedTeamId: s.selectedTeamId,
        completed: s.completed,
      }),
    },
  ),
);

// Selectors — stable refs so React doesn't over-render.
export const selectHomeTeam = (s: MatchStoreState): HandballTeam | null =>
  s.teams.find((t) => t.id === s.selectedTeamId) ?? s.teams[0] ?? null;
