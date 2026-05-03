/**
 * SYNC - Sincronización Zustand → Supabase
 *
 * Estrategia:
 *   - Auth anónima automática al iniciar.
 *   - Cuando el store cambia, se hace upsert en Supabase con el `local_id`
 *     como índice único por usuario, así no se crean duplicados.
 *   - Al iniciar también se descargan los partidos del servidor (merge).
 *
 * No rompe el localStorage existente: la app sigue funcionando sin internet.
 */

import { ensureAnonSession, isSupabaseReady, supabase } from './supabase';
import { useMatchStore } from './store';
import type { HandballEvent, HandballTeam, MatchSummary, Player } from '@/domain/types';

// ============================================================================
// STATE
// ============================================================================
let initialized = false;
let userId: string | null = null;
let unsubscribeStore: (() => void) | null = null;

// Cache de IDs ya sincronizados (local_id → supabase UUID) para evitar duplicar
const teamCache = new Map<string, string>();
const playerCache = new Map<string, string>();
const matchCache = new Map<string, string>();
const eventCache = new Set<string>();

// ============================================================================
// TEAMS
// ============================================================================
async function syncTeam(team: HandballTeam, uid: string): Promise<string | null> {
  if (teamCache.has(team.id)) return teamCache.get(team.id) ?? null;

  try {
    // Buscar por local_id
    const { data: existing } = await supabase
      .from('teams')
      .select('id')
      .eq('user_id', uid)
      .eq('local_id', team.id)
      .maybeSingle();

    let dbId: string;
    if (existing?.id) {
      dbId = existing.id;
      // Actualizar nombre/color por si cambió
      await supabase
        .from('teams')
        .update({ name: team.name, color: team.color })
        .eq('id', dbId);
    } else {
      const { data, error } = await supabase
        .from('teams')
        .insert({
          user_id: uid,
          name: team.name,
          color: team.color,
          local_id: team.id,
        })
        .select('id')
        .single();

      if (error || !data) {
        console.warn('[sync] team error:', error?.message);
        return null;
      }
      dbId = data.id;
    }

    teamCache.set(team.id, dbId);

    // Sync players de este team
    for (const player of team.players ?? []) {
      await syncPlayer(player, dbId, uid);
    }

    return dbId;
  } catch (e) {
    console.warn('[sync] team:', e);
    return null;
  }
}

async function syncPlayer(player: Player, teamDbId: string, uid: string): Promise<string | null> {
  if (playerCache.has(player.id)) return playerCache.get(player.id) ?? null;

  try {
    const { data: existing } = await supabase
      .from('players')
      .select('id')
      .eq('user_id', uid)
      .eq('local_id', player.id)
      .maybeSingle();

    let dbId: string;
    if (existing?.id) {
      dbId = existing.id;
      await supabase
        .from('players')
        .update({
          name: player.name,
          number: player.number,
          position: player.position,
          team_id: teamDbId,
        })
        .eq('id', dbId);
    } else {
      const { data, error } = await supabase
        .from('players')
        .insert({
          user_id: uid,
          team_id: teamDbId,
          name: player.name,
          number: player.number,
          position: player.position,
          local_id: player.id,
        })
        .select('id')
        .single();

      if (error || !data) {
        console.warn('[sync] player error:', error?.message);
        return null;
      }
      dbId = data.id;
    }

    playerCache.set(player.id, dbId);
    return dbId;
  } catch (e) {
    console.warn('[sync] player:', e);
    return null;
  }
}

// ============================================================================
// MATCHES + EVENTS
// ============================================================================
async function syncMatch(match: MatchSummary, uid: string): Promise<string | null> {
  if (matchCache.has(match.id)) {
    const dbId = matchCache.get(match.id);
    if (dbId) {
      await syncEventsFor(match.events, dbId, uid);
      return dbId;
    }
  }

  try {
    const { data: existing } = await supabase
      .from('matches')
      .select('id')
      .eq('user_id', uid)
      .eq('local_id', match.id)
      .maybeSingle();

    let dbId: string;
    if (existing?.id) {
      dbId = existing.id;
      await supabase
        .from('matches')
        .update({
          home_name: match.home,
          away_name: match.away,
          home_score: match.hs,
          away_score: match.as,
          home_color: match.homeColor,
          away_color: match.awayColor,
          match_date: match.date,
          competition: match.competition,
          status: 'finished',
        })
        .eq('id', dbId);
    } else {
      const { data, error } = await supabase
        .from('matches')
        .insert({
          user_id: uid,
          local_id: match.id,
          home_name: match.home,
          away_name: match.away,
          home_score: match.hs,
          away_score: match.as,
          home_color: match.homeColor,
          away_color: match.awayColor,
          match_date: match.date,
          competition: match.competition,
          status: 'finished',
        })
        .select('id')
        .single();

      if (error || !data) {
        console.warn('[sync] match error:', error?.message);
        return null;
      }
      dbId = data.id;
    }

    matchCache.set(match.id, dbId);
    await syncEventsFor(match.events, dbId, uid);
    return dbId;
  } catch (e) {
    console.warn('[sync] match:', e);
    return null;
  }
}

async function syncEventsFor(events: HandballEvent[], matchDbId: string, uid: string) {
  for (const ev of events) {
    if (eventCache.has(ev.id)) continue;

    try {
      const { data: existing } = await supabase
        .from('events')
        .select('id')
        .eq('user_id', uid)
        .eq('local_id', ev.id)
        .maybeSingle();

      if (existing?.id) {
        eventCache.add(ev.id);
        continue;
      }

      const { error } = await supabase.from('events').insert({
        user_id: uid,
        match_id: matchDbId,
        local_id: ev.id,
        minute: ev.min,
        team: ev.team,
        type: ev.type,
        zone: ev.zone ?? null,
        goal_section: ev.goalZone ?? null,
        situation: ev.situation ?? null,
        throw_type: ev.throwType ?? null,
        shooter_name: ev.shooter?.name ?? null,
        shooter_number: ev.shooter?.number ?? null,
        goalkeeper_name: ev.goalkeeper?.name ?? null,
        goalkeeper_number: ev.goalkeeper?.number ?? null,
        sanctioned_name: ev.sanctioned?.name ?? null,
        sanctioned_number: ev.sanctioned?.number ?? null,
        h_score: ev.hScore,
        a_score: ev.aScore,
        completed: ev.completed,
        quick_mode: ev.quickMode,
      });

      if (!error) eventCache.add(ev.id);
    } catch (e) {
      console.warn('[sync] event:', e);
    }
  }
}

// ============================================================================
// LIVE MATCH (sincroniza también el partido en curso)
// ============================================================================
async function syncLiveMatch(uid: string): Promise<void> {
  const state = useMatchStore.getState();
  if (state.status !== 'live') return;
  if (!state.liveMatch.id) return;
  if (!state.liveMatch.home || !state.liveMatch.away) return;

  // Tipos seguros (TypeScript-friendly)
  const liveId: string = state.liveMatch.id;
  const homeName: string = state.liveMatch.home;
  const awayName: string = state.liveMatch.away;
  const homeColor: string = state.liveMatch.homeColor;
  const awayColor: string = state.liveMatch.awayColor;
  const matchDate: string | null = state.liveMatch.date;
  const competition: string = String(state.liveMatch.competition ?? '');

  try {
    const cached = matchCache.get(liveId);
    let dbId: string;

    if (cached) {
      dbId = cached;
    } else {
      const { data: existing } = await supabase
        .from('matches')
        .select('id')
        .eq('user_id', uid)
        .eq('local_id', liveId)
        .maybeSingle();

      if (existing?.id) {
        dbId = existing.id;
      } else {
        const { data, error } = await supabase
          .from('matches')
          .insert({
            user_id: uid,
            local_id: liveId,
            home_name: homeName,
            away_name: awayName,
            home_score: 0,
            away_score: 0,
            home_color: homeColor,
            away_color: awayColor,
            match_date: matchDate,
            competition: competition,
            status: 'live',
          })
          .select('id')
          .single();

        if (error || !data) {
          console.warn('[sync] live match error:', error?.message);
          return;
        }
        dbId = data.id;
      }
      matchCache.set(liveId, dbId);
    }

    // Actualizar score en vivo
    const { h, a } = computeRunningScore(state.liveEvents);
    await supabase
      .from('matches')
      .update({ home_score: h, away_score: a, status: 'live' })
      .eq('id', dbId);

    // Sync de eventos del partido en curso
    await syncEventsFor(state.liveEvents, dbId, uid);
  } catch (e) {
    console.warn('[sync] live:', e);
  }
}

function computeRunningScore(events: HandballEvent[]): { h: number; a: number } {
  let h = 0, a = 0;
  for (const e of events) {
    if (e.type === 'goal') {
      if (e.team === 'home') h++; else a++;
    }
  }
  return { h, a };
}

// ============================================================================
// SYNC ALL (todo el store)
// ============================================================================
async function syncAll() {
  if (!userId) return;

  const state = useMatchStore.getState();

  // Teams + players
  for (const team of state.teams) {
    await syncTeam(team, userId);
  }

  // Completed matches + their events
  for (const match of state.completed) {
    await syncMatch(match, userId);
  }

  // Live match
  await syncLiveMatch(userId);
}

// ============================================================================
// DOWNLOAD - Bajar del servidor para la primera vez
// ============================================================================
async function downloadFromServer(uid: string): Promise<void> {
  try {
    // Bajar matches
    const { data: serverMatches } = await supabase
      .from('matches')
      .select('*, events(*)')
      .eq('user_id', uid)
      .eq('status', 'finished')
      .order('created_at', { ascending: false });

    if (!serverMatches?.length) return;

    const local = useMatchStore.getState();
    const localIds = new Set(local.completed.map((m) => m.id));
    const newOnes: MatchSummary[] = [];

    for (const m of serverMatches) {
      const localId: string = m.local_id ?? m.id;
      if (localIds.has(localId)) {
        matchCache.set(localId, m.id);
        for (const ev of m.events ?? []) {
          if (ev.local_id) eventCache.add(ev.local_id);
        }
        continue;
      }

      const events: HandballEvent[] = (m.events ?? []).map((e: any): HandballEvent => ({
        id: e.local_id ?? e.id,
        min: e.minute ?? 0,
        team: e.team,
        type: e.type,
        zone: e.zone ?? null,
        goalZone: e.goal_section ?? null,
        situation: e.situation ?? null,
        throwType: e.throw_type ?? null,
        shooter: e.shooter_name ? { name: e.shooter_name, number: e.shooter_number ?? 0 } : null,
        goalkeeper: e.goalkeeper_name ? { name: e.goalkeeper_name, number: e.goalkeeper_number ?? 0 } : null,
        sanctioned: e.sanctioned_name ? { name: e.sanctioned_name, number: e.sanctioned_number ?? 0 } : null,
        hScore: e.h_score ?? 0,
        aScore: e.a_score ?? 0,
        quickMode: e.quick_mode ?? false,
        completed: e.completed ?? true,
      }));

      newOnes.push({
        id: localId,
        home: m.home_name,
        away: m.away_name,
        hs: m.home_score ?? 0,
        as: m.away_score ?? 0,
        date: m.match_date ?? null,
        competition: m.competition ?? null,
        homeColor: m.home_color ?? '#3B82F6',
        awayColor: m.away_color ?? '#64748B',
        events,
      });

      matchCache.set(localId, m.id);
      for (const ev of m.events ?? []) {
        if (ev.local_id) eventCache.add(ev.local_id);
      }
    }

    if (newOnes.length > 0) {
      console.log(`[sync] descargados ${newOnes.length} partidos del servidor`);
      useMatchStore.setState({
        completed: [...newOnes, ...local.completed],
      });
    }
  } catch (e) {
    console.warn('[sync] download:', e);
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================
export async function initSync(): Promise<void> {
  if (initialized) return;
  initialized = true;

  if (!isSupabaseReady()) {
    console.warn('[sync] supabase no configurado, sync deshabilitado');
    return;
  }

  console.log('[sync] inicializando...');

  const uid = await ensureAnonSession();
  if (!uid) {
    console.warn('[sync] no hay user, sync deshabilitado');
    return;
  }
  userId = uid;
  console.log('[sync] user:', uid);

  // Bajar del servidor primero
  await downloadFromServer(uid);

  // Sync inicial
  await syncAll();

  // Subscribirse a cambios del store con debounce
  let timer: ReturnType<typeof setTimeout> | null = null;
  unsubscribeStore = useMatchStore.subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      syncAll().catch((e) => console.warn('[sync] err:', e));
    }, 1500);
  });

  console.log('[sync] activado ✓');
}

export function stopSync(): void {
  if (unsubscribeStore) {
    unsubscribeStore();
    unsubscribeStore = null;
  }
  initialized = false;
}

/**
 * Devuelve el UUID de Supabase de un match local, o null si no se sincronizó.
 */
export function getServerMatchId(localId: string): string | null {
  return matchCache.get(localId) ?? null;
}

export function getCurrentUserId(): string | null {
  return userId;
}

export async function forceSyncNow(): Promise<void> {
  if (!userId) {
    userId = await ensureAnonSession();
  }
  await syncAll();
}
