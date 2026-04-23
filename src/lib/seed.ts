import type { HandballTeam } from '@/domain/types';
import type { useMatchStore } from './store';

type StoreState = ReturnType<typeof useMatchStore.getState>;

/**
 * Seeds the store with two example teams the user can immediately use or
 * delete. No completed matches are seeded — the user creates those.
 */
export const seedDefaultTeams = (store: StoreState): void => {
  if (store.teams.length > 0) return;

  const teams: HandballTeam[] = [
    {
      id: 'team-demo-1',
      name: 'Mi Equipo',
      color: '#3B82F6',
      players: [
        { id: 'p-1-1', name: 'Arq Titular', number: 1,  position: 'Arquero' },
        { id: 'p-1-2', name: 'Arq Suplente', number: 12, position: 'Arquero' },
        { id: 'p-1-3', name: 'Ext. Izq',    number: 5,  position: 'Extremo Izq.' },
        { id: 'p-1-4', name: 'Lat. Izq',    number: 7,  position: 'Lateral Izq.' },
        { id: 'p-1-5', name: 'Armador',     number: 10, position: 'Armador' },
        { id: 'p-1-6', name: 'Lat. Der',    number: 8,  position: 'Lateral Der.' },
        { id: 'p-1-7', name: 'Ext. Der',    number: 11, position: 'Extremo Der.' },
        { id: 'p-1-8', name: 'Pivote',      number: 9,  position: 'Pivote' },
      ],
    },
    {
      id: 'team-demo-2',
      name: 'Rival Ejemplo',
      color: '#EF4444',
      players: [],
    },
  ];

  store.setTeams(teams);
};
