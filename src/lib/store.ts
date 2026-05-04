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
  // ─── Settings (UX preferences)
  autoSwitchAttacker: boolean;
  setAutoSwitchAttacker: (v: boolean) => void;

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
  updateLiveEvent: (id: string, patch: Partial<Omit<HandballEvent, 'id' | 'hScore' | 'aScore'>>) => void;
  removeLiveEvent: (id: string) => void;
  setLiveClock: (clock: ClockState) => void;

  // ─── Completed history
  completed: MatchSummary[];
  setCompleted: (matches: MatchSummary[]) => void;
  addCompleted: (m: MatchSummary) => void;
  removeCompleted: (id: string) => void;
  updateCompletedMatch: (id: string, patch: Partial<Omit<MatchSummary, 'id'>>) => void;
  updateCompletedEvent: (matchId: string, eventId: string, patch: Partial<Omit<HandballEvent, 'id' | 'hScore' | 'aScore'>>) => void;
  removeCompletedEvent: (matchId: string, eventId: string) => void;
}

// Recompute running hScore/aScore snapshots after any event mutation.
// Events should be in chronological order (we keep the order they were added).
const rescoreEvents = (events: HandballEvent[]): HandballEvent[] => {
  let h = 0, a = 0;
  return events.map((e) => {
    if (e.type === 'goal') {
      if (e.team === 'home') h++; else a++;
    }
    return { ...e, hScore: h, aScore: a };
  });
};

export const useMatchStore = create<MatchStoreState>()(
  persist(
    (set, get) => ({
      // ─── Settings ─────────────────────────────────────────────────
      autoSwitchAttacker: true,
      setAutoSwitchAttacker: (v) => set({ autoSwitchAttacker: v }),

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

      setLiveEvents: (events) => set({ liveEvents: rescoreEvents(events) }),
      addLiveEvent: (incoming) =>
        set((s) => {
          const nextEvents = [
            ...s.liveEvents,
            {
              ...incoming,
              id: newId(),
              hScore: 0,
              aScore: 0,
            } as HandballEvent,
          ];
          return { liveEvents: rescoreEvents(nextEvents) };
        }),
      updateLiveEvent: (id, patch) =>
        set((s) => {
          const next = s.liveEvents.map((e) =>
            e.id === id ? ({ ...e, ...patch } as HandballEvent) : e,
          );
          // Re-sort by minute (ties keep original order via stable sort)
          next.sort((a, b) => a.min - b.min);
          return { liveEvents: rescoreEvents(next) };
        }),
      removeLiveEvent: (id) =>
        set((s) => {
          const filtered = s.liveEvents.filter((e) => e.id !== id);
          return { liveEvents: rescoreEvents(filtered) };
        }),
      setLiveClock: (clock) => set({ liveClock: clock }),

      // ─── Completed history ────────────────────────────────────────
      completed: [],
      setCompleted: (completed) => set({ completed }),
      addCompleted: (m) => set((s) => ({ completed: [m, ...s.completed] })),
      removeCompleted: (id) =>
        set((s) => ({ completed: s.completed.filter((m) => m.id !== id) })),
      updateCompletedMatch: (id, patch) =>
        set((s) => ({
          completed: s.completed.map((m) =>
            m.id === id ? { ...m, ...patch } : m,
          ),
        })),
      updateCompletedEvent: (matchId, eventId, patch) =>
        set((s) => ({
          completed: s.completed.map((m) => {
            if (m.id !== matchId) return m;
            const next = m.events.map((e) =>
              e.id === eventId ? ({ ...e, ...patch } as HandballEvent) : e,
            );
            next.sort((a, b) => a.min - b.min);
            const rescored = rescoreEvents(next);
            // Recalcular scores totales del partido a partir de los goles
            const goals = rescored.filter((e) => e.type === 'goal');
            const hs = goals.filter((e) => e.team === 'home').length;
            const as = goals.filter((e) => e.team === 'away').length;
            return { ...m, events: rescored, hs, as };
          }),
        })),
      removeCompletedEvent: (matchId, eventId) =>
        set((s) => ({
          completed: s.completed.map((m) => {
            if (m.id !== matchId) return m;
            const filtered = m.events.filter((e) => e.id !== eventId);
            const rescored = rescoreEvents(filtered);
            const goals = rescored.filter((e) => e.type === 'goal');
            const hs = goals.filter((e) => e.team === 'home').length;
            const as = goals.filter((e) => e.team === 'away').length;
            return { ...m, events: rescored, hs, as };
          }),
        })),
    }),
    {
      name: 'handball-pro-v11',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      // Persist everything that should survive a reload, including live state.
      // (If you want the clock to reset on reload, drop liveClock here.)
      partialize: (s) => ({
        autoSwitchAttacker: s.autoSwitchAttacker,
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
