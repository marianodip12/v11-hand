import { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/**
 * Responsive grid that adapts from 1 col (mobile) → 2 cols (tablet) → 3+ cols (desktop).
 * Use with GridItem children.
 *
 * Example:
 *   <ResponsiveGrid cols={{ mobile: 1, tablet: 2, desktop: 3 }} gap="md">
 *     <GridItem>{content}</GridItem>
 *     ...
 *   </ResponsiveGrid>
 */
export const ResponsiveGrid = ({
  children,
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
  className,
}: {
  children: ReactNode;
  cols?: { mobile?: number; tablet?: number; desktop?: number };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}) => {
  const gapMap = { sm: 'gap-2', md: 'gap-3', lg: 'gap-4' };
  const mobileCol = cols.mobile ?? 1;
  const tabletCol = cols.tablet ?? 2;
  const desktopCol = cols.desktop ?? 3;

  const colClass =
    mobileCol === 1 ? 'grid-cols-1' :
    mobileCol === 2 ? 'grid-cols-2' :
    'grid-cols-3';

  const tabletColClass =
    tabletCol === 1 ? 'md:grid-cols-1' :
    tabletCol === 2 ? 'md:grid-cols-2' :
    'md:grid-cols-3';

  const desktopColClass =
    desktopCol === 1 ? 'lg:grid-cols-1' :
    desktopCol === 2 ? 'lg:grid-cols-2' :
    desktopCol === 3 ? 'lg:grid-cols-3' :
    'lg:grid-cols-4';

  return (
    <div className={cn('grid', colClass, tabletColClass, desktopColClass, gapMap[gap], className)}>
      {children}
    </div>
  );
};

export const GridItem = ({ children, span = 1 }: { children: ReactNode; span?: number }) => (
  <div className={cn(span > 1 && `col-span-${span}`)}>{children}</div>
);

/**
 * Flex row that wraps on mobile, stays row on tablet+.
 */
export const ResponsiveFlex = ({
  children,
  wrap = true,
  className,
}: {
  children: ReactNode;
  wrap?: boolean;
  className?: string;
}) => (
  <div className={cn(
    'flex flex-col md:flex-row',
    wrap && 'flex-wrap',
    'gap-3 md:gap-4',
    className,
  )}>
    {children}
  </div>
);

/**
 * Simple 2-column layout: left content (main) + right sidebar.
 * Stacks vertically on mobile, side-by-side on tablet+.
 *
 * Example:
 *   <TwoColumnLayout
 *     left={<MainContent />}
 *     right={<Sidebar />}
 *     ratio={{ tablet: '60/40', desktop: '70/30' }}
 *   />
 */
export const TwoColumnLayout = ({
  left,
  right,
  ratio = { tablet: '60/40', desktop: '70/30' },
  gapSize = 'md',
  className,
}: {
  left: ReactNode;
  right: ReactNode;
  ratio?: { tablet?: string; desktop?: string };
  gapSize?: 'sm' | 'md' | 'lg';
  className?: string;
}) => {
  const gapMap = { sm: 'gap-2', md: 'gap-3', lg: 'gap-4' };
  const tabletRatio = ratio.tablet ?? '60/40';
  const desktopRatio = ratio.desktop ?? '70/30';

  // Parse "60/40" → "3fr/2fr"
  const parseRatio = (r: string) => {
    const [l, r_] = r.split('/').map((x) => parseInt(x, 10));
    if (!l || !r_) return '1fr 1fr';
    return `${l}fr ${r_}fr`;
  };

  return (
    <div
      className={cn('grid md:gap-3 lg:gap-4', gapMap[gapSize], className)}
      style={{
        gridTemplateColumns: '1fr',
        // @ts-expect-error CSS vars ok in style
        '--tablet-cols': `${parseRatio(tabletRatio)}`,
        '--desktop-cols': `${parseRatio(desktopRatio)}`,
      }}
    >
      <style>{`
        @media (min-width: 768px) {
          [data-two-col] { grid-template-columns: var(--tablet-cols); }
        }
        @media (min-width: 1024px) {
          [data-two-col] { grid-template-columns: var(--desktop-cols); }
        }
      `}</style>
      <div data-two-col className="grid" style={{ gridTemplateColumns: parseRatio(desktopRatio) }}>
        <div className="md:col-span-1">{left}</div>
        <div className="md:col-span-1">{right}</div>
      </div>
    </div>
  );
};

/**
 * Max-width container for desktop, full-width on mobile.
 * Useful to prevent content from stretching too wide on ultrawide screens.
 */
export const MaxWidthContainer = ({
  children,
  maxW = 'max-w-7xl',
  className,
}: {
  children: ReactNode;
  maxW?: string;
  className?: string;
}) => (
  <div className={cn(maxW, 'mx-auto w-full px-4 md:px-6 lg:px-8', className)}>
    {children}
  </div>
);

/**
 * Responsive padding/margin helper.
 * Example: <ResponsivePad top="sm" bottom="lg" /> → responsive top/bottom padding
 */
export const ResponsivePad = ({
  children,
  top, bottom, left, right, all,
  className,
}: {
  children?: ReactNode;
  top?: 'sm' | 'md' | 'lg' | 'xl';
  bottom?: 'sm' | 'md' | 'lg' | 'xl';
  left?: 'sm' | 'md' | 'lg' | 'xl';
  right?: 'sm' | 'md' | 'lg' | 'xl';
  all?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) => {
  const padMap = {
    sm: { p: 'p-2 md:p-3', pt: 'pt-2 md:pt-3', pb: 'pb-2 md:pb-3', pl: 'pl-2 md:pl-3', pr: 'pr-2 md:pr-3' },
    md: { p: 'p-3 md:p-4', pt: 'pt-3 md:pt-4', pb: 'pb-3 md:pb-4', pl: 'pl-3 md:pl-4', pr: 'pr-3 md:pr-4' },
    lg: { p: 'p-4 md:p-6', pt: 'pt-4 md:pt-6', pb: 'pb-4 md:pb-6', pl: 'pl-4 md:pl-6', pr: 'pr-4 md:pr-6' },
    xl: { p: 'p-6 md:p-8', pt: 'pt-6 md:pt-8', pb: 'pb-6 md:pb-8', pl: 'pl-6 md:pl-8', pr: 'pr-6 md:pr-8' },
  };
  const size = all ?? 'md';
  const pad = padMap[size];
  return (
    <div className={cn(
      all && pad.p,
      top && pad.pt,
      bottom && pad.pb,
      left && pad.pl,
      right && pad.pr,
      className,
    )}>
      {children}
    </div>
  );
};

/**
 * Stack: flex column with responsive gap.
 * Simple version of ResponsiveFlex for vertical layouts.
 */
export const Stack = ({
  children,
  gap = 'md',
  className,
}: {
  children: ReactNode;
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) => {
  const gapMap = {
    sm: 'space-y-2 md:space-y-2.5',
    md: 'space-y-3 md:space-y-4',
    lg: 'space-y-4 md:space-y-6',
    xl: 'space-y-6 md:space-y-8',
  };
  return <div className={cn('flex flex-col', gapMap[gap], className)}>{children}</div>;
};
