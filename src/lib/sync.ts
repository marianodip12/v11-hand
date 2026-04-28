/**
 * SUPABASE SYNC - Sincronización automática Zustand → Supabase
 */

import { supabase, getCurrentUser } from './supabase';
import { useMatchStore } from './store';
import type { HandballEvent, HandballTeam, MatchSummary, Player } from '@/domain/types';

// ============================================================================
// STATE
// ============================================================================
let isInitialized = false;
let currentUserId: string | null = null;
let unsubscribeStore: (() => void) | null = null;

const syncedTeams = new Set<string>();
const syncedPlayers = new Set<string>();
const syncedMatches = new Set<string>();
const syncedEvents = new Set<string>();

// ============================================================================
// AUTH
// ============================================================================
async function ensureUser(): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    if (user) {
      currentUserId = user.id;
      return user.id;
    }

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.warn('[sync] No se pudo crear sesión anónima:', error.message);
      return null;
    }

    currentUserId = data.user?.id ?? null;
    return currentUserId;
  } catch (e) {
    console.warn('[sync] Error de auth:', e);
    return null;
  }
}

// ============================================================================
// SYNC TEAMS
// ============================================================================
async function syncTeam(team: HandballTeam, userId: string) {
  try {
    await supabase.from('teams').upsert({
      id: team.id,
      user_id: userId,
      name: team.name,
      short_name: (team as any).shortName ?? null,
      color_primary: (team as any).color ?? '#3B82F6',
    });
    syncedTeams.add(team.id);

    for (const player of team.players ?? []) {
      await syncPlayer(player, team.id, userId);
    }
  } catch (e) {
    console.warn('[sync] Error team:', e);
  }
}

// ============================================================================
// SYNC PLAYERS
// ============================================================================
async function syncPlayer(player: Player, teamId: string, userId: string) {
  if (syncedPlayers.has(player.id)) return;

  try {
    await supabase.from('players').upsert({
      id: player.id,
      user_id: userId,
      team_id: teamId,
      name: player.name,
      number: (player as any).number ?? null,
      position: (player as any).position ?? null,
      is_goalkeeper: (player as any).position === 'GK',
    });
    syncedPlayers.add(player.id);
  } catch (e) {
    console.warn('[sync] Error player:', e);
  }
}

// ============================================================================
// SYNC MATCHES
// ============================================================================
async function syncMatch(match: MatchSummary, userId: string) {
  if (syncedMatches.has(match.id)) return;

  try {
    const homeTeamId = await findOrCreateTeam(match.home, match.homeColor, userId);
    const awayTeamId = await findOrCreateTeam(match.away, match.awayColor, userId);

    if (!homeTeamId || !awayTeamId) return;

    await supabase.from('matches').upsert({
      id: match.id,
      user_id: userId,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      match_date: parseDate(match.date),
      competition: match.competition ?? null,
      home_score: match.hs,
      away_score: match.as,
      status: 'finished',
    });
    syncedMatches.add(match.id);

    if (match.events && match.events.length > 0) {
      await syncEvents(match.events, match.id, homeTeamId, awayTeamId, userId);
    }
  } catch (e) {
    console.warn('[sync] Error match:', e);
  }
}

// ============================================================================
// SYNC EVENTS
// ============================================================================
async function syncEvents(
  events: HandballEvent[],
  matchId: string,
  homeTeamId: string,
  awayTeamId: string,
  userId: string,
) {
  for (const event of events) {
    if (syncedEvents.has(event.id)) continue;

    try {
      const teamId = event.team === 'home' ? homeTeamId : awayTeamId;

      await supabase.from('events').upsert({
        id: event.id,
        user_id: userId,
        match_id: matchId,
        team_id: teamId,
        event_type: mapEventType(event.type),
        match_minute: (event as any).minute ?? 0,
        metadata: {
          player_name: (event as any).playerName ?? null,
          original_type: event.type,
          h_score: event.hScore,
          a_score: event.aScore,
        },
      });
      syncedEvents.add(event.id);

      if (['goal', 'save', 'miss'].includes(event.type as string)) {
        await supabase.from('shots').upsert({
          id: `shot-${event.id}`,
          user_id: userId,
          match_id: matchId,
          team_id: teamId,
          outcome:
            event.type === 'goal' ? 'goal' : event.type === 'save' ? 'saved' : 'missed',
          match_minute: (event as any).minute ?? 0,
        });
      }
    } catch (e) {
      console.warn('[sync] Error event:', e);
    }
  }
}

// ============================================================================
// HELPERS
// ============================================================================
async function findOrCreateTeam(
  name: string,
  color: string | undefined,
  userId: string,
): Promise<string | null> {
  try {
    const { data: existing } = await supabase
      .from('teams')
      .select('id')
      .eq('user_id', userId)
      .eq('name', name)
      .maybeSingle();

    if (existing) return existing.id;

    const { data: created, error } = await supabase
      .from('teams')
      .insert({
        user_id: userId,
        name,
        color_primary: color ?? '#3B82F6',
      })
      .select('id')
      .single();

    if (error) throw error;
    return created.id;
  } catch (e) {
    console.warn('[sync] Error findOrCreateTeam:', e);
    return null;
  }
}

function parseDate(dateStr: string | null | undefined): string {
  if (!dateStr) return new Date().toISOString();
  const m = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (m) {
    const year = new Date().getFullYear();
    return new Date(year, parseInt(m[2]) - 1, parseInt(m[1])).toISOString();
  }
  return new Date(dateStr).toISOString();
}

function mapEventType(type: string): string {
  const map: Record<string, string> = {
    goal: 'goal',
    save: 'save',
    miss: 'miss',
    turnover: 'turnover',
    yellow: 'yellow_card',
    red: 'red_card',
    twomin: 'two_minutes',
    timeout: 'timeout',
    halfStart: 'half_start',
    halfEnd: 'half_end',
  };
  return map[type] ?? type;
}

// ============================================================================
// MAIN SYNC
// ============================================================================
async function syncAll() {
  if (!currentUserId) return;

  const state = useMatchStore.getState();

  for (const team of state.teams) {
    await syncTeam(team, currentUserId);
  }

  for (const match of state.completed) {
    await syncMatch(match, currentUserId);
  }

  if (state.status === 'live' && state.liveMatch.id) {
    const homeTeamId = await findOrCreateTeam(
      state.liveMatch.home,
      state.liveMatch.homeColor,
      currentUserId,
    );
    const awayTeamId = await findOrCreateTeam(
      state.liveMatch.away,
      state.liveMatch.awayColor,
      currentUserId,
    );

    if (homeTeamId && awayTeamId) {
      try {
        await supabase.from('matches').upsert({
          id: state.liveMatch.id,
          user_id: currentUserId,
          home_team_id: homeTeamId,
          away_team_id: awayTeamId,
          match_date: parseDate(state.liveMatch.date),
          competition: String(state.liveMatch.competition ?? ''),
          status: 'live',
          home_score: 0,
          away_score: 0,
        });

        if (state.liveEvents.length > 0) {
          await syncEvents(
            state.liveEvents,
            state.liveMatch.id,
            homeTeamId,
            awayTeamId,
            currentUserId,
          );
        }
      } catch (e) {
        console.warn('[sync] Error live match:', e);
      }
    }
  }
}

// ============================================================================
// INIT
// ============================================================================
export async function initSupabaseSync() {
  if (isInitialized) return;
  isInitialized = true;

  console.log('[sync] Inicializando Supabase sync...');

  const userId = await ensureUser();
  if (!userId) {
    console.warn('[sync] No hay user, sync deshabilitado');
    return;
  }

  console.log('[sync] User ID:', userId);

  await syncAll();

  let syncTimeout: ReturnType<typeof setTimeout> | null = null;

  unsubscribeStore = useMatchStore.subscribe(() => {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      syncAll().catch((e) => console.warn('[sync] Error:', e));
    }, 2000);
  });

  console.log('[sync] Sync activado');
}

// ============================================================================
// CLEANUP
// ============================================================================
export function stopSupabaseSync() {
  if (unsubscribeStore) {
    unsubscribeStore();
    unsubscribeStore = null;
  }
  isInitialized = false;
}

export async function forceSyncNow() {
  if (!currentUserId) {
    await ensureUser();
  }
  await syncAll();
}
