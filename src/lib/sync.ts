/**
 * SUPABASE SYNC v4 - TypeScript fixes
 */

import { supabase, getCurrentUser } from './supabase';
import { useMatchStore } from './store';
import type { HandballEvent, HandballTeam, MatchSummary, Player } from '@/domain/types';

let isInitialized = false;
let currentUserId: string | null = null;
let unsubscribeStore: (() => void) | null = null;

const teamIdMap = new Map<string, string>();
const playerIdMap = new Map<string, string>();
const matchIdMap = new Map<string, string>();
const syncedEvents = new Set<string>();

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

async function syncTeam(team: HandballTeam, userId: string): Promise<string | null> {
  if (teamIdMap.has(team.id)) {
    return teamIdMap.get(team.id)!;
  }

  try {
    const { data: existing } = await supabase
      .from('teams')
      .select('id')
      .eq('user_id', userId)
      .eq('name', team.name)
      .maybeSingle();

    let teamId: string;

    if (existing) {
      teamId = existing.id;
    } else {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          user_id: userId,
          name: team.name,
          short_name: (team as any).shortName ?? null,
          color_primary: (team as any).color ?? '#3B82F6',
        })
        .select('id')
        .single();

      if (error) {
        console.warn('[sync] Error creando team:', error.message);
        return null;
      }
      teamId = data.id;
    }

    teamIdMap.set(team.id, teamId);

    for (const player of team.players ?? []) {
      await syncPlayer(player, teamId, userId);
    }

    return teamId;
  } catch (e) {
    console.warn('[sync] Error team:', e);
    return null;
  }
}

async function syncPlayer(player: Player, teamId: string, userId: string): Promise<string | null> {
  if (playerIdMap.has(player.id)) {
    return playerIdMap.get(player.id)!;
  }

  try {
    const { data: existing } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .eq('name', player.name)
      .maybeSingle();

    let playerId: string;

    if (existing) {
      playerId = existing.id;
    } else {
      const { data, error } = await supabase
        .from('players')
        .insert({
          user_id: userId,
          team_id: teamId,
          name: player.name,
          number: (player as any).number ?? null,
          position: (player as any).position ?? null,
          is_goalkeeper: (player as any).position === 'GK',
        })
        .select('id')
        .single();

      if (error) {
        console.warn('[sync] Error creando player:', error.message);
        return null;
      }
      playerId = data.id;
    }

    playerIdMap.set(player.id, playerId);
    return playerId;
  } catch (e) {
    console.warn('[sync] Error player:', e);
    return null;
  }
}

async function findOrCreateTeamByName(
  name: string,
  color: string | undefined,
  userId: string,
): Promise<string | null> {
  if (!name) return null;

  try {
    const { data: existing } = await supabase
      .from('teams')
      .select('id')
      .eq('user_id', userId)
      .eq('name', name)
      .maybeSingle();

    if (existing) return existing.id;

    const { data, error } = await supabase
      .from('teams')
      .insert({
        user_id: userId,
        name,
        color_primary: color ?? '#3B82F6',
      })
      .select('id')
      .single();

    if (error) {
      console.warn('[sync] Error findOrCreate:', error.message);
      return null;
    }
    return data.id;
  } catch (e) {
    console.warn('[sync] Error findOrCreate:', e);
    return null;
  }
}

async function syncMatch(match: MatchSummary, userId: string) {
  if (matchIdMap.has(match.id)) return;

  try {
    const homeTeamId = await findOrCreateTeamByName(match.home, match.homeColor, userId);
    const awayTeamId = await findOrCreateTeamByName(match.away, match.awayColor, userId);

    if (!homeTeamId || !awayTeamId) return;

    const { data, error } = await supabase
      .from('matches')
      .insert({
        user_id: userId,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        match_date: parseDate(match.date),
        competition: match.competition ?? null,
        home_score: match.hs,
        away_score: match.as,
        status: 'finished',
      })
      .select('id')
      .single();

    if (error) {
      console.warn('[sync] Error match:', error.message);
      return;
    }

    matchIdMap.set(match.id, data.id);

    if (match.events && match.events.length > 0) {
      await syncEvents(match.events, data.id, homeTeamId, awayTeamId, userId);
    }
  } catch (e) {
    console.warn('[sync] Error match:', e);
  }
}

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
      const eventType = String(event.type);

      const { error } = await supabase.from('events').insert({
        user_id: userId,
        match_id: matchId,
        team_id: teamId,
        event_type: mapEventType(eventType),
        match_minute: (event as any).minute ?? 0,
        metadata: {
          player_name: (event as any).playerName ?? null,
          original_type: eventType,
          local_id: event.id,
        },
      });

      if (!error) {
        syncedEvents.add(event.id);
      }

      const shotOutcome = mapShotOutcome(eventType);
      if (shotOutcome) {
        await supabase.from('shots').insert({
          user_id: userId,
          match_id: matchId,
          team_id: teamId,
          outcome: shotOutcome,
          match_minute: (event as any).minute ?? 0,
        });
      }
    } catch (e) {
      console.warn('[sync] Error event:', e);
    }
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
    saved: 'save',
    save: 'save',
    miss: 'miss',
    post: 'miss',
    turnover: 'turnover',
    yellow_card: 'yellow_card',
    yellow: 'yellow_card',
    red_card: 'red_card',
    red: 'red_card',
    blue_card: 'blue_card',
    exclusion: 'two_minutes',
    twomin: 'two_minutes',
    timeout: 'timeout',
    half_time: 'half_end',
    halfStart: 'half_start',
    halfEnd: 'half_end',
  };
  return map[type] ?? type;
}

function mapShotOutcome(type: string): string | null {
  const map: Record<string, string> = {
    goal: 'goal',
    saved: 'saved',
    save: 'saved',
    miss: 'missed',
    post: 'post',
  };
  return map[type] ?? null;
}

async function syncAll() {
  if (!currentUserId) return;

  const state = useMatchStore.getState();

  for (const team of state.teams) {
    await syncTeam(team, currentUserId);
  }

  for (const match of state.completed) {
    await syncMatch(match, currentUserId);
  }

  if (state.status === 'live' && state.liveMatch.id && state.liveMatch.home && state.liveMatch.away) {
    const homeTeamId = await findOrCreateTeamByName(
      state.liveMatch.home,
      state.liveMatch.homeColor,
      currentUserId,
    );
    const awayTeamId = await findOrCreateTeamByName(
      state.liveMatch.away,
      state.liveMatch.awayColor,
      currentUserId,
    );

    if (homeTeamId && awayTeamId) {
      try {
        let supabaseMatchId = matchIdMap.get(state.liveMatch.id);

        if (!supabaseMatchId) {
          const { data, error } = await supabase
            .from('matches')
            .insert({
              user_id: currentUserId,
              home_team_id: homeTeamId,
              away_team_id: awayTeamId,
              match_date: parseDate(state.liveMatch.date),
              competition: String(state.liveMatch.competition ?? ''),
              status: 'live',
              home_score: 0,
              away_score: 0,
            })
            .select('id')
            .single();

          if (error) {
            console.warn('[sync] Error live match:', error.message);
            return;
          }
          supabaseMatchId = data.id;
          matchIdMap.set(state.liveMatch.id, supabaseMatchId);
        }

        if (state.liveEvents.length > 0) {
          await syncEvents(
            state.liveEvents,
            supabaseMatchId,
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
