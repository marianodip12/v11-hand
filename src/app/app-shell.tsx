import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '@/domain/constants';
import { useMatchStore } from '@/lib/store';
import { cn } from '@/lib/cn';

export const AppShell = () => {
  const location = useLocation();
  const status = useMatchStore((s) => s.status);

  return (
    <div className="min-h-screen flex flex-col items-center bg-bg text-fg">
      <div className="w-full max-w-[430px] min-h-screen flex flex-col relative">
        {/* Header */}
        <header className="px-4 pt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary grid place-items-center text-[10px] font-semibold text-primary-fg">
              HP
            </div>
            <span className="text-[13px] font-medium tracking-tight">Handball Pro</span>
            <span className="text-[9px] px-1.5 py-[1px] rounded bg-primary/15 border border-primary/30 text-primary font-semibold tracking-wider">
              v11
            </span>
          </div>
          <div
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full border',
              status === 'live'
                ? 'border-danger/40 bg-danger/10 text-danger'
                : 'border-border bg-surface-2/60 text-muted-fg',
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                status === 'live' ? 'bg-danger animate-pulse-live' : 'bg-muted-fg',
              )}
            />
            <span className="text-[9px] font-semibold uppercase tracking-wider">
              {status === 'live' ? 'En vivo' : 'Sin partido'}
            </span>
          </div>
        </header>

        {/* Content */}
        <main
          key={location.pathname}
          className="flex-1 overflow-y-auto px-4 pt-4 pb-24 animate-fade-in"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <Outlet />
        </main>

        {/* Bottom nav — fixed to the 430px column */}
        <nav
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50
                     bg-bg/95 backdrop-blur border-t border-border flex
                     pb-[env(safe-area-inset-bottom,0)]"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex-1 py-2.5 flex flex-col items-center gap-1 touch-target',
                  'transition-colors duration-fast relative',
                  isActive ? 'text-primary' : 'text-muted-fg hover:text-fg',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute top-0 left-[20%] right-[20%] h-[2px] rounded-b bg-primary" />
                  )}
                  {item.key === 'live' && status === 'live' && (
                    <span className="absolute top-1.5 right-[30%] w-1.5 h-1.5 rounded-full bg-danger" />
                  )}
                  <NavIcon itemKey={item.key} active={isActive} />
                  <span className="text-[9px] font-medium tracking-wider">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};

// Inline SVG icons per key — keeps design consistent, no emoji.
const NavIcon = ({ itemKey, active }: { itemKey: string; active: boolean }) => {
  const stroke = active ? 'currentColor' : 'currentColor';
  const sw = active ? 2 : 1.8;

  switch (itemKey) {
    case 'matches':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 2v4M16 2v4" />
        </svg>
      );
    case 'teams':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="8" r="3" />
          <circle cx="17" cy="10" r="2.5" />
          <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5M15 20c0-2 1.5-3.5 4-3.5" />
        </svg>
      );
    case 'live':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" fill={active ? 'currentColor' : 'none'} />
        </svg>
      );
    case 'stats':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
    case 'evolution':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 17l6-6 4 4 8-8M14 7h7v7" />
        </svg>
      );
    default:
      return null;
  }
};
