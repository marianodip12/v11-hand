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
 * ORIENTATION FIX: The goal is shown from the ATTACKER's perspective
 * (i.e., mirrored from the goalkeeper's left/right).
 * tl = top-left as seen by attacker → col 0 (left side of screen)
 * tr = top-right as seen by attacker → col 2 (right side of screen)
 * This matches how the shooter sees the goal.
 *
 * Additionally: center (mc) shows a secondary small counter below it,
 * and a penalty (7m) badge is shown below the center area.
 */

const COL_X = [6, 109, 212] as const;
const COL_W = 102;
const ROW_Y = [9, 55, 101] as const;
const ROW_H = 45;

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
  /** Per-type counts for colored overlays */
  countsByType?: Record<string, Partial<Record<GoalQuadrantId, number>>>;
  /** Color map for each shot type key */
  shotColors?: Record<string, string>;
  /** Which single type is active (to show that type's color) */
  activeType?: string | null;
  className?: string;
}

const GoalGridComponent = ({
  selected = null,
  onSelect,
  counts = {},
  countsByType,
  shotColors,
  activeType,
  className,
}: GoalGridProps) => {
  const maxCount = useMemo(
    () => Math.max(0, ...Object.values(counts).filter((v): v is number => typeof v === 'number')),
    [counts],
  );

  const toggle = (id: GoalZoneId) => onSelect(selected === id ? null : id);

  // Determine fill color for a quadrant
  // If countsByType is provided and no single type active → show dominant type color
  // If activeType is set → use that type's color intensity
  const quadrantFill = (id: GoalQuadrantId): string => {
    if (selected === id) return 'rgba(200,168,42,0.70)';

    if (countsByType && shotColors) {
      const v = counts[id] ?? 0;
      if (v === 0) return 'rgba(255,255,255,0.04)';

      if (activeType && shotColors[activeType]) {
        const typeCount = countsByType[activeType]?.[id] ?? 0;
        if (typeCount === 0) return 'rgba(255,255,255,0.04)';
        const allMax = Math.max(1, ...Object.values(countsByType[activeType] ?? {}).filter((x): x is number => typeof x === 'number'));
        const t = 0.15 + (typeCount / allMax) * 0.55;
        // Parse hex color to rgba
        const hex = shotColors[activeType];
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
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
      if (dominantCount === 0) return 'rgba(255,255,255,0.04)';
      const hex = shotColors[dominant] ?? '#ef4444';
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const t = 0.15 + (v / maxCount) * 0.50;
      return `rgba(${r},${g},${b},${t.toFixed(3)})`;
    }

    // Fallback: original red heatmap
    const v = counts[id] ?? 0;
    if (v > 0 && maxCount > 0) {
      const t = 0.12 + (v / maxCount) * 0.55;
      return `rgba(239,100,97,${t.toFixed(3)})`;
    }
    return 'rgba(255,255,255,0.04)';
  };

  // Build colored mini-bars for a quadrant showing breakdown
  const renderCountBadges = (id: GoalQuadrantId, x: number, y: number) => {
    if (!countsByType || !shotColors) return null;
    const total = counts[id] ?? 0;
    if (total === 0) return null;

    // Collect types with counts
    const entries = Object.entries(countsByType)
      .map(([tk, qmap]) => ({ tk, count: qmap?.[id] ?? 0 }))
      .filter((e) => e.count > 0);

    if (entries.length === 0) return null;

    const cx = x + COL_W / 2;
    const cy = y + ROW_H / 2;

    // If only one active type or filtering — show single count
    if (activeType || entries.length === 1) {
      const count = activeType ? (countsByType[activeType]?.[id] ?? 0) : entries[0].count;
      if (count === 0) return null;
      return (
        <text x={cx} y={cy + 5} textAnchor="middle" fill="#fff"
          fontSize="14" fontWeight="700" style={{ pointerEvents: 'none' }}>
          {count}
        </text>
      );
    }

    // Multi-type: show stacked mini badges
    const badgeW = 18;
    const badgeH = 10;
    const gap = 1;
    const totalW = entries.length * (badgeW + gap) - gap;
    const startX = cx - totalW / 2;

    return (
      <g style={{ pointerEvents: 'none' }}>
        {entries.map((e, i) => {
          const hex = shotColors[e.tk] ?? '#888';
          const bx = startX + i * (badgeW + gap);
          const by = cy - badgeH / 2 - 2;
          return (
            <g key={e.tk}>
              <rect x={bx} y={by} width={badgeW} height={badgeH} rx={2}
                fill={hex} opacity={0.85} />
              <text x={bx + badgeW / 2} y={by + badgeH - 2}
                textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700">
                {e.count}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  // Penalty zone count (7m zone count from periodEvents — passed via counts)
  // We show it below mc (middle center)
  // The center-behind counter is mc zone
  const mcCount = counts['mc' as GoalQuadrantId] ?? 0;

  return (
    <div className={cn('relative w-full select-none', className)}>
      <svg
        viewBox="0 0 320 165"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', display: 'block', touchAction: 'manipulation' }}
        role="img"
        aria-label="Arco de handball — seleccionar cuadrante"
      >
        {/* Click area for OUT */}
        <rect x="0" y="0" width="320" height="148"
          fill={selected === 'out' ? 'rgba(100,100,100,0.30)' : 'rgba(0,0,0,0)'}
          style={{ cursor: 'pointer' }} onClick={() => toggle('out')} />

        {/* Label FUERA */}
        <text x="160" y="6" textAnchor="middle"
          fill={selected === 'out' ? 'rgba(255,255,255,0.80)' : 'rgba(255,255,255,0.18)'}
          fontSize="5.5" fontWeight="700" style={{ pointerEvents: 'none' }}>
          {selected === 'out' ? '✕ FUERA' : 'FUERA'}
        </text>

        {/* Goal interior */}
        <rect x="6" y="8" width="308" height="140" fill="#0d2240" />

        {/* 9 quadrants */}
        {GOAL_QUADRANT_ORDER.map((id) => {
          const { row, col, arrow } = GOAL_QUADRANTS[id];
          const x = COL_X[2 - col]; // Mirror: attacker perspective (left on screen = attacker left)
          const y = ROW_Y[row];
          const count = counts[id] ?? 0;
          const sel = selected === id;

          return (
            <g key={id} onClick={() => toggle(id)} style={{ cursor: 'pointer' }}>
              <rect x={x} y={y} width={COL_W} height={ROW_H} rx={2}
                fill={quadrantFill(id)}
                stroke={sel ? '#c8a82a' : 'rgba(255,255,255,0.15)'}
                strokeWidth={sel ? 2 : 1} />
              {count === 0 && !sel && (
                <text x={x + COL_W / 2} y={y + ROW_H / 2 + 4} textAnchor="middle"
                  fill="rgba(255,255,255,0.22)" fontSize="14" style={{ pointerEvents: 'none' }}>
                  {arrow}
                </text>
              )}
              {count > 0 && renderCountBadges(id, x, y)}
            </g>
          );
        })}

        {/* Grid dividers */}
        <line x1="108" y1="8"  x2="108" y2="146" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" pointerEvents="none" />
        <line x1="211" y1="8"  x2="211" y2="146" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" pointerEvents="none" />
        <line x1="6"   y1="54" x2="314" y2="54"  stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" pointerEvents="none" />
        <line x1="6"   y1="100" x2="314" y2="100" stroke="rgba(255,255,255,0.30)" strokeWidth="1.5" pointerEvents="none" />

        {/* Posts */}
        {STRIPES_POST.map((s, i) => (
          <rect key={`lp${i}`} x={1}   y={s.y} width={6} height={5} fill={s.fill} />
        ))}
        {STRIPES_POST.map((s, i) => (
          <rect key={`rp${i}`} x={313} y={s.y} width={6} height={5} fill={s.fill} />
        ))}
        {STRIPES_CROSSBAR.map((s, i) => (
          <rect key={`cb${i}`} x={s.x} y={1} width={6} height={7} fill={s.fill} />
        ))}
        {/* Solid outlines */}
        <line x1="0"   y1="8"   x2="320" y2="8"   stroke="#ef4444" strokeWidth="5" pointerEvents="none" />
        <line x1="5"   y1="8"   x2="5"   y2="148" stroke="#ef4444" strokeWidth="5" pointerEvents="none" />
        <line x1="315" y1="8"   x2="315" y2="148" stroke="#ef4444" strokeWidth="5" pointerEvents="none" />

        {/* ── Extra info row below goal ── */}
        {/* Orientation labels */}
        <text x="20" y="160" textAnchor="middle" fill="rgba(255,255,255,0.30)" fontSize="7" style={{ pointerEvents: 'none' }}>Izq. atacante</text>
        <text x="300" y="160" textAnchor="middle" fill="rgba(255,255,255,0.30)" fontSize="7" style={{ pointerEvents: 'none' }}>Der. atacante</text>

        {/* mc (centro) count badge — shown below center, smaller */}
        {mcCount > 0 && (
          <g style={{ pointerEvents: 'none' }}>
            <rect x="150" y="150" width="20" height="12" rx="3" fill="rgba(255,255,255,0.12)" />
            <text x="160" y="159" textAnchor="middle" fill="rgba(255,255,255,0.55)" fontSize="8" fontWeight="600">
              {mcCount}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

export const GoalGrid = memo(GoalGridComponent);
