import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/ui/feedback';
import { Button } from '@/components/ui/button';

export const ComingSoonPage = ({ title }: { title: string }) => {
  const navigate = useNavigate();
  return (
    <div className="space-y-4">
      <header>
        <div className="text-[10px] font-semibold tracking-[3px] uppercase text-primary mb-1">
          Handball Pro
        </div>
        <h1 className="text-2xl font-semibold leading-tight">{title}</h1>
      </header>
      <EmptyState
        icon={<WrenchIcon />}
        title="En construcción"
        description="Esta pantalla se migra en los siguientes milestones del roadmap."
        action={
          <Button variant="secondary" onClick={() => navigate('/')}>
            Volver a partidos
          </Button>
        }
      />
    </div>
  );
};

const WrenchIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-3.5 3.5-2-2 3.5-3.5z" />
  </svg>
);
