import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { INITIAL_CLOCK, type ClockState } from '@/domain/live';
import { computeScore } from '@/domain/events';
import { newId } from '@/domain/teams';
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
  homeColor: string;
  awayColor: string;
  competition: Competition | string;
  round: string | null;
  date: string | null;
}

const EMPTY_LIVE: LiveMatchInfo = {
  id: null,
  home: '',
  away: '',
  homeColor: '#3B82F6',
  awayColor: '#64748B',
  competition: 'Liga',
  round: null,
  date: null,
};

interface MatchStoreState {
  // ─── Teams
  teams: HandballTeam[];
  selectedTeamId: string | null;
  setTeams: (teams: HandballTeam[]) => void;
  selectTeam: (id: string | null) => void;
  upsertTeam: (team: HandballTeam) => void;
  removeTeam: (id: string) => void;

  // ─── Players
  upsertPlayer: (teamId: string, player: Player) => void;
  removePlayer: (teamId: string, playerId: string) => void;

  // ─── Live match
  status: MatchStatus;
  liveMatch: LiveMatchInfo;
  liveEvents: HandballEvent[];
  liveClock: ClockState;
  startLive: (info: Omit<LiveMatchInfo, 'id'> & { id?: string | null }) => void;
  closeLive: () => void;
  finishLive: () => void;                         // move live → completed
  setLiveEvents: (events: HandballEvent[]) => void;
  addLiveEvent: (event: Omit<HandballEvent, 'id' | 'hScore' | 'aScore'>) => void;
  removeLiveEvent: (id: string) => void;
  setLiveClock: (clock: ClockState) => void;

  // ─── Completed history
  completed: MatchSummary[];
  setCompleted: (matches: MatchSummary[]) => void;
  addCompleted: (m: MatchSummary) => void;
  removeCompleted: (id: string) => void;
}

export const useMatchStore = create<MatchStoreState>()(
  persist(
    (set, get) => ({
      // ─── Teams ────────────────────────────────────────────────────
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

      // ─── Players ──────────────────────────────────────────────────
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

      // ─── Live match ───────────────────────────────────────────────
      status: 'idle',
      liveMatch: EMPTY_LIVE,
      liveEvents: [],
      liveClock: INITIAL_CLOCK,

      startLive: (info) =>
        set({
          status: 'live',
          liveMatch: { ...EMPTY_LIVE, ...info, id: info.id ?? newId() },
          liveEvents: [],
          liveClock: INITIAL_CLOCK,
        }),

      closeLive: () =>
        set({
          status: 'idle',
          liveMatch: EMPTY_LIVE,
          liveEvents: [],
          liveClock: INITIAL_CLOCK,
        }),

      /**
       * Finish the live match: persist a MatchSummary in `completed`,
       * then reset live state. Called from the Live screen's "Finalizar" CTA.
       */
      finishLive: () => {
        const s = get();
        if (s.status !== 'live') return;
        const { h, a } = computeScore(s.liveEvents);
        const summary: MatchSummary = {
          id: s.liveMatch.id ?? newId(),
          home: s.liveMatch.home,
          away: s.liveMatch.away,
          hs: h,
          as: a,
          date:
            s.liveMatch.date ??
            new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }),
          competition: String(s.liveMatch.competition ?? ''),
          homeColor: s.liveMatch.homeColor,
          awayColor: s.liveMatch.awayColor,
          events: s.liveEvents,
        };
        set({
          status: 'idle',
          liveMatch: EMPTY_LIVE,
          liveEvents: [],
          liveClock: INITIAL_CLOCK,
          completed: [summary, ...s.completed],
        });
      },

      setLiveEvents: (events) => set({ liveEvents: events }),
      addLiveEvent: (incoming) =>
        set((s) => {
          const nextEvents = [
            ...s.liveEvents,
            {
              ...incoming,
              id: newId(),
              // hScore/aScore are snapshotted at persistence time
              hScore: 0,
              aScore: 0,
            } as HandballEvent,
          ];
          // Recompute running score at each event so the snapshot is correct
          // even if events get added out of order (rare but possible).
          let h = 0, a = 0;
          const withScores = nextEvents.map((e) => {
            if (e.type === 'goal') {
              if (e.team === 'home') h++; else a++;
            }
            return { ...e, hScore: h, aScore: a };
          });
          return { liveEvents: withScores };
        }),
      removeLiveEvent: (id) =>
        set((s) => {
          const filtered = s.liveEvents.filter((e) => e.id !== id);
          let h = 0, a = 0;
          const rescored = filtered.map((e) => {
            if (e.type === 'goal') {
              if (e.team === 'home') h++; else a++;
            }
            return { ...e, hScore: h, aScore: a };
          });
          return { liveEvents: rescored };
        }),
      setLiveClock: (clock) => set({ liveClock: clock }),

      // ─── Completed history ────────────────────────────────────────
      completed: [],
      setCompleted: (completed) => set({ completed }),
      addCompleted: (m) => set((s) => ({ completed: [m, ...s.completed] })),
      removeCompleted: (id) =>
        set((s) => ({ completed: s.completed.filter((m) => m.id !== id) })),
    }),
    {
      name: 'handball-pro-v11',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      // Persist everything that should survive a reload, including live state.
      // (If you want the clock to reset on reload, drop liveClock here.)
      partialize: (s) => ({
        teams: s.teams,
        selectedTeamId: s.selectedTeamId,
        completed: s.completed,
        status: s.status,
        liveMatch: s.liveMatch,
        liveEvents: s.liveEvents,
        liveClock: { ...s.liveClock, running: false }, // always reload paused
      }),
    },
  ),
);

// ─── Selectors ─────────────────────────────────────────────────────────
export const selectHomeTeam = (s: MatchStoreState): HandballTeam | null =>
  s.teams.find((t) => t.id === s.selectedTeamId) ?? s.teams[0] ?? null;
