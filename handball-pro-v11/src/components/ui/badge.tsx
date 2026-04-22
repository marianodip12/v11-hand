import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-tight',
  {
    variants: {
      tone: {
        neutral:  'border-border bg-surface-2/60 text-muted-fg',
        primary:  'border-primary/40 bg-primary/15 text-primary',
        goal:     'border-goal/40 bg-goal/15 text-goal',
        save:     'border-save/40 bg-save/15 text-save',
        miss:     'border-border bg-surface-2/60 text-muted-fg',
        warning:  'border-warning/40 bg-warning/15 text-warning',
        exclusion:'border-exclusion/40 bg-exclusion/15 text-exclusion',
        danger:   'border-danger/40 bg-danger/15 text-danger',
        card:     'border-card/40 bg-card/15 text-card',
        live:     'border-danger/40 bg-danger/12 text-danger',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, tone, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ tone }), className)} {...props} />
);
