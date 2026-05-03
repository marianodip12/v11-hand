-- ============================================================================
-- HANDBALL PRO v11 - SCHEMA FINAL
-- Alineado con el dominio de la app (DbEventRow / DbMatchRow en src/domain/events.ts)
--
-- COMO USAR:
--   1. Abrir https://supabase.com/dashboard/project/emmqrzqxlkqvsqbihwdt/sql
--   2. New query
--   3. Copiar y pegar TODO este archivo
--   4. Click "Run" (Ctrl+Enter)
-- ============================================================================

-- ============================================================================
-- LIMPIEZA (por si ya hay tablas viejas)
-- ============================================================================
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS shots CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS seasons CASCADE;
DROP TABLE IF EXISTS rival_players CASCADE;
DROP TABLE IF EXISTS rival_teams CASCADE;
DROP TABLE IF EXISTS outreach_clubs CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- ============================================================================
-- PROFILES
-- ============================================================================
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TEAMS (equipos del usuario)
-- ============================================================================
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    local_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teams_user ON teams(user_id);
CREATE INDEX idx_teams_local ON teams(user_id, local_id);

-- ============================================================================
-- PLAYERS (jugadores de cada team)
-- ============================================================================
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    number INT NOT NULL,
    position TEXT,
    local_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_players_team ON players(team_id);

-- ============================================================================
-- MATCHES (partidos finalizados o en vivo)
-- ============================================================================
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Datos básicos del partido (denormalizados como en la app)
    home_name TEXT NOT NULL,
    away_name TEXT NOT NULL,
    home_score INT DEFAULT 0,
    away_score INT DEFAULT 0,
    home_color TEXT DEFAULT '#3B82F6',
    away_color TEXT DEFAULT '#64748B',
    match_date TEXT,
    competition TEXT,
    status TEXT DEFAULT 'finished',

    -- ID local del store (para evitar duplicados al sync)
    local_id TEXT,

    -- COMPARTIR
    is_public BOOLEAN DEFAULT false,
    share_token TEXT UNIQUE,
    shared_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_matches_user ON matches(user_id);
CREATE INDEX idx_matches_local ON matches(user_id, local_id);
CREATE INDEX idx_matches_share ON matches(share_token) WHERE share_token IS NOT NULL;

-- ============================================================================
-- EVENTS (cada evento de cada partido - todos los detalles)
-- ============================================================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    -- Tiempo del partido
    minute INT NOT NULL DEFAULT 0,

    -- Identificación
    team TEXT NOT NULL CHECK (team IN ('home', 'away')),
    type TEXT NOT NULL CHECK (type IN (
        'goal', 'miss', 'saved', 'post', 'turnover',
        'timeout', 'exclusion', 'red_card', 'blue_card',
        'yellow_card', 'half_time'
    )),

    -- Espacial
    zone TEXT,
    quadrant INT,
    goal_section TEXT,

    -- Contexto
    situation TEXT,
    throw_type TEXT,

    -- Personas (denormalizadas)
    shooter_name TEXT,
    shooter_number INT,
    goalkeeper_name TEXT,
    goalkeeper_number INT,
    sanctioned_name TEXT,
    sanctioned_number INT,

    -- Score snapshot
    h_score INT DEFAULT 0,
    a_score INT DEFAULT 0,

    -- Flags
    completed BOOLEAN DEFAULT true,
    quick_mode BOOLEAN DEFAULT false,

    -- ID local
    local_id TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_events_match ON events(match_id);
CREATE INDEX idx_events_user ON events(user_id);
CREATE INDEX idx_events_local ON events(user_id, local_id);

-- ============================================================================
-- TRIGGER: actualizar updated_at automáticamente
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TRIGGER: crear profile automáticamente al registrarse (incluye anónimos)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(split_part(NEW.email, '@', 1), 'Anonymous')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Profiles: el usuario solo ve su perfil
CREATE POLICY "users_own_profile" ON profiles FOR ALL USING (auth.uid() = id);

-- Teams: el dueño puede hacer todo
CREATE POLICY "owner_all_teams" ON teams FOR ALL USING (auth.uid() = user_id);

-- Players: el dueño puede hacer todo
CREATE POLICY "owner_all_players" ON players FOR ALL USING (auth.uid() = user_id);

-- Matches: el dueño puede hacer todo
CREATE POLICY "owner_all_matches" ON matches FOR ALL USING (auth.uid() = user_id);

-- ⭐ Cualquiera puede LEER matches públicos (para compartir)
CREATE POLICY "public_read_shared_matches" ON matches FOR SELECT
  USING (is_public = true AND share_token IS NOT NULL);

-- Events: el dueño puede hacer todo
CREATE POLICY "owner_all_events" ON events FOR ALL USING (auth.uid() = user_id);

-- ⭐ Cualquiera puede LEER events de matches públicos
CREATE POLICY "public_read_events_of_shared" ON events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = events.match_id
        AND m.is_public = true
        AND m.share_token IS NOT NULL
    )
  );

-- ============================================================================
-- LISTO
-- ============================================================================
-- Para verificar que todo se creó:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
