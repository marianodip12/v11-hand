/**
 * SHARE - Compartir partidos públicamente
 *
 * Genera un share_token único y marca el match como is_public=true.
 * La política RLS de Supabase permite leer matches con is_public=true sin auth.
 */

import { ensureAnonSession, supabase } from './supabase';
import { getServerMatchId, forceSyncNow } from './sync';
import { useMatchStore } from './store';
import type { HandballEvent, MatchSummary } from '@/domain/types';

// ============================================================================
// Generar token único
// ============================================================================
function generateToken(): string {
  // 12 caracteres alfanuméricos, suficiente para uniqueness
  const chars = 'abcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 12; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

// ============================================================================
// CREAR SHARE LINK
// ============================================================================
export interface ShareResult {
  token: string;
  url: string;
}

/**
 * Estrategia robusta de 3 niveles:
 *  1. Cache del sync (rápido, normalmente está)
 *  2. Query directa a Supabase por local_id (por si el cache no lo tiene)
 *  3. Crear el match en Supabase desde el store local (último recurso)
 */
async function resolveDbMatchId(localMatchId: string, uid: string): Promise<string | null> {
  // Nivel 1: cache
  let dbId = getServerMatchId(localMatchId);
  if (dbId) return dbId;

  // Forzar sync (ahora, sin esperar el debounce)
  try {
    await forceSyncNow();
  } catch {
    // ignoramos, intentamos seguir
  }
  dbId = getServerMatchId(localMatchId);
  if (dbId) return dbId;

  // Nivel 2: buscar directo en Supabase por local_id
  try {
    const { data } = await supabase
      .from('matches')
      .select('id')
      .eq('user_id', uid)
      .eq('local_id', localMatchId)
      .maybeSingle();
    if (data?.id) return data.id;
  } catch {
    // continuamos al nivel 3
  }

  // Nivel 3: insertar desde el store local
  const state = useMatchStore.getState();
  const localMatch = state.completed.find((m) => m.id === localMatchId);
  if (!localMatch) return null;

  try {
    const { data, error } = await supabase
      .from('matches')
      .insert({
        user_id: uid,
        local_id: localMatch.id,
        home_name: localMatch.home,
        away_name: localMatch.away,
        home_score: localMatch.hs,
        away_score: localMatch.as,
        home_color: localMatch.homeColor,
        away_color: localMatch.awayColor,
        match_date: localMatch.date,
        competition: localMatch.competition,
        status: 'finished',
      })
      .select('id')
      .single();

    if (error || !data) return null;

    // Insertar también los eventos (mejor esfuerzo, no bloqueamos si falla)
    if (localMatch.events?.length) {
      try {
        const eventsRows = localMatch.events.map((ev) => ({
          user_id: uid,
          match_id: data.id,
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
        }));
        await supabase.from('events').insert(eventsRows);
      } catch (e) {
        console.warn('[share] no se pudieron subir todos los eventos:', e);
      }
    }

    return data.id;
  } catch (e) {
    console.warn('[share] no se pudo crear el match en Supabase:', e);
    return null;
  }
}

export async function shareMatch(localMatchId: string): Promise<ShareResult> {
  const uid = await ensureAnonSession();
  if (!uid) throw new Error('No se pudo iniciar sesión para compartir.');

  const dbId = await resolveDbMatchId(localMatchId, uid);
  if (!dbId) {
    throw new Error('No se pudo sincronizar el partido. Verificá tu conexión y volvé a intentar.');
  }

  // Verificar si ya tiene un share_token
  const { data: existing } = await supabase
    .from('matches')
    .select('share_token, is_public')
    .eq('id', dbId)
    .maybeSingle();

  let token: string;
  if (existing?.share_token && existing?.is_public) {
    token = existing.share_token;
  } else {
    token = existing?.share_token ?? generateToken();
    const { error } = await supabase
      .from('matches')
      .update({
        is_public: true,
        share_token: token,
        shared_at: new Date().toISOString(),
      })
      .eq('id', dbId);

    if (error) {
      throw new Error(`No se pudo compartir: ${error.message}`);
    }
  }

  // Asegurar que los events también estén subidos (importante para el share_page)
  // Hacemos un re-sync no-bloqueante
  forceSyncNow().catch(() => {});

  const url = `${window.location.origin}/share/${token}`;
  return { token, url };
}

// ============================================================================
// REVOCAR SHARE LINK
// ============================================================================
export async function unshareMatch(localMatchId: string): Promise<void> {
  const dbId = getServerMatchId(localMatchId);
  if (!dbId) return;

  await supabase
    .from('matches')
    .update({ is_public: false, share_token: null })
    .eq('id', dbId);
}

// ============================================================================
// CARGAR MATCH PÚBLICO POR TOKEN (para la página /share/:token)
// ============================================================================
export interface SharedMatchData {
  match: MatchSummary;
}

export async function loadSharedMatch(token: string): Promise<SharedMatchData | null> {
  // Hacemos hasta 3 intentos con backoff por si hay race condition con la subida de events
  const delays = [0, 700, 1500];

  for (let attempt = 0; attempt < delays.length; attempt++) {
    if (delays[attempt] > 0) {
      await new Promise((r) => setTimeout(r, delays[attempt]));
    }

    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*, events(*)')
        .eq('share_token', token)
        .eq('is_public', true)
        .maybeSingle();

      if (error) {
        console.warn(`[share] intento ${attempt + 1} error:`, error.message);
        continue;
      }
      if (!data) {
        // El partido no existe o no es público; no tiene sentido reintentar.
        if (attempt === 0) console.warn('[share] match no encontrado para token', token);
        return null;
      }

      const events: HandballEvent[] = ((data.events as any[]) ?? []).map((e: any): HandballEvent => ({
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
      })).sort((a, b) => a.min - b.min);

      const match: MatchSummary = {
        id: data.local_id ?? data.id,
        home: data.home_name,
        away: data.away_name,
        hs: data.home_score ?? 0,
        as: data.away_score ?? 0,
        date: data.match_date ?? null,
        competition: data.competition ?? null,
        homeColor: data.home_color ?? '#3B82F6',
        awayColor: data.away_color ?? '#64748B',
        events,
      };

      return { match };
    } catch (e) {
      console.warn(`[share] intento ${attempt + 1} excepción:`, e);
    }
  }

  return null;
}

// ============================================================================
// CHECK STATUS (saber si ya está compartido)
// ============================================================================
export async function getShareStatus(localMatchId: string): Promise<{ shared: boolean; url?: string; token?: string }> {
  const dbId = getServerMatchId(localMatchId);
  if (!dbId) return { shared: false };

  try {
    const { data } = await supabase
      .from('matches')
      .select('share_token, is_public')
      .eq('id', dbId)
      .maybeSingle();

    if (data?.is_public && data.share_token) {
      return {
        shared: true,
        token: data.share_token,
        url: `${window.location.origin}/share/${data.share_token}`,
      };
    }
    return { shared: false };
  } catch {
    return { shared: false };
  }
}
