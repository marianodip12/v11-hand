import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/app';
import { useMatchStore } from './lib/store';
import { seedDemoData } from './lib/seed';
import './styles/globals.css';

// Seed demo data in dev so the Matches screen isn't empty on first boot.
// In production this path is a no-op — seedDemoData only runs in dev mode.
if (import.meta.env.DEV) {
  seedDemoData(useMatchStore.getState());
}

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found in index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
