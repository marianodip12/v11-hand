import type { HandballTeam, MatchSummary } from '@/domain/types';
import type { useMatchStore } from './store';

type StoreState = ReturnType<typeof useMatchStore.getState>;

/**
 * Seeds the store with a handful of fake teams and completed matches.
 * Useful for the design/UX demo when Supabase isn't wired up yet.
 *
 * Called from main.tsx only when `import.meta.env.DEV` is true.
 */
export const seedDemoData = (store: StoreState): void => {
  // Idempotent: don't overwrite if already seeded.
  if (store.teams.length > 0 || store.completed.length > 0) return;

  const teams: HandballTeam[] = [
    {
      id: 'team-atletico',
      name: 'Atlético Handball',
      color: '#3B82F6',
      players: [],
    },
    {
      id: 'team-river',
      name: 'River Plate',
      color: '#EF4444',
      players: [],
    },
  ];

  const completed: MatchSummary[] = [
    {
      id: 'm-001',
      home: 'Atlético Handball',
      away: 'Ferro',
      hs: 28,
      as: 24,
      date: '12/04',
      competition: 'Liga',
      homeColor: '#3B82F6',
      awayColor: '#10B981',
      events: [],
    },
    {
      id: 'm-002',
      home: 'River Plate',
      away: 'Atlético Handball',
      hs: 22,
      as: 22,
      date: '05/04',
      competition: 'Liga',
      homeColor: '#EF4444',
      awayColor: '#3B82F6',
      events: [],
    },
    {
      id: 'm-003',
      home: 'Atlético Handball',
      away: 'San Lorenzo',
      hs: 18,
      as: 25,
      date: '29/03',
      competition: 'Copa',
      homeColor: '#3B82F6',
      awayColor: '#F59E0B',
      events: [],
    },
    {
      id: 'm-004',
      home: 'Boca Juniors',
      away: 'Atlético Handball',
      hs: 20,
      as: 26,
      date: '22/03',
      competition: 'Liga',
      homeColor: '#F59E0B',
      awayColor: '#3B82F6',
      events: [],
    },
  ];

  store.setTeams(teams);
  store.setCompleted(completed);
};
