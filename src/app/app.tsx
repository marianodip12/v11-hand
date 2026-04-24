import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './app-shell';
import { MatchesPage } from '@/features/matches/matches-page';
import { TeamsPage } from '@/features/teams/teams-page';
import { LiveMatchPage } from '@/features/live-match/live-match-page';
import { MatchAnalysisPage } from '@/features/match-analysis/match-analysis-page';
import { StatsPage } from '@/features/stats/stats-page';
import { EvolutionPage } from '@/features/evolution/evolution-page';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <MatchesPage /> },
      { path: 'teams',     element: <TeamsPage /> },
      { path: 'live',      element: <LiveMatchPage /> },
      { path: 'stats',     element: <StatsPage /> },
      { path: 'evolution', element: <EvolutionPage /> },
      { path: 'analysis/:id', element: <MatchAnalysisPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <RouterProvider router={router} />
  </QueryClientProvider>
);
