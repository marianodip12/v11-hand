import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

if (!url || !anon) {
  console.warn(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Set them in .env.local to enable remote persistence.',
  );
}

// ============================================================================
// SUPABASE CLIENT
// ============================================================================
export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ============================================================================
// AUTH HELPERS
// ============================================================================
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) return null;
  return user;
}

export async function signInWithMagicLink(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ============================================================================
// SEASONS REPO
// ============================================================================
export const seasonsRepo = {
  async getAll() {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async create(season: { name: string; user_id: string; start_date?: string; end_date?: string }) {
    const { data, error } = await supabase.from('seasons').insert(season).select().single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Record<string, any>) {
    const { data, error } = await supabase
      .from('seasons')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase.from('seasons').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================================================
// TEAMS REPO
// ============================================================================
export const teamsRepo = {
  async getAll() {
    const { data, error } = await supabase
      .from('teams')
      .select('*, players(*)')
      .order('name');
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('teams')
      .select('*, players(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(team: {
    name: string;
    user_id: string;
    short_name?: string;
    color_primary?: string;
    color_secondary?: string;
    is_my_team?: boolean;
    season_id?: string;
  }) {
    const { data, error } = await supabase.from('teams').insert(team).select().single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Record<string, any>) {
    const { data, error } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================================================
// PLAYERS REPO
// ============================================================================
export const playersRepo = {
  async getByTeam(teamId: string) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId)
      .order('number');
    if (error) throw error;
    return data ?? [];
  },

  async create(player: {
    name: string;
    user_id: string;
    team_id: string;
    number?: number;
    position?: string;
    is_goalkeeper?: boolean;
  }) {
    const { data, error } = await supabase.from('players').insert(player).select().single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Record<string, any>) {
    const { data, error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================================================
// MATCHES REPO
// ============================================================================
export const matchesRepo = {
  async getAll() {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(*),
        away_team:teams!matches_away_team_id_fkey(*)
      `)
      .order('match_date', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        home_team:teams!matches_home_team_id_fkey(*, players(*)),
        away_team:teams!matches_away_team_id_fkey(*, players(*)),
        shots(*),
        events(*)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(match: {
    user_id: string;
    home_team_id: string;
    away_team_id: string;
    match_date?: string;
    venue?: string;
    competition?: string;
    duration_minutes?: number;
  }) {
    const { data, error } = await supabase.from('matches').insert(match).select().single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Record<string, any>) {
    const { data, error } = await supabase
      .from('matches')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateScore(id: string, homeScore: number, awayScore: number) {
    return this.update(id, {
      home_score: homeScore,
      away_score: awayScore,
    });
  },

  async delete(id: string) {
    const { error } = await supabase.from('matches').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================================================
// SHOTS REPO
// ============================================================================
export const shotsRepo = {
  async getByMatch(matchId: string) {
    const { data, error } = await supabase
      .from('shots')
      .select('*')
      .eq('match_id', matchId)
      .order('match_minute');
    if (error) throw error;
    return data ?? [];
  },

  async create(shot: {
    user_id: string;
    match_id: string;
    team_id: string;
    outcome: 'goal' | 'saved' | 'missed' | 'blocked' | 'post';
    match_minute: number;
    shooter_id?: string;
    goalkeeper_id?: string;
    court_x?: number;
    court_y?: number;
    goal_x?: number;
    goal_y?: number;
    shot_type?: string;
    half?: number;
  }) {
    const { data, error } = await supabase.from('shots').insert(shot).select().single();
    if (error) throw error;
    return data;
  },

  async createBatch(shots: any[]) {
    const { data, error } = await supabase.from('shots').insert(shots).select();
    if (error) throw error;
    return data ?? [];
  },

  async delete(id: string) {
    const { error } = await supabase.from('shots').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================================================
// EVENTS REPO
// ============================================================================
export const eventsRepo = {
  async getByMatch(matchId: string) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('match_id', matchId)
      .order('match_minute');
    if (error) throw error;
    return data ?? [];
  },

  async create(event: {
    user_id: string;
    match_id: string;
    event_type: string;
    match_minute: number;
    player_id?: string;
    team_id?: string;
    half?: number;
    metadata?: Record<string, any>;
  }) {
    const { data, error } = await supabase.from('events').insert(event).select().single();
    if (error) throw error;
    return data;
  },
};

// ============================================================================
// REALTIME - Para partidos en vivo
// ============================================================================
export function subscribeToMatch(matchId: string, onUpdate: (payload: any) => void) {
  return supabase
    .channel(`match:${matchId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${matchId}` },
      onUpdate,
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'shots', filter: `match_id=eq.${matchId}` },
      onUpdate,
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'events', filter: `match_id=eq.${matchId}` },
      onUpdate,
    )
    .subscribe();
}
