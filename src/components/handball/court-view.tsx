import { memo, useMemo } from 'react';
import type { CourtZoneId } from '@/domain/types';
import type { HeatCounts } from '@/domain/stats';
import { cn } from '@/lib/cn';

/**
 * CourtView — SVG handball half-court with 9 selectable zones.
 *
 * ViewBox: 360 × 300.
 *
 * Zones (geometry corrected 2026-04-22):
 *   extreme_left   — lateral strip, 0≤x<65, 0≤y≤117.
 *   lateral_left   — area RING between 6m arc and 9m arc, left.
 *   center_above   — area RING between 6m arc and 9m arc, center.
 *   lateral_right  — area RING between 6m arc and 9m arc, right.
 *   extreme_right  — lateral strip, 295<x≤360, 0≤y≤117.
 *   7m             — badge at center, inside the "center_above" ring
 *                    (can be selected either by the badge or by the CE zone).
 *   near_left      — BELOW the 9m dashed arc, left.
 *   near_center    — pivot, BELOW the 9m dashed arc.
 *   near_right     — BELOW the 9m dashed arc, right.
 *
 * Arc curve math (matches original CourtView.jsx):
 *   6m arc (solid):  M 0 0   Q 180 210 360 0
 *   9m arc (dashed): M 0 65  Q 180 290 360 65
 *
 * Zone colors live in theme (var(--court-*)).
 */

// Clickable regions, expressed as SVG <path d="...">.
// Using paths (not rects + clipPaths) because it is simpler and the final
// hit-area matches exactly what you see.
//
// Anchor points on the 6m arc (solid):
//   x=65  → y≈132   (used by extreme_left / extreme_right corner)
//   x=148 → y≈174   (inner edge of CE ring at 6m)
//   x=212 → y≈174
//   x=295 → y≈132
// Anchor points on the 9m arc (dashed):
//   x=65  → y≈65
//   x=148 → y≈100   (inner edge of CE ring at 9m — chosen so LI/CE/LD are
//                    the "anillo" visually between the two arcs)
//   x=212 → y≈100
//   x=295 → y≈65

const PATH: Record<CourtZoneId, string> = {
  // Extremos: strip lateral desde el borde hasta el arco de 6m.
  extreme_left:
    'M 0 0 L 65 0 L 65 132 Q 30 110 0 65 Z',
  extreme_right:
    'M 360 0 L 295 0 L 295 132 Q 330 110 360 65 Z',

  // Ring entre arcos: LI, CE, LD.
  // Borde superior = arco 9m (dashed). Borde inferior = arco 6m (solid).
  // Límites verticales = x=65, 148, 212, 295.
  lateral_left:
    'M 65 65 Q 106 84 148 101 L 148 174 Q 106 158 65 132 Z',
  center_above:
    'M 148 101 L 212 101 L 212 174 L 148 174 Z',
  lateral_right:
    'M 212 101 Q 254 84 295 65 L 295 132 Q 254 158 212 174 Z',

  // Debajo del 9m.
  near_left:
    'M 65 132 Q 106 158 148 174 L 148 300 L 65 300 Z',
  near_center:
    'M 148 174 L 212 174 L 212 300 L 148 300 Z',
  near_right:
    'M 212 174 Q 254 158 295 132 L 295 300 L 212 300 Z',

  // 7m as a badge (rect with rx). Coordinates match the visual badge.
  '7m': 'M 148 125 L 212 125 Q 224 125 224 137 Q 224 149 212 149 L 148 149 Q 136 149 136 137 Q 136 125 148 125 Z',
};

// Where heatmap numbers are drawn (center of each zone).
const LABEL_POS: Record<Exclude<CourtZoneId, '7m'>, { x: number; y: number }> = {
  extreme_left:  { x: 32,  y: 85 },
  lateral_left:  { x: 106, y: 135 },
  center_above:  { x: 180, y: 140 },
  lateral_right: { x: 254, y: 135 },
  extreme_right: { x: 328, y: 85 },
  near_left:     { x: 106, y: 225 },
  near_center:   { x: 180, y: 245 },
  near_right:    { x: 254, y: 225 },
};

export interface CourtViewProps {
  selectedZone?: CourtZoneId | null;
  onZoneSelect: (zone: CourtZoneId | null) => void;
  heatmap?: HeatCounts;
  className?: string;
}

const CourtViewComponent = ({
  selectedZone = null,
  onZoneSelect,
  heatmap = {},
  className,
}: CourtViewProps) => {
  const maxHeat = useMemo(
    () =>
      Math.max(
        0,
        ...Object.values(heatmap).filter(
          (v): v is number => typeof v === 'number',
        ),
      ),
    [heatmap],
  );

  const click = (id: CourtZoneId) =>
    onZoneSelect(selectedZone === id ? null : id);

  const fillFor = (id: CourtZoneId): string => {
    if (selectedZone === id) return 'var(--court-selected)';
    const v = heatmap[id] ?? 0;
    if (v > 0 && maxHeat > 0) {
      const t = 0.18 + (v / maxHeat) * 0.5;
      return `color-mix(in srgb, var(--court-heat) ${(t * 100).toFixed(0)}%, transparent)`;
    }
    return 'transparent';
  };

  const isSelected = (id: CourtZoneId) => selectedZone === id;

  return (
    <div
      className={cn(
        'relative w-full select-none rounded-lg overflow-hidden',
        'bg-court-bg',
        className,
      )}
      style={
        {
          // Expose court tokens as CSS vars so fillFor() can reference them.
          ['--court-bg' as string]: '#0b1a2e',
          ['--court-area' as string]: '#1a3d7a',
          ['--court-line' as string]: '#ffffff',
          ['--court-selected' as string]: 'rgba(200,168,42,0.75)',
          ['--court-heat' as string]: '#ef6461',
        } as React.CSSProperties
      }
    >
      <svg
        viewBox="0 0 360 300"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'manipulation' }}
        role="img"
        aria-label="Cancha de handball — seleccionar zona de lanzamiento"
      >
        {/* Fondo */}
        <rect width="360" height="300" fill="var(--court-bg)" />

        {/* Zonas clickeables (debajo de las líneas para que las líneas queden encima) */}
        {(Object.keys(PATH) as CourtZoneId[])
          .filter((id) => id !== '7m')
          .map((id) => (
            <path
              key={id}
              d={PATH[id]}
              fill={fillFor(id)}
              stroke={isSelected(id) ? 'var(--court-selected)' : 'transparent'}
              strokeWidth={2}
              style={{ cursor: 'pointer' }}
              onClick={() => click(id)}
              aria-label={id}
            />
          ))}

        {/* Área de 6m (azul sólido) */}
        <path
          d="M 0 0 Q 180 210 360 0 L 360 -2 L 0 -2 Z"
          fill="var(--court-area)"
          opacity="0.85"
          pointerEvents="none"
        />
        {/* Arco 6m */}
        <path
          d="M 0 0 Q 180 210 360 0"
          fill="none"
          stroke="var(--court-line)"
          strokeWidth="2.5"
          pointerEvents="none"
        />
        {/* Arco 9m (punteado) */}
        <path
          d="M 0 65 Q 180 290 360 65"
          fill="none"
          stroke="var(--court-line)"
          strokeWidth="2"
          strokeDasharray="10,7"
          pointerEvents="none"
        />

        {/* Divisores verticales */}
        <line x1="65"  y1="65"  x2="65"  y2="300" stroke="var(--court-line)" strokeWidth="1.5" opacity="0.45" pointerEvents="none" />
        <line x1="148" y1="101" x2="148" y2="300" stroke="var(--court-line)" strokeWidth="1.5" opacity="0.45" pointerEvents="none" />
        <line x1="212" y1="101" x2="212" y2="300" stroke="var(--court-line)" strokeWidth="1.5" opacity="0.45" pointerEvents="none" />
        <line x1="295" y1="65"  x2="295" y2="300" stroke="var(--court-line)" strokeWidth="1.5" opacity="0.45" pointerEvents="none" />

        {/* Números del heatmap */}
        {maxHeat > 0 &&
          (Object.keys(LABEL_POS) as (keyof typeof LABEL_POS)[]).map((id) => {
            const v = heatmap[id] ?? 0;
            if (!v) return null;
            const { x, y } = LABEL_POS[id];
            return (
              <text
                key={`h-${id}`}
                x={x}
                y={y}
                textAnchor="middle"
                fill="#fff"
                fontSize="15"
                fontWeight="700"
                style={{ pointerEvents: 'none' }}
              >
                {v}
              </text>
            );
          })}

        {/* 7m badge — clickable, sits on top of the CE zone */}
        <g onClick={() => click('7m')} style={{ cursor: 'pointer' }}>
          <rect
            x="148"
            y="125"
            width="64"
            height="24"
            rx="12"
            fill={isSelected('7m') ? 'var(--court-selected)' : '#ffffff'}
          />
          <text
            x="180"
            y="141"
            textAnchor="middle"
            fill={isSelected('7m') ? '#fff' : '#0b1a2e'}
            fontSize="12"
            fontWeight="800"
            style={{ pointerEvents: 'none' }}
          >
            7m
          </text>
        </g>
      </svg>
    </div>
  );
};

export const CourtView = memo(CourtViewComponent);
