import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/app';
import { useMatchStore } from './lib/store';
import { seedDefaultTeams } from './lib/seed';
import { simulateMatch } from './lib/simulate';
import './styles/globals.css';

// Seed default teams on first boot (idempotent).
seedDefaultTeams(useMatchStore.getState());

// Optional: ?demo=sim → inject a fully simulated 60' match once.
if (new URLSearchParams(location.search).get('demo') === 'sim') {
  const store = useMatchStore.getState();
  const already = store.completed.some((m) => m.id === 'demo-sim-60m');
  if (!already && store.teams.length >= 2) {
    const match = simulateMatch({
      home: store.teams[0],
      away: store.teams[1],
      date: '19/04',
      competition: 'Liga',
      seed: 42,
    });
    match.id = 'demo-sim-60m';
    // Add to completed without touching live state
    useMatchStore.setState({ completed: [match, ...store.completed] });
  }
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found in index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
