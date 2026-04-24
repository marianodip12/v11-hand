import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface MatchAnalysisLayoutProps {
  // Left panel: filtros + summary tiles
  filterPanel: ReactNode;
  // Center: arco + cancha heatmaps
  visualizations: ReactNode;
  // Right panel: jugadores + events
  details: ReactNode;
}

/**
 * Responsive layout for match analysis:
 *
 * Mobile: vertical stack (all sections full width)
 * Tablet (768px+): 2 columns
 *   Left (60%): filterPanel + visualizations
 *   Right (40%): details
 * Desktop (1024px+): 3 columns
 *   Left (30%): filterPanel
 *   Center (40%): visualizations
 *   Right (30%): details (scrollable)
 */
export const MatchAnalysisLayout = ({
  filterPanel,
  visualizations,
  details,
}: MatchAnalysisLayoutProps) => {
  return (
    <div className={cn(
      // Mobile: stack
      'space-y-3 pb-4',
      // Tablet: 2-col
      'md:space-y-0 md:grid md:grid-cols-[1fr_320px] md:gap-3',
      // Desktop: 3-col with scrollable right panel
      'lg:grid-cols-[240px_1fr_320px] lg:gap-3 lg:h-[calc(100vh-100px)] lg:overflow-hidden',
    )}>
      {/* COLUMN 1: Filter panel (left) */}
      <div className={cn(
        'space-y-3',
        'md:col-span-1',
        'lg:overflow-y-auto lg:pr-2',
      )}>
        {filterPanel}
      </div>

      {/* COLUMN 2: Visualizations (center, full width on mobile/tablet left) */}
      <div className={cn(
        'space-y-3 md:col-span-1',
        'lg:col-span-1 lg:overflow-y-auto lg:pr-2',
      )}>
        {visualizations}
      </div>

      {/* COLUMN 3: Details panel (right, scrollable on desktop) */}
      <div className={cn(
        'space-y-3 md:col-span-1',
        'lg:col-span-1 lg:overflow-y-auto lg:pr-2',
      )}>
        {details}
      </div>
    </div>
  );
};
