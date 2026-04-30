import { memo, useMemo } from 'react';
import type { CourtZoneId } from '@/domain/types';
import type { HeatCounts } from '@/domain/stats';
import { cn } from '@/lib/cn';

/**
 * CourtView — SVG handball half-court with 9 selectable zones.
 *
 * Extended props:
 *   countsByType  — per-type breakdown for colored overlays
 *   shotColors    — color map per type key
 *   activeType    — single active type filter (shows that color)
 *   turnoverMode  — if true, renders in orange "turnover" palette (no zone selection)
 */

type DrawableZoneId = Exclude<CourtZoneId, 'long_range'>;

const PATH: Record<DrawableZoneId, string> = {
  extreme_left:  'M 0 0 L 65 0 L 65 132 Q 30 110 0 65 Z',
  extreme_right: 'M 360 0 L 295 0 L 295 132 Q 330 110 360 65 Z',
  lateral_left:  'M 65 65 Q 106 84 148 101 L 148 174 Q 106 158 65 132 Z',
  center_above:  'M 148 101 L 212 101 L 212 174 L 148 174 Z',
  lateral_right: 'M 212 101 Q 254 84 295 65 L 295 132 Q 254 158 212 174 Z',
  near_left:     'M 65 132 Q 106 158 148 174 L 148 300 L 65 300 Z',
  near_center:   'M 148 174 L 212 174 L 212 300 L 148 300 Z',
  near_right:    'M 212 174 Q 254 158 295 132 L 295 300 L 212 300 Z',
  '7m':          'M 148 125 L 212 125 Q 224 125 224 137 Q 224 149 212 149 L 148 149 Q 136 149 136 137 Q 136 125 148 125 Z',
};

const LABEL_POS: Record<Exclude<DrawableZoneId, '7m'>, { x: number; y: number }> = {
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
  /** Per-type breakdown counts for colored overlays */
  countsByType?: Record<string, Partial<Record<CourtZoneId, number>>>;
  /** Color map per type key */
  shotColors?: Record<string, string>;
  /** If set, only this type's color is used */
  activeType?: string | null;
  /** Turnover mode: orange palette, no zone selection */
  turnoverMode?: boolean;
  className?: string;
}

const CourtViewComponent = ({
  selectedZone = null,
  onZoneSelect,
  heatmap = {},
  countsByType,
  shotColors,
  activeType,
  turnoverMode = false,
  className,
}: CourtViewProps) => {
  const maxHeat = useMemo(
    () => Math.max(0, ...Object.values(heatmap).filter((v): v is number => typeof v === 'number')),
    [heatmap],
  );

  const click = (id: CourtZoneId) => {
    if (turnoverMode) return;
    onZoneSelect(selectedZone === id ? null : id);
  };

  const hexToRgb = (hex: string): [number, number, number] => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  };

  const fillFor = (id: CourtZoneId): string => {
    if (!turnoverMode && selectedZone === id) return 'var(--court-selected)';
    const v = heatmap[id] ?? 0;
    if (v === 0) return 'transparent';

    // Turnover mode: orange
    if (turnoverMode) {
      const t = 0.18 + (v / maxHeat) * 0.55;
      return `rgba(249,115,22,${t.toFixed(3)})`;
    }

    if (countsByType && shotColors) {
      if (activeType && shotColors[activeType]) {
        const typeCount = countsByType[activeType]?.[id] ?? 0;
        if (typeCount === 0) return 'transparent';
        const allMax = Math.max(1, ...Object.values(countsByType[activeType] ?? {}).filter((x): x is number => typeof x === 'number'));
        const t = 0.18 + (typeCount / allMax) * 0.5;
        const [r, g, b] = hexToRgb(shotColors[activeType]);
        return `rgba(${r},${g},${b},${t.toFixed(3)})`;
      }

      // Multi-color: find dominant type
      const types = Object.keys(countsByType);
      let dominant = types[0];
      let dominantCount = 0;
      for (const tk of types) {
        const tc = countsByType[tk]?.[id] ?? 0;
        if (tc > dominantCount) { dominantCount = tc; dominant = tk; }
      }
      if (dominantCount === 0) return 'transparent';
      const hex = shotColors[dominant] ?? '#ef6461';
      const [r, g, b] = hexToRgb(hex);
      const t = 0.18 + (v / maxHeat) * 0.5;
      return `rgba(${r},${g},${b},${t.toFixed(3)})`;
    }

    // Original heat
    if (v > 0 && maxHeat > 0) {
      const t = 0.18 + (v / maxHeat) * 0.5;
      return `color-mix(in srgb, var(--court-heat) ${(t * 100).toFixed(0)}%, transparent)`;
    }
    return 'transparent';
  };

  const isSelected = (id: CourtZoneId) => !turnoverMode && selectedZone === id;

  // Render count labels with optional color breakdown
  const renderLabel = (id: Exclude<DrawableZoneId, '7m'>) => {
    const v = heatmap[id] ?? 0;
    if (!v) return null;
    const { x, y } = LABEL_POS[id];

    if (countsByType && shotColors && !activeType) {
      // Show colored mini badges
      const entries = Object.entries(countsByType)
        .map(([tk, zm]) => ({ tk, count: zm?.[id] ?? 0 }))
        .filter((e) => e.count > 0);

      if (entries.length === 0) return null;
      if (entries.length === 1) {
        return (
          <text key={`h-${id}`} x={x} y={y} textAnchor="middle" fill="#fff"
            fontSize="15" fontWeight="700" style={{ pointerEvents: 'none' }}>
            {entries[0].count}
          </text>
        );
      }

      const bW = 16;
      const bH = 10;
      const gap = 1;
      const totalW = entries.length * (bW + gap) - gap;
      const startX = x - totalW / 2;
      return (
        <g key={`h-${id}`} style={{ pointerEvents: 'none' }}>
          {/* Total on top */}
          <text x={x} y={y - 8} textAnchor="middle" fill="#fff" fontSize="13" fontWeight="700">{v}</text>
          {/* Mini colored bars below */}
          {entries.map((e, i) => {
            const hex = shotColors[e.tk] ?? '#888';
            const bx = startX + i * (bW + gap);
            const by = y;
            return (
              <g key={e.tk}>
                <rect x={bx} y={by} width={bW} height={bH} rx={2} fill={hex} opacity={0.9} />
                <text x={bx + bW / 2} y={by + bH - 2} textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700">
                  {e.count}
                </text>
              </g>
            );
          })}
        </g>
      );
    }

    return (
      <text key={`h-${id}`} x={x} y={y} textAnchor="middle" fill="#fff"
        fontSize="15" fontWeight="700" style={{ pointerEvents: 'none' }}>
        {v}
      </text>
    );
  };

  // 7m count from heatmap
  const seventhCount = heatmap['7m'] ?? 0;

  return (
    <div
      className={cn('relative w-full select-none rounded-lg overflow-hidden', 'bg-court-bg', className)}
      style={{
        ['--court-bg' as string]: '#0b1a2e',
        ['--court-area' as string]: '#1a3d7a',
        ['--court-line' as string]: '#ffffff',
        ['--court-selected' as string]: 'rgba(200,168,42,0.75)',
        ['--court-heat' as string]: turnoverMode ? '#f97316' : '#ef6461',
      } as React.CSSProperties}
    >
      <svg
        viewBox="0 0 360 300"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'manipulation' }}
        role="img"
        aria-label={turnoverMode ? 'Mapa de pérdidas por zona' : 'Cancha de handball — seleccionar zona'}
      >
        <rect width="360" height="300" fill="var(--court-bg)" />

        {/* Clickable zones */}
        {(Object.keys(PATH) as DrawableZoneId[])
          .filter((id) => id !== '7m')
          .map((id) => (
            <path
              key={id}
              d={PATH[id]}
              fill={fillFor(id)}
              stroke={isSelected(id) ? 'var(--court-selected)' : 'transparent'}
              strokeWidth={2}
              style={{ cursor: turnoverMode ? 'default' : 'pointer' }}
              onClick={() => click(id)}
              aria-label={id}
            />
          ))}

        {/* 6m area */}
        <path d="M 0 0 Q 180 210 360 0 L 360 -2 L 0 -2 Z" fill="var(--court-area)" opacity="0.85" pointerEvents="none" />
        <path d="M 0 0 Q 180 210 360 0" fill="none" stroke="var(--court-line)" strokeWidth="2.5" pointerEvents="none" />
        {/* 9m arc */}
        <path d="M 0 65 Q 180 290 360 65" fill="none" stroke="var(--court-line)" strokeWidth="2" strokeDasharray="10,7" pointerEvents="none" />

        {/* Vertical dividers */}
        <line x1="65"  y1="65"  x2="65"  y2="300" stroke="var(--court-line)" strokeWidth="1.5" opacity="0.45" pointerEvents="none" />
        <line x1="148" y1="101" x2="148" y2="300" stroke="var(--court-line)" strokeWidth="1.5" opacity="0.45" pointerEvents="none" />
        <line x1="212" y1="101" x2="212" y2="300" stroke="var(--court-line)" strokeWidth="1.5" opacity="0.45" pointerEvents="none" />
        <line x1="295" y1="65"  x2="295" y2="300" stroke="var(--court-line)" strokeWidth="1.5" opacity="0.45" pointerEvents="none" />

        {/* Heatmap numbers */}
        {maxHeat > 0 && (Object.keys(LABEL_POS) as (keyof typeof LABEL_POS)[]).map((id) => renderLabel(id))}

        {/* 7m badge */}
        {!turnoverMode && (
          <g onClick={() => click('7m')} style={{ cursor: 'pointer' }}>
            <rect x="148" y="125" width="64" height="24" rx="12"
              fill={isSelected('7m') ? 'var(--court-selected)' : '#ffffff'} />
            <text x="180" y="141" textAnchor="middle"
              fill={isSelected('7m') ? '#fff' : '#0b1a2e'}
              fontSize="12" fontWeight="800" style={{ pointerEvents: 'none' }}>
              7m{seventhCount > 0 ? ` (${seventhCount})` : ''}
            </text>
          </g>
        )}

        {/* Turnover mode label */}
        {turnoverMode && (
          <text x="180" y="295" textAnchor="middle" fill="rgba(249,115,22,0.6)"
            fontSize="9" fontWeight="600" style={{ pointerEvents: 'none' }}>
            📍 Pérdidas por zona
          </text>
        )}
      </svg>
    </div>
  );
};

export const CourtView = memo(CourtViewComponent);
