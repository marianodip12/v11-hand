# Handball Pro v11

App móvil-first para registrar estadísticas de handball en vivo: eventos por zona de cancha, cuadrante del arco, rendimiento de arqueros, heatmap, evolución de temporada.

Reescritura completa de la v8 aplicando:

- **Metodología Superpowers** — spec → plan → chunks testeables → review.
- **Design system UI UX Pro Max** — Soft UI Evolution + Dimensional Layering, paleta OLED para uso al costado de la cancha.
- **Stack moderno** — Vite + React 18 + TypeScript strict + Tailwind + Zustand + TanStack Query + Zod + Vitest.

## Estado actual — Milestone 1 ✅

| Capa | Estado |
| --- | --- |
| Setup del proyecto (Vite, TS strict, Tailwind, paths) | ✅ |
| Design system (tokens CSS, Inter + JetBrains Mono, paleta) | ✅ |
| Capa de dominio con tipos (`CourtZoneId`, `GoalZoneId`, `HandballEvent`…) | ✅ |
| Lógica pura: `computeScore`, `computeMatchStats`, `buildGoalkeeperMap`, `buildHeatCounts`, `buildScorers`, `buildSeasonStats` | ✅ |
| **28 tests unitarios** del dominio — todos passing | ✅ |
| UI base: Button, Card, Dialog, Badge, Input, Feedback (Spinner, EmptyState) | ✅ |
| Componentes de dominio: `CourtView` (geometría corregida), `GoalGrid` (arco con franjas) | ✅ |
| Store global (Zustand) + query client (TanStack Query) | ✅ |
| Cliente Supabase tipado (placeholder hasta que cargues las env vars) | ✅ |
| Router + shell (header + bottom nav) | ✅ |
| **Pantalla Matches completa** (season summary + live banner + history + new match modal) | ✅ |
| Seed data de ejemplo para ver la UI sin Supabase | ✅ |

Pantallas **pendientes** (siguientes milestones): Live Match, Match Analysis, Teams, Evolution, Stats.

## Quickstart

```bash
# 1. Instalar deps
npm install

# 2. (Opcional) Conectar Supabase
cp .env.example .env.local
# → pegá tu VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY

# 3. Correr en dev
npm run dev
# abre http://localhost:5173

# Otros
npm run typecheck   # verifica tipos
npm run test        # tests en watch
npm run test:run    # tests una sola vez
npm run build       # build producción
```

Sin `.env.local`, la app igual arranca pero muestra data seed local. Ideal para iterar el diseño.

## Arquitectura

```
src/
├── app/                    # Shell, router, providers
├── domain/                 # Lógica pura — sin React ni Supabase
│   ├── types.ts            # CourtZoneId, GoalZoneId, HandballEvent, MatchSummary…
│   ├── constants.ts        # COURT_ZONES, GOAL_QUADRANTS, EVENT_TYPES, NAV_ITEMS
│   ├── events.ts           # mapDbEvent, mapDbMatch, computeScore, calcNextScore
│   ├── stats.ts            # computeMatchStats, buildGoalkeeperMap, buildHeatCounts…
│   └── __tests__/          # Vitest — 28 tests
├── features/               # Feature verticals
│   ├── matches/            # ← implementada en M1
│   ├── live-match/         # (placeholder)
│   ├── match-analysis/     # (placeholder)
│   ├── teams/              # (placeholder)
│   └── evolution/          # (placeholder)
├── components/
│   ├── ui/                 # Primitives (button, card, dialog, badge, input, feedback)
│   └── handball/           # Domain-specific (court-view, goal-grid)
├── lib/                    # Infra: supabase client, zustand store, cn(), seed
└── styles/
    └── globals.css         # Design tokens + resets
```

### Principio clave

La capa de **dominio es pura** — funciones que reciben eventos y devuelven stats. No importa nada de React ni de Supabase, y **está 100% cubierta por tests**. Si rompés algo en la UI, los tests del dominio siguen pasando y te dicen dónde no rompiste.

## Geometría de la cancha

`CourtView` usa `viewBox="0 0 360 300"`. Las 9 zonas se definen con paths SVG:

| ID | Descripción | Ubicación |
| --- | --- | --- |
| `extreme_left`  | Extremo Izq. | Borde izquierdo, contra arco de 6m |
| `lateral_left`  | Lateral Izq. | **Anillo entre 6m y 9m**, izquierda |
| `center_above`  | Centro       | **Anillo entre 6m y 9m**, centro |
| `lateral_right` | Lateral Der. | **Anillo entre 6m y 9m**, derecha |
| `extreme_right` | Extremo Der. | Borde derecho, contra arco de 6m |
| `near_left`     | Cerca Izq.   | Abajo del arco de 9m, izq |
| `near_center`   | Pivote       | Abajo del arco de 9m, centro |
| `near_right`    | Cerca Der.   | Abajo del arco de 9m, der |
| `7m`            | Penal 7m     | Badge blanco centrado, también cubierto por `center_above` |

**Corrección v11**: en v8 las zonas LI/CE/LD se extendían desde la línea de 9m hasta el borde superior del SVG. En v11 están contenidas en el "anillo" real entre arcos de 6m y 9m, que es dónde físicamente se ejecutan esos lanzamientos.

## Geometría del arco

`GoalGrid` usa `viewBox="0 0 320 148"`. 9 cuadrantes (`tl`/`tc`/`tr`/`ml`/`mc`/`mr`/`bl`/`bc`/`br`) + meta-regiones `out` (fuera), `post` (palo/travesaño) y `long_range` (arco-a-arco). Los postes y el travesaño conservan las **franjas alternadas rojo/blanco** del diseño original — es código visual del handball real.

## Design tokens

Todos en `src/styles/globals.css` como variables HSL. Tailwind los consume como `bg-surface`, `text-fg`, `bg-goal`, `bg-save`, `bg-danger`, etc.

| Token | Uso |
| --- | --- |
| `--bg`          | Fondo de página `#0A0F1C` |
| `--surface`     | Cards `#131B2E` |
| `--surface-2`   | Elevadas `#1C2742` |
| `--primary`     | Azul brand `#3B82F6` |
| `--goal`        | Gol `#10B981` |
| `--save`        | Atajada `#60A5FA` |
| `--danger`      | Error/roja `#EF4444` |
| `--warning`     | Amarilla/sanción `#F59E0B` |
| `--exclusion`   | Exclusión 2' `#F97316` |

## Roadmap

- **M2** — Live Match: score, cronómetro, módulos de arco → cancha, botones Fuera/Palo/**Arco-a-arco**, selector de tirador y arquero, modos quick/full.
- **M3** — Match Analysis: heatmap bilateral, ranking de goleadores, mapa del arquero por cuadrante, tiros por zona.
- **M4** — Teams & Players: CRUD completo.
- **M5** — Evolution: evolución del marcador durante el partido + evolución entre partidos.

---

**28/28 tests passing · typecheck limpio · build 91kB gzipped**
