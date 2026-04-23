import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const Spinner = ({ className }: { className?: string }) => (
  <svg
    className={cn('animate-spin h-5 w-5 text-muted-fg', className)}
    viewBox="0 0 24 24"
    fill="none"
    aria-label="Cargando"
  >
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
    <path
      d="M12 2a10 10 0 0 1 10 10"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

export const LoadingScreen = ({ label = 'Cargando…' }: { label?: string }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted-fg">
    <Spinner className="h-8 w-8" />
    <span className="text-sm">{label}</span>
  </div>
);

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center text-center py-16 px-6',
      className,
    )}
  >
    {icon && (
      <div className="w-14 h-14 rounded-full bg-surface-2 border border-border flex items-center justify-center text-muted-fg mb-4">
        {icon}
      </div>
    )}
    <h3 className="text-base font-medium text-fg">{title}</h3>
    {description && (
      <p className="text-sm text-muted-fg mt-1.5 max-w-xs">{description}</p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);
