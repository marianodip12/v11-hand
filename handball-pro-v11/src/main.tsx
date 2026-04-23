import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/app';
import { useMatchStore } from './lib/store';
import { seedDemoData } from './lib/seed';
import './styles/globals.css';

// Seed demo data only when explicitly requested via URL flag (?seed=demo).
// This keeps the app empty on first launch so you can load your own team.
if (import.meta.env.DEV && new URLSearchParams(location.search).get('seed') === 'demo') {
  seedDemoData(useMatchStore.getState());
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found in index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
