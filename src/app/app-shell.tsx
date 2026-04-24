import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '@/domain/constants';
import { useMatchStore } from '@/lib/store';
import { cn } from '@/lib/cn';

export const AppShell = () => {
  const location = useLocation();
  const status = useMatchStore((s) => s.status);

  return (
    <div className="min-h-screen flex bg-bg text-fg">
      {/* Sidebar nav — desktop only */}
      <nav
        className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-border lg:bg-surface
                   lg:overflow-y-auto lg:fixed lg:inset-0 lg:pb-0"
      >
        {/* Logo + title in sidebar */}
        <div className="lg:p-4 lg:border-b lg:border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-primary grid place-items-center text-xs font-semibold text-primary-fg">
              HP
            </div>
            <div>
              <div className="text-sm font-semibold">Handball Pro</div>
              <span className="text-[9px] px-1.5 py-[1px] rounded bg-primary/15 border border-primary/30 text-primary font-semibold tracking-wider">
                v11
              </span>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <div className="lg:flex-1 lg:flex lg:flex-col lg:gap-1 lg:p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'lg:flex lg:items-center lg:gap-3 lg:px-3 lg:py-2 lg:rounded-md lg:transition-colors',
                  isActive
                    ? 'lg:bg-primary/15 lg:text-primary lg:border lg:border-primary/40'
                    : 'lg:text-muted-fg lg:hover:text-fg lg:hover:bg-surface-2',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <NavIcon itemKey={item.key} active={isActive} />
                  <span className="lg:text-sm lg:font-medium">{item.label}</span>
                  {item.key === 'live' && status === 'live' && (
                    <span className="lg:ml-auto">
                      <span className="w-2 h-2 rounded-full bg-danger block" />
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* Status indicator in sidebar footer */}
        <div className="lg:border-t lg:border-border lg:p-3">
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md border text-sm',
              status === 'live'
                ? 'border-danger/40 bg-danger/10 text-danger'
                : 'border-border bg-surface-2/60 text-muted-fg',
            )}
          >
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                status === 'live' ? 'bg-danger animate-pulse-live' : 'bg-muted-fg',
              )}
            />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {status === 'live' ? 'En vivo' : 'Sin partido'}
            </span>
          </div>
        </div>
      </nav>

      {/* Main container */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Header — mobile & tablet only */}
        <header className="lg:hidden px-4 pt-3 pb-3 flex items-center justify-between border-b border-border bg-surface-2/40">
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
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs',
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
            <span className="font-semibold uppercase tracking-wider">
              {status === 'live' ? 'En vivo' : 'Sin partido'}
            </span>
          </div>
        </header>

        {/* Content */}
        <main
          key={location.pathname}
          className="flex-1 overflow-y-auto md:px-4 md:py-4 px-4 pt-4 pb-20 md:pb-6 lg:pb-6 animate-fade-in"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="w-full mx-auto lg:max-w-6xl">
            <Outlet />
          </div>
        </main>

        {/* Bottom nav — mobile & tablet only */}
        <nav
          className="lg:hidden fixed md:relative bottom-0 left-0 right-0 z-50
                     bg-bg/95 backdrop-blur border-t border-border flex
                     pb-[env(safe-area-inset-bottom,0)]
                     md:pb-0 md:flex-row md:justify-center md:gap-2 md:p-3 md:border-t"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.key}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                cn(
                  'flex-1 md:flex-none py-2.5 md:py-2 md:px-4 flex flex-col md:flex-row md:items-center md:gap-2 items-center gap-1 touch-target',
                  'transition-colors duration-fast relative',
                  isActive ? 'text-primary' : 'text-muted-fg hover:text-fg',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute md:hidden top-0 left-[20%] right-[20%] h-[2px] rounded-b bg-primary" />
                  )}
                  {isActive && (
                    <span className="hidden md:inline-block absolute md:relative left-[20%] md:left-0 right-[20%] md:right-auto h-[2px] md:h-auto md:w-[2px] md:h-4 rounded-b md:rounded-r bg-primary" />
                  )}
                  {item.key === 'live' && status === 'live' && (
                    <span className="absolute top-1.5 right-[30%] w-1.5 h-1.5 rounded-full bg-danger md:hidden" />
                  )}
                  <NavIcon itemKey={item.key} active={isActive} />
                  <span className="text-[9px] md:text-xs font-medium tracking-wider">
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
