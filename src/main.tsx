import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/app';
import { useMatchStore } from './lib/store';
import { seedDefaultTeams } from './lib/seed';
import './styles/globals.css';

// Seed default teams on first boot. Idempotent: won't overwrite if the
// user already has their own teams loaded.
seedDefaultTeams(useMatchStore.getState());

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found in index.html');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
