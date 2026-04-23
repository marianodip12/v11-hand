import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-md text-sm font-medium select-none',
    'transition-colors duration-fast',
    'disabled:pointer-events-none disabled:opacity-50',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
    'active:scale-[0.98]',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-fg hover:bg-primary/90',
        secondary:
          'bg-surface-2 text-fg hover:bg-surface-2/80 border border-border',
        outline:
          'border border-border bg-transparent text-fg hover:bg-surface-2',
        ghost:
          'bg-transparent text-fg hover:bg-surface-2',
        danger:
          'bg-danger text-white hover:bg-danger/90',
        success:
          'bg-goal text-white hover:bg-goal/90',
      },
      size: {
        sm: 'h-9 px-3 text-xs',
        md: 'h-11 px-4',        // 44px touch target
        lg: 'h-12 px-6 text-base',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
