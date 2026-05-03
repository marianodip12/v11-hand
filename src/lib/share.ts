/**
 * SHARE - Compartir partidos públicamente
 *
 * Genera un share_token único y marca el match como is_public=true.
 * La política RLS de Supabase permite leer matches con is_public=true sin auth.
 */

import { ensureAnonSession, supabase } from './supabase';
import { getServerMatchId, forceSyncNow } from './sync';
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

export async function shareMatch(localMatchId: string): Promise<ShareResult> {
  const uid = await ensureAnonSession();
  if (!uid) throw new Error('No se pudo iniciar sesión para compartir.');

  // Asegurarse de que el match esté en Supabase
  await forceSyncNow();

  let dbId = getServerMatchId(localMatchId);
  if (!dbId) {
    // Reintentar tras un pequeño delay
    await new Promise((r) => setTimeout(r, 1500));
    await forceSyncNow();
    dbId = getServerMatchId(localMatchId);
  }

  if (!dbId) {
    throw new Error('El partido todavía no se sincronizó con el servidor. Probá de nuevo en unos segundos.');
  }

  // Verificar si ya tiene un share_token
  const { data: existing } = await supabase
    .from('matches')
    .select('share_token')
    .eq('id', dbId)
    .maybeSingle();

  let token: string;
  if (existing?.share_token) {
    token = existing.share_token;
  } else {
    token = generateToken();
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
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*, events(*)')
      .eq('share_token', token)
      .eq('is_public', true)
      .maybeSingle();

    if (error || !data) {
      console.warn('[share] no se pudo cargar:', error?.message);
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
    console.warn('[share] error:', e);
    return null;
  }
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
