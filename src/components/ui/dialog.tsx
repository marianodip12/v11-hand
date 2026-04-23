import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './button';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const Dialog = ({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: DialogProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    // Lock body scroll while open
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus first focusable in dialog
    const first = ref.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    first?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'dialog-title' : undefined}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div
        ref={ref}
        className={cn(
          'relative w-full sm:max-w-md bg-surface border border-border',
          'rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl',
          'max-h-[92vh] overflow-y-auto',
          'animate-slide-up',
          className,
        )}
      >
        {title && (
          <header className="mb-4">
            <h2 id="dialog-title" className="text-lg font-medium text-fg">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-muted-fg mt-1">{description}</p>
            )}
          </header>
        )}
        {children}
      </div>
    </div>
  );
};

export const DialogFooter = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <footer className={cn('flex gap-2 mt-5', className)}>{children}</footer>
);

export const DialogCloseButton = ({ onClose }: { onClose: () => void }) => (
  <Button
    variant="ghost"
    size="icon"
    onClick={onClose}
    aria-label="Cerrar"
    className="absolute top-3 right-3"
  >
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  </Button>
);
