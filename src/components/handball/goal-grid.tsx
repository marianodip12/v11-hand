import { memo, useMemo } from 'react';
import { GOAL_QUADRANTS, GOAL_QUADRANT_ORDER } from '@/domain/constants';
import type { GoalQuadrantId, GoalZoneId } from '@/domain/types';
import { cn } from '@/lib/cn';

/**
 * GoalGrid — SVG 3×3 goal with red/white striped frame.
 *
 * ViewBox: 320 × 148.
 * Posts: x=5 and x=315 | Crossbar at y=8 | Interior: x 6..314, y 8..148.
 * Grid: 3 cols × 3 rows = 9 quadrants.
 *
 * Colors kept verbatim from original GoalGrid.jsx — red/white stripes
 * are canonical handball visual language; design system does not override.
 */

const COL_X = [6, 109, 212] as const;
const COL_W = 102;
const ROW_Y = [9, 55, 101] as const;
const ROW_H = 45;

// Red + white alternating stripes helper.
const STRIPES_POST = Array.from({ length: 18 }, (_, i) => ({
  y: 8 + i * 8,
  fill: i % 2 === 0 ? '#ef4444' : '#ffffff',
}));
const STRIPES_CROSSBAR = Array.from({ length: 36 }, (_, i) => ({
  x: i * 9,
  fill: i % 2 === 0 ? '#ef4444' : '#ffffff',
}));

export type GoalCounts = Partial<Record<GoalQuadrantId, number>>;

export interface GoalGridProps {
  selected?: GoalZoneId | null;
  onSelect: (zone: GoalZoneId | null) => void;
  counts?: GoalCounts;
  className?: string;
}

const GoalGridComponent = ({
  selected = null,
  onSelect,
  counts = {},
  className,
}: GoalGridProps) => {
  const maxCount = useMemo(
    () => Math.max(0, ...Object.values(counts).filter((v): v is number => typeof v === 'number')),
    [counts],
  );

  const toggle = (id: GoalZoneId) => onSelect(selected === id ? null : id);

  const quadrantFill = (id: GoalQuadrantId): string => {
    if (selected === id) return 'rgba(200,168,42,0.70)';
    const v = counts[id] ?? 0;
    if (v > 0 && maxCount > 0) {
      const t = 0.12 + (v / maxCount) * 0.55;
      return `rgba(239,100,97,${t.toFixed(3)})`;
    }
    return 'rgba(255,255,255,0.04)';
  };

  return (
    <div className={cn('relative w-full select-none', className)}>
      <svg
        viewBox="0 0 320 148"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', display: 'block', touchAction: 'manipulation' }}
        role="img"
        aria-label="Arco de handball — seleccionar cuadrante"
      >
        {/* Click area for OUT (whole SVG background) */}
        <rect
          x="0"
          y="0"
          width="320"
          height="148"
          fill={selected === 'out' ? 'rgba(100,100,100,0.30)' : 'rgba(0,0,0,0)'}
          style={{ cursor: 'pointer' }}
          onClick={() => toggle('out')}
        />

        {/* Label FUERA */}
        <text
          x="160"
          y="6"
          textAnchor="middle"
          fill={selected === 'out' ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.18)'}
          fontSize="5.5"
          fontWeight="700"
          style={{ pointerEvents: 'none' }}
        >
          {selected === 'out' ? '✕ FUERA' : 'FUERA'}
        </text>

        {/* Goal interior */}
        <rect x="6" y="8" width="308" height="140" fill="#0d2240" />

        {/* 9 quadrants */}
        {GOAL_QUADRANT_ORDER.map((id) => {
          const { row, col, arrow } = GOAL_QUADRANTS[id];
          const x = COL_X[col];
          const y = ROW_Y[row];
          const count = counts[id] ?? 0;
          const sel = selected === id;

          return (
            <g key={id} onClick={() => toggle(id)} style={{ cursor: 'pointer' }}>
              <rect
                x={x}
                y={y}
                width={COL_W}
                height={ROW_H}
                rx={2}
                fill={quadrantFill(id)}
                stroke={sel ? '#c8a82a' : 'rgba(255,255,255,0.15)'}
                strokeWidth={sel ? 2 : 1}
              />
              {count === 0 && !sel && (
                <text
                  x={x + COL_W / 2}
                  y={y + ROW_H / 2 + 4}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.22)"
                  fontSize="14"
                  style={{ pointerEvents: 'none' }}
                >
                  {arrow}
                </text>
              )}
              {count > 0 && (
                <text
                  x={x + COL_W / 2}
                  y={y + ROW_H / 2 + 5}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="14"
                  fontWeight="700"
                  style={{ pointerEvents: 'none' }}
                >
                  {count}
                </text>
              )}
            </g>
          );
        })}

        {/* Grid dividers on top of quadrants */}
        <line x1="108" y1="8"  x2="108" y2="146" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" pointerEvents="none" />
        <line x1="211" y1="8"  x2="211" y2="146" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" pointerEvents="none" />
        <line x1="6"   y1="54" x2="314" y2="54"  stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" pointerEvents="none" />
        <line x1="6"   y1="100" x2="314" y2="100" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" pointerEvents="none" />

        {/* Posts — red/white striped */}
        {STRIPES_POST.map((s, i) => (
          <rect key={`lp${i}`} x={1}   y={s.y} width={6} height={5} fill={s.fill} />
        ))}
        {STRIPES_POST.map((s, i) => (
          <rect key={`rp${i}`} x={313} y={s.y} width={6} height={5} fill={s.fill} />
        ))}
        {/* Crossbar — red/white striped */}
        {STRIPES_CROSSBAR.map((s, i) => (
          <rect key={`cb${i}`} x={s.x} y={1} width={6} height={7} fill={s.fill} />
        ))}
        {/* Solid red frame outlines */}
        <line x1="0"   y1="8"   x2="320" y2="8"   stroke="#ef4444" strokeWidth="5" pointerEvents="none" />
        <line x1="5"   y1="8"   x2="5"   y2="148" stroke="#ef4444" strokeWidth="5" pointerEvents="none" />
        <line x1="315" y1="8"   x2="315" y2="148" stroke="#ef4444" strokeWidth="5" pointerEvents="none" />
      </svg>
    </div>
  );
};

export const GoalGrid = memo(GoalGridComponent);
