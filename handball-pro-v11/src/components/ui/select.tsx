import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'flex h-11 w-full rounded-md border border-border bg-surface-2 pl-3 pr-9 py-2',
          'text-sm text-fg appearance-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:border-primary/60',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors duration-fast',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-fg pointer-events-none"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  ),
);
Select.displayName = 'Select';
