import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-md border border-border bg-surface-2 px-3 py-2',
        'text-sm text-fg placeholder:text-muted-fg',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:border-primary/60',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-colors duration-fast',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Label = forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-[11px] font-medium text-muted-fg uppercase tracking-wider',
        className,
      )}
      {...props}
    />
  ),
);
Label.displayName = 'Label';
